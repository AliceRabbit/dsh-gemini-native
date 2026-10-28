import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { updateVolatile } from '@deepseek-ai/cosmokit';
import { LlmAdapter, LlmRuntime, resolveRetryPolicy } from '@deepseek-ai/dsh-llm';
import { Config, apply } from '../index.js';
import { GeminiAdapter, PROVIDER } from '../gemini.js';
import { DEFAULT_QUOTA_RETRY, resolveQuotaRetryPolicy } from '../quota-retry.js';

// Optional integration against the actual installed executor, never a reimplementation.
// Set DSH_RETRY_TEST_MODULE to a module URL or a path relative to this test file.
const nativeRetry = process.env.DSH_RETRY_TEST_MODULE
  ? await import(process.env.DSH_RETRY_TEST_MODULE) : undefined;

function nativeHarness(policy) {
  const events = [];
  let projection, recover, state, dispose;
  const ctx = {
    sessionProjections: {
      register(value) { projection = value; state = value.init(); },
      stateOf() { return state; },
    },
    on(name, listener) { assert.equal(name, 'agent/request-error'); recover = listener; return () => {}; },
    effect(setup) { dispose = setup(); },
    logger: { warn() {} },
  };
  nativeRetry.apply(ctx, {}, { random: () => 0.5 });
  const session = { append(type, data) { const event = { type, data }; events.push(event); state = projection.apply(state, event); } };
  const control = new AbortController();
  const payload = { agent: { session }, turn: 'test-turn', step: 'test-step', provider: PROVIDER,
    retryPolicy: policy, signal: control.signal, failure: { code: 'QUOTA', message: 'Test quota', status: 429 } };
  return { events, session, control, dispose, run: (overrides = {}) => recover({ ...payload, ...overrides }, () => ({ kind: 'downstream' })) };
}

const integration = { skip: !nativeRetry };
test('official executor logs five finite retries with shared budget and exponential backoff', integration, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = nativeHarness(resolveQuotaRetryPolicy());
  try {
    for (const [index, delay] of [5000, 10000, 20000, 30000, 30000].entries()) {
      const pending = h.run(index === 1 ? { failure: { code: 'TRANSPORT', message: 'test' } } : {});
      assert.equal(h.events.at(-1).type, 'llm/retry');
      assert.equal(h.events.at(-1).data.delayMs, delay);
      assert.equal(h.events.at(-1).data.retry, index + 1);
      t.mock.timers.tick(delay);
      assert.deepEqual(await pending, { kind: 'retry' });
      assert.equal(h.events.at(-1).type, 'llm/retry-started');
    }
    assert.deepEqual(await h.run(), { kind: 'downstream' });
    assert.equal(h.events.length, 10);
    assert.equal(new Set(h.events.map(event => event.data.retryId)).size, 1);
    h.session.append('step/start', {});
    const reset = h.run();
    assert.equal(h.events.at(-1).data.retry, 1);
    t.mock.timers.tick(5000);
    assert.deepEqual(await reset, { kind: 'retry' });
  } finally { await h.dispose(); }
});

test('official backoff is cancellable and never starts an aborted retry', integration, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = nativeHarness(resolveQuotaRetryPolicy());
  try {
    const pending = h.run();
    h.control.abort();
    assert.equal(await pending, undefined);
    t.mock.timers.tick(300000);
    assert.deepEqual(h.events.map(event => event.type), ['llm/retry']);
  } finally { await h.dispose(); }
});

test('official executor delegates disabled QUOTA, excluded errors, and oversized Retry-After', integration, async () => {
  const off = nativeHarness(resolveQuotaRetryPolicy({ enabled: false }));
  const on = nativeHarness(resolveQuotaRetryPolicy());
  try {
    assert.deepEqual(await off.run(), { kind: 'downstream' });
    for (const code of ['AUTH', 'ACCOUNT_QUOTA', 'ABORTED', 'INVALID_REQUEST']) {
      assert.deepEqual(await on.run({ failure: { code, message: 'test' } }), { kind: 'downstream' });
    }
    assert.deepEqual(await on.run({ failure: { code: 'QUOTA', message: 'test', providerRetryAfterMs: 30001 } }), { kind: 'downstream' });
    assert.equal(off.events.length + on.events.length, 0);
  } finally { await off.dispose(); await on.dispose(); }
});

function options(raw = {}) {
  return Object.fromEntries(Object.entries(Config(raw)).map(([key, value]) => [key, value.get()]));
}

test('existing configurations enable bounded QUOTA retries without losing other fields', () => {
  const raw = { baseURL: 'https://example.invalid', apiKeyEnv: 'EXISTING_KEY', models: [{ id: 'gemini-4-argon', thinkingBudgets: {} }], headers: { 'x-custom': 'kept' } };
  const config = options(raw);
  for (const key of Object.keys(raw)) assert.deepEqual(config[key], raw[key]);
  assert.deepEqual(config.quotaRetry, DEFAULT_QUOTA_RETRY);
  const policy = resolveQuotaRetryPolicy(config.quotaRetry);
  const original = resolveRetryPolicy(undefined, 'test');
  assert.deepEqual(policy.retryableCodes, [...original.retryableCodes, 'QUOTA']);
  assert.deepEqual({ ...policy, retryableCodes: undefined }, {
    mode: 'normal', maxRetries: 5, initialDelayMs: 5000, maxDelayMs: 30000, jitterRatio: 0.1, retryableCodes: undefined,
  });
  assert.ok(Object.isFrozen(policy));
  assert.ok(Object.isFrozen(policy.retryableCodes));
  for (const excluded of ['ACCOUNT_QUOTA', 'AUTH', 'INVALID_REQUEST', 'ABORTED', 'MISSING_CREDENTIAL']) {
    assert.ok(!policy.retryableCodes.includes(excluded));
  }
});

