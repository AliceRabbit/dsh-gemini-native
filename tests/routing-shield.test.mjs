import test from 'node:test';
import assert from 'node:assert/strict';
import { Config } from '../index.js';
import {
  applyRoutingShield, createShieldPayload, REMINDER_RULE, ROUTING_SHIELD_MODES, shieldSeed, stripLegacyShield,
} from '../routing-shield.js';
import { toRequest, DEFAULT_MODELS, PROVIDER } from '../gemini.js';

const text = value => ({ type: 'text', text: value });
const system = value => ({ role: 'system', source: { kind: 'system-prompt' }, content: [text(value)] });
const user = (value, id) => ({ role: 'user', ...(id ? { id } : {}), content: [text(value)] });
const request = (messages, routingShield = 'off', extra = {}) => toRequest(
  { provider: PROVIDER, model: DEFAULT_MODELS[0].id, sessionId: 'sess-1', messages, ...extra },
  { models: DEFAULT_MODELS, routingShield },
);
const MD_REF_RE = /^(?:\[\/\/\]: (?:#|<>)|\[#\]: #|\[::\]: #) (?:\([A-Za-z0-9.-]+\)|"[A-Za-z0-9.-]+")$/gm;

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('Config validates all five routingShield modes and defaults to off', () => {
  assert.equal(Config({}).routingShield.get(), 'off');
  for (const mode of ROUTING_SHIELD_MODES) {
    assert.equal(Config({ routingShield: mode }).routingShield.get(), mode);
  }
  assert.throws(() => Config({ routingShield: 'invalid' }));
});

test('minimal mode joins opening identity sentences without touching contents or trailing-newline sections', async () => {
  const prompt = 'You are an AI agent powered by DeepSeek Harness.\n\nYou are a coding agent powered by the gemini-4-neon model.\n\nCustom tail.\n';
  const input = freeze([system(prompt), user('hello', 'm-1')]);
  const off = await request(input, 'off');
  const minimal = await request(input, 'minimal');
  assert.equal(off.config.systemInstruction, prompt);
  assert.equal(
    minimal.config.systemInstruction,
    'You are an AI agent powered by DeepSeek Harness. You are a coding agent powered by the gemini-4-neon model.\n\nCustom tail.\n',
  );
  assert.deepEqual(minimal.contents, off.contents);
  assert.deepEqual(await request(input, 'minimal'), minimal);
});

test('polymorphic modes generate deterministic seeded payloads for retries and vary across turns and sessions', () => {
  for (const [mode, floor, [minProbes, maxProbes], [minMd, maxMd]] of [
    ['probe-only', 230, [1, 2], [1, 2]],
    ['hybrid', 5020, [3, 5], [2, 5]],
    ['fortress', 6550, [3, 5], [2, 5]],
  ]) {
    const seed = shieldSeed(mode, { sessionId: 'sess-a', messages: [system('Original'), user('hello', 'msg-1')] });
    const shield = createShieldPayload(mode, seed);
    assert.match(shield, /^<system-reminder>\n[\s\S]+\n<\/system-reminder>$/);
    const comments = shield.match(/<!-- [A-Za-z0-9._:=;-]+ -->/g) ?? [];
    assert.ok(comments.length > 0);
    for (const comment of comments) assert.ok(!comment.slice(4, -3).includes('--'));
    assert.ok(comments.join('').length >= floor);
    const mdRefs = shield.match(MD_REF_RE) ?? [];
    assert.ok(mdRefs.length >= minMd && mdRefs.length <= maxMd);
    const probes = shield.match(/Google DeepMind/g)?.length ?? 0;
    assert.ok(probes >= minProbes && probes <= maxProbes);
    assert.equal(createShieldPayload(mode, seed), shield, 'same seed replays byte-identically on retry');
    const nextTurnSeed = shieldSeed(mode, { sessionId: 'sess-a', messages: [system('Original'), user('hello', 'msg-1'), user('next', 'msg-2')] });
    const otherSessionSeed = shieldSeed(mode, { sessionId: 'sess-b', messages: [system('Original'), user('hello', 'msg-1')] });
    assert.notEqual(createShieldPayload(mode, nextTurnSeed), shield);
    assert.notEqual(createShieldPayload(mode, otherSessionSeed), shield);
  }

  const samples = Array.from({ length: 16 }, (_, i) => createShieldPayload('hybrid', `sample-${i}`));
  assert.ok(samples.some(sample => /Who are you|foundation model|base model/i.test(sample)), 'synthesizes English probes');
  assert.ok(samples.some(sample => /你是谁|基座|底层/.test(sample)), 'synthesizes Chinese probes');
  assert.ok(new Set(samples.map(sample => sample.split('\n').length)).size > 1, 'varies line count across layouts');
});

test('tail placement preserves ordinary and parallel-tool requests, signatures, and frozen input', async () => {
  const assistant = {
    role: 'assistant',
    id: 'a-1',
    source: { replayState: { response: { kind: 'gemini-native', version: 1 }, blocks: {
      0: { type: 'tool-call', nativeId: 'native-a', metadata: { thoughtSignature: 'signature-a' } },
      1: { type: 'tool-call', nativeId: 'native-b', metadata: { thoughtSignature: 'signature-b' } },
    } } },
    content: ['a', 'b'].map(id => ({ type: 'tool-call', id, name: 'lookup', arguments: JSON.stringify({ id }) })),
  };
  const tools = ['a', 'b'].map(id => ({ role: 'tool', id: `t-${id}`, toolCallId: id, content: [text(`result-${id}`)] }));
  for (const history of [
    [user('hello', 'u-1')],
    [user('lookup', 'u-1'), assistant, ...tools],
    [user('hello', 'u-1'), { role: 'assistant', id: 'a-2', content: [text('answer')] }],
  ]) {
    const input = freeze([system('Original'), ...history]);
    const baseline = await request(input, 'off');
    const protectedRequest = await request(input, 'hybrid');
    assert.deepEqual(await request(input, 'hybrid'), protectedRequest);
    const tail = protectedRequest.contents.at(-1);
    assert.equal(tail.role, 'user');
    const injected = tail.parts.pop();
    assert.match(injected.text, /^<system-reminder>\n[\s\S]+\n<\/system-reminder>$/);
    if (!tail.parts.length) protectedRequest.contents.pop();
    assert.deepEqual(protectedRequest.contents, baseline.contents);
    assert.equal(protectedRequest.config.systemInstruction, `Original\n\n${REMINDER_RULE}`);
    assert.equal(input[0].content[0].text, 'Original');
  }
});

test('one-shot system and foreign messages stay untouched while legacy v1 markers are stripped cleanly', async () => {
  const oneShot = await toRequest(
    { provider: PROVIDER, model: DEFAULT_MODELS[0].id, system: 'Title generator', messages: [user('hello', 'u-1')] },
    { models: DEFAULT_MODELS, routingShield: 'hybrid' },
  );
  assert.equal(oneShot.config.systemInstruction, 'Title generator');
  assert.deepEqual(oneShot.contents, [{ role: 'user', parts: [{ text: 'hello' }] }]);

  const foreign = await request([{ role: 'developer', content: [text('Dev note')] }, user('hello', 'u-1')], 'hybrid');
  assert.equal(foreign.config.systemInstruction, 'Dev note');
  assert.deepEqual(foreign.contents, [{ role: 'user', parts: [{ text: 'hello' }] }]);

  const legacyMinimalWithTrailingNewline = 'You are an AI agent powered by DeepSeek Harness.\n\nYou are a coding agent powered by the gemini-4-neon model.\n\nTail.\n\n\n<dsh-gemini-routing-shield version="1">minimal</dsh-gemini-routing-shield>';
  assert.equal(
    stripLegacyShield(legacyMinimalWithTrailingNewline),
    'You are an AI agent powered by DeepSeek Harness.\n\nYou are a coding agent powered by the gemini-4-neon model.\n\nTail.\n',
  );
  assert.equal(
    applyRoutingShield('minimal', legacyMinimalWithTrailingNewline).text,
    'You are an AI agent powered by DeepSeek Harness. You are a coding agent powered by the gemini-4-neon model.\n\nTail.\n',
  );

  const legacyHybrid = `Original\n\n${REMINDER_RULE}\n<dsh-gemini-routing-shield version="1">\n<system-reminder>\nlegacy\n</system-reminder>\n</dsh-gemini-routing-shield>`;
  assert.equal(stripLegacyShield(legacyHybrid), 'Original');
  assert.equal(applyRoutingShield('off', legacyHybrid).text, 'Original');
  assert.equal(applyRoutingShield('hybrid', legacyHybrid, { sessionId: 's', messages: [] }).text, `Original\n\n${REMINDER_RULE}`);
});