test('disabling restores the complete Harness default, not just its code whitelist', () => {
  assert.deepEqual(resolveQuotaRetryPolicy({ enabled: false, maxRetries: 20, initialDelayMs: 100000, maxDelayMs: 300000 }), resolveRetryPolicy(undefined, 'test'));
});

test('custom limits remain finite and do not mutate caller inputs', () => {
  const input = { enabled: true, maxRetries: 2, initialDelayMs: 1234, maxDelayMs: 5678 };
  const before = structuredClone(input);
  const policy = resolveQuotaRetryPolicy(input);
  assert.equal(policy.maxRetries, 2);
  assert.equal(policy.initialDelayMs, 1234);
  assert.equal(policy.maxDelayMs, 5678);
  assert.deepEqual(input, before);
});

test('Host schema rejects invalid counts, delays and inverted backoff before activation', () => {
  for (const quotaRetry of [
    { maxRetries: 0 }, { maxRetries: 21 }, { maxRetries: 1.5 }, { maxRetries: Infinity },
    { initialDelayMs: 0 }, { initialDelayMs: 999 }, { initialDelayMs: 1000.5 },
    { maxDelayMs: 300001 }, { maxDelayMs: NaN }, { enabled: 'true' },
    { initialDelayMs: 5000, maxDelayMs: 1000 },
  ]) assert.throws(() => Config({ quotaRetry }), JSON.stringify(quotaRetry));
});

test('real LLM registry captures policy changes atomically and isolates other routes', async () => {
  const ctx = new Context();
  const llm = new LlmRuntime(ctx);
  const config = Config({});
  try {
    const other = new LlmAdapter();
    other.providerInfo = id => ({ id, name: 'Unrelated' });
    llm.registerAdapter(['unrelated'], other);
    const otherBefore = llm.providerRetryPolicy('unrelated');
    apply(ctx, config);
    const before = llm.providerRetryPolicy(PROVIDER);
    assert.ok(before.retryableCodes.includes('QUOTA'));
    updateVolatile(config.quotaRetry, Config({ quotaRetry: { maxRetries: 3 } }).quotaRetry);
    assert.strictEqual(llm.providerRetryPolicy(PROVIDER), before, 'registry policy is captured, not dynamic');
    ctx.emit('loader/volatile-update', [['quotaRetry']]);
    assert.equal(llm.providerRetryPolicy(PROVIDER).maxRetries, 3);
    assert.strictEqual(llm.providerRetryPolicy('unrelated'), otherBefore);
    assert.equal(before.maxRetries, 5, 'old captured policy remains unchanged');
    const changed = llm.providerRetryPolicy(PROVIDER);
    updateVolatile(config.baseURL, Config({ baseURL: 'https://another.invalid' }).baseURL);
    ctx.emit('loader/volatile-update', [['baseURL']]);
    assert.strictEqual(llm.providerRetryPolicy(PROVIDER), changed, 'endpoint-only changes do not reset route policy');
    updateVolatile(config.quotaRetry, Config({ quotaRetry: { enabled: false } }).quotaRetry);
    ctx.emit('loader/volatile-update', [['quotaRetry']]);
    assert.deepEqual(llm.providerRetryPolicy(PROVIDER), resolveRetryPolicy(undefined, 'test'));
    assert.strictEqual(llm.providerRetryPolicy('unrelated'), otherBefore);
  } finally { await ctx.fiber.dispose(); }
});

test('adapter declares policy only for its own provider route', () => {
  const adapter = new GeminiAdapter({ options: () => options(), resolveApiKey: async () => 'test-key' });
  assert.equal(adapter.providerRetryPolicy('unrelated'), undefined);
  assert.ok(adapter.providerRetryPolicy(PROVIDER).retryableCodes.includes('QUOTA'));
});

for (const [status, message, expected] of [
  [429, 'You exceeded your current quota, please check your plan and billing details.', 'QUOTA'],
  [429, 'Too many requests', 'RATE_LIMIT'],
  [401, 'Unauthorized', 'AUTH'],
  [500, 'Internal server error', 'SERVER'],
]) test(`SDK ${status} / ${expected} is one attempt, then classified for native recovery`, async () => {
  let calls = 0;
  const adapter = new GeminiAdapter({
    options: () => options(), resolveApiKey: async () => 'fake-test-key',
    fetch: async () => {
      calls++;
      return new Response(JSON.stringify({ error: { code: status, message, status: status === 429 ? 'RESOURCE_EXHAUSTED' : 'UNKNOWN' } }), {
        status, headers: { 'content-type': 'application/json' },
      });
    },
  });
  await assert.rejects(async () => {
    for await (const _ of adapter.stream({ provider: PROVIDER, model: 'gemini-4-argon', messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }] })) {}
  }, error => error.code === expected && error.failure.status === status);
  assert.equal(calls, 1, 'SDK must not multiply the native retry budget');
});
