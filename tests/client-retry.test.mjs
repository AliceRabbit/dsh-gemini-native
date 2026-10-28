import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const defaults = { enabled: true, maxRetries: 5, initialDelayMs: 5000, maxDelayMs: 30000 };
const clone = value => JSON.parse(JSON.stringify(value));
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)];
const text = tree => typeof tree === 'string' ? tree : tree?.children?.map(text).join('') ?? '';

// Deliberately small React test double: run the actual registered Card and Editor,
// keep hooks per component, and inspect rendered props without a browser or DOM.
function fakeReact() {
  let active;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
    useState(initial) {
      const owner = active;
      const i = owner.cursor++;
      if (!(i in owner.hooks)) owner.hooks[i] = typeof initial === 'function' ? initial() : initial;
      const set = value => { owner.hooks[i] = typeof value === 'function' ? value(owner.hooks[i]) : value; };
      owner.setters[i] = set;
      return [owner.hooks[i], set];
    },
    useRef(initial) { return React.useState(() => ({ current: initial }))[0]; },
    useId() { return React.useState(() => `test-${active.cursor}`)[0]; },
    useMemo(compute, deps) {
      const owner = active;
      const i = owner.cursor++;
      const previous = owner.hooks[i];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) owner.hooks[i] = { deps, value: compute() };
      return owner.hooks[i].value;
    },
    useEffect(effect, deps) {
      const owner = active;
      const i = owner.cursor++;
      const previous = owner.hooks[i];
      if (!previous || deps.some((value, index) => !Object.is(value, previous[index]))) {
        owner.hooks[i] = deps;
        owner.effects.push(effect);
      }
    },
  };
  class Renderer {
    constructor(component, props) { Object.assign(this, { component, props, hooks: [], setters: [], effects: [], cursor: 0 }); }
    render(runEffects = true) {
      active = this;
      this.cursor = 0;
      this.tree = this.component(this.props);
      active = undefined;
      for (const effect of this.effects.splice(0)) if (runEffects) effect();
      return this.tree;
    }
    async settle() { for (let i = 0; i < 4; i++) { await Promise.resolve(); this.render(); } }
  }
  return { React, Renderer };
}

async function fixture({ quotaRetry, writable = true, locale = 'en', user = {}, value = {}, mutation, interrogation } = {}) {
  const { React, Renderer } = fakeReact();
  let plugin;
  let Card;
  let dictionaries;
  const calls = { mutations: [], credentials: [], accepted: [], closed: [], interrogations: [] };
  const provider = { settingsNs: 'llm-gemini-native', displayName: 'Gemini', provider: 'gemini-native', defaultBaseURL: 'https://example.test' };
  const view = {
    ns: provider.settingsNs, revision: 17, schema: {}, base: {}, user: clone(user),
    value: { apiKeyEnv: 'GEMINI_API_KEY', baseURL: 'https://example.test', models: [{ id: 'gemini-test' }], ...value,
      ...(quotaRetry === undefined ? {} : { quotaRetry: clone(quotaRetry) }) },
  };
  const ctx = {
    effect: run => run(),
    locale: { register: (_namespace, copy) => { dictionaries = copy; }, bind: () => key => dictionaries[locale][key] },
    slots: {
      inject: (name, callback) => { assert.equal(name, 'settings.models.provider-card'); callback(); },
      register: (options, component) => { assert.equal(options.key, 'llm-gemini-native'); Card = component; },
    },
    settingsSchema: { rehydrate: x => x, nodeAtPath: (_schema, path) => { assert.deepEqual(Array.from(path), ['models']); return { meta: { default: [{ id: 'gemini-test' }] } }; } },
    configForms: { describe: () => ({
      ensure: async () => {},
      getSnapshot: () => ({ view: { writable, namespaces: [view] } }),
      acceptView: accepted => calls.accepted.push(clone(accepted)),
    }) },
    remote: {
      settings: {
        describe: async () => ({ ok: true, value: { writable, namespaces: [view] } }),
        mutate: async (ns, ops, revision) => {
          calls.mutations.push(clone({ ns, ops, revision }));
          if (mutation) return await mutation();
          const accepted = clone(view);
          accepted.revision++;
          for (const op of ops) {
            if (op.op === 'set') { accepted.value[op.path[0]] = op.value; accepted.user[op.path[0]] = op.value; }
            else delete accepted.user[op.path[0]];
          }
          return { ok: true, value: accepted };
        },
      },
      credentials: { set: async (...args) => { calls.credentials.push(args); return { ok: true }; } },
      llm: { discoverModels: async (...args) => { calls.interrogations.push(args); return interrogation ? await interrogation() : { ok: true, value: [] }; } },
    },
  };
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: ({ factory }) => { plugin = factory(id => { assert.equal(id, 'react'); return React; }); } } },
    URL, console, crypto: { randomUUID: () => `row-${Math.random()}` },
  }, { filename: 'client.js' });
  plugin.apply(ctx);
  const t = key => dictionaries[locale][key];
  const card = new Renderer(Card, { ctx, t, provider, keyConfigured: true });
  // Card's pre-existing legacy DOM click hook is deliberately outside this test.
  card.render(false);
  card.setters[0](true);
  card.render(false);
  const editorElement = nodes(card.tree).find(node => typeof node.type === 'function' && node.type.name === 'Editor');
  assert.ok(editorElement, 'existing Card mounts Editor');
  const editor = new Renderer(editorElement.type, { ...editorElement.props, onClose: changed => calls.closed.push(changed) });
  editor.render();
  await editor.settle();
  const find = predicate => nodes(editor.tree).find(predicate);
  const control = key => find(node => node.props['aria-label'] === t(key) && node.type === 'input');
  const button = key => find(node => node.type === 'button' && text(node) === t(key));
  const change = (key, value) => {
    const input = control(key);
    assert.ok(input, key);
    input.props.onChange({ target: typeof value === 'boolean' ? { checked: value } : { value } });
    editor.render();
  };
  const submit = () => find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  return { editor, calls, control, button, change, submit, find, t, dictionaries };
}

test('default retry controls live only in existing custom settings and do not materialize defaults', async () => {
  const f = await fixture();
  assert.equal(f.control('quotaRetryEnabled').props.checked, true);
  assert.equal(f.control('retryCount').props.value, '5');
  assert.equal(f.control('retryInitial').props.value, '5');
  assert.equal(f.control('retryMax').props.value, '30');
  assert.equal(f.control('retryInitial').props.step, 0.001);
  const details = f.find(node => node.type === 'details' && node.props.className === 'gn-customized');
  assert.ok(nodes(details).includes(f.control('quotaRetryEnabled')));
  await f.submit();
  assert.deepEqual(f.calls.mutations, []);
  assert.deepEqual(f.calls.credentials, []);
});

test('accepted disabled settings display seconds and disable only retry number fields', async () => {
  const f = await fixture({ quotaRetry: { enabled: false, maxRetries: 8, initialDelayMs: 1234, maxDelayMs: 25001 } });
  assert.equal(f.control('retryInitial').props.value, '1.234');
  assert.equal(f.control('retryMax').props.value, '25.001');
  for (const key of ['retryCount', 'retryInitial', 'retryMax']) assert.equal(f.control(key).props.disabled, true);
  assert.equal(f.control('quotaRetryEnabled').props.disabled, false);
  await f.submit();
  assert.deepEqual(f.calls.mutations, []);
});

test('retry-only edits emit one whole-object path with integer milliseconds and expected revision', async () => {
  const f = await fixture({
    user: { models: [{ id: 'gemini-custom' }], apiKey: 'redacted', baseURL: 'https://gateway.test' },
    value: { models: [{ id: 'gemini-custom', contextWindow: 100000, input: ['text', 'image'] }], baseURL: 'https://gateway.test' },
  });
  f.change('retryCount', '7');
  f.change('retryInitial', '1.001');
  f.change('retryMax', '2.009');
  await f.submit();
  assert.deepEqual(f.calls.mutations, [{ ns: 'llm-gemini-native', revision: 17, ops: [{ op: 'set', path: ['quotaRetry'], value: {
    enabled: true, maxRetries: 7, initialDelayMs: 1001, maxDelayMs: 2009,
  } }] }]);
  assert.deepEqual(f.calls.credentials, []);
  assert.equal(f.calls.accepted.length, 1);
  assert.deepEqual(f.calls.closed, [true]);
});

test('switch off preserves accepted numeric settings and writes only quotaRetry', async () => {
  const f = await fixture({ quotaRetry: { ...defaults, maxRetries: 9, initialDelayMs: 1500, maxDelayMs: 40000 } });
  f.change('quotaRetryEnabled', false);
  await f.submit();
  assert.deepEqual(f.calls.mutations[0].ops, [{ op: 'set', path: ['quotaRetry'], value: {
    enabled: false, maxRetries: 9, initialDelayMs: 1500, maxDelayMs: 40000,
  } }]);
});

test('reverted edits and cancel never persist retry drafts', async () => {
  const reverted = await fixture();
  reverted.change('quotaRetryEnabled', false);
  reverted.change('quotaRetryEnabled', true);
  reverted.change('retryInitial', '5.000');
  await reverted.submit();
  assert.deepEqual(reverted.calls.mutations, []);
  const cancelled = await fixture();
  cancelled.change('retryCount', '19');
  cancelled.button('cancel').props.onClick();
  assert.deepEqual(cancelled.calls.closed, [false]);
  assert.deepEqual(cancelled.calls.mutations, []);
  const reopened = await fixture();
  assert.equal(reopened.control('retryCount').props.value, '5');
});

for (const [key, values] of [
  ['retryCount', ['', '0', '21', '1.5', 'NaN', 'Infinity']],
  ['retryInitial', ['', '0.999', '300.001', '1.0001', '-1', 'Infinity']],
  ['retryMax', ['', '0.999', '300.001', '1.0001', '4.999']],
]) {
  test(`${key} rejects out-of-range, fractional-count, precision and ordering errors`, async () => {
    for (const value of values) {
      const f = await fixture();
      f.change(key, value);
      assert.equal(f.control(key).props['aria-invalid'], true, value);
      assert.equal(f.button('save').props.disabled, true, value);
      assert.ok(f.find(node => node.props.role === 'alert'), value);
      await f.submit();
      assert.deepEqual(f.calls.mutations, [], value);
    }
  });
}

test('both inclusive boundaries and equal delays save successfully', async () => {
  for (const [count, seconds, ms] of [['1', '1', 1000], ['20', '300', 300000]]) {
    const f = await fixture();
    f.change('retryCount', count);
    f.change('retryInitial', seconds);
    f.change('retryMax', seconds);
    assert.equal(f.button('save').props.disabled, false);
    await f.submit();
    assert.deepEqual(f.calls.mutations[0].ops[0].value, { enabled: true, maxRetries: Number(count), initialDelayMs: ms, maxDelayMs: ms });
  }
});

test('turning off recovers invalid number drafts so disabled fields cannot trap Save', async () => {
  const f = await fixture();
  f.change('retryInitial', '');
  f.change('quotaRetryEnabled', false);
  assert.equal(f.control('retryInitial').props.value, '5');
  assert.equal(f.button('save').props.disabled, false);
  await f.submit();
  assert.deepEqual(f.calls.mutations[0].ops[0].value, { ...defaults, enabled: false });
});

test('read-only, saving and provider fetching states disable retry controls and block submit', async () => {
  const readonly = await fixture({ writable: false });
  for (const key of ['quotaRetryEnabled', 'retryCount', 'retryInitial', 'retryMax']) assert.equal(readonly.control(key).props.disabled, true);
  await readonly.submit();
  assert.deepEqual(readonly.calls.mutations, []);

  let finish;
  const saving = await fixture({ mutation: () => new Promise(resolve => { finish = resolve; }) });
  saving.change('retryCount', '8');
  const pendingSave = saving.submit();
  saving.editor.render();
  for (const key of ['quotaRetryEnabled', 'retryCount', 'retryInitial', 'retryMax']) assert.equal(saving.control(key).props.disabled, true);
  await saving.submit();
  assert.equal(saving.calls.mutations.length, 1);
  finish({ ok: false, error: { message: 'settings-conflict' } });
  await pendingSave;

  let finishFetch;
  const fetching = await fixture({ interrogation: () => new Promise(resolve => { finishFetch = resolve; }) });
  const pendingFetch = fetching.button('fetch').props.onClick();
  fetching.editor.render();
  for (const key of ['quotaRetryEnabled', 'retryCount', 'retryInitial', 'retryMax']) assert.equal(fetching.control(key).props.disabled, true);
  await fetching.submit();
  assert.deepEqual(fetching.calls.mutations, []);
  finishFetch({ ok: true, value: { models: [] } });
  await pendingFetch;
});

test('settings conflict keeps the draft open and reports the failure without credential writes', async () => {
  const f = await fixture({ mutation: async () => ({ ok: false, error: { message: 'settings-conflict' } }) });
  f.change('retryCount', '12');
  await f.submit();
  f.editor.render();
  assert.deepEqual(f.calls.closed, []);
  assert.deepEqual(f.calls.accepted, []);
  assert.deepEqual(f.calls.credentials, []);
  assert.equal(f.control('retryCount').props.value, '12');
  assert.match(text(f.editor.tree), /settings-conflict/);
  assert.equal(f.button('save').props.disabled, false);
});

test('endpoint, credential and model edits do not populate an untouched retry section', async () => {
  const endpoint = await fixture();
  endpoint.change('endpoint', 'https://new.example.test');
  await endpoint.submit();
  assert.deepEqual(endpoint.calls.mutations[0].ops, [{ op: 'set', path: ['baseURL'], value: 'https://new.example.test' }]);
  const credential = await fixture();
  credential.change('key', 'valid-key');
  await credential.submit();
  assert.deepEqual(credential.calls.mutations, []);
  assert.deepEqual(credential.calls.credentials, [['GEMINI_API_KEY', 'valid-key']]);
  const models = await fixture({ user: { models: [{ id: 'custom' }] }, value: { models: [{ id: 'custom' }] } });
  models.button('reset').props.onClick();
  models.editor.render();
  await models.submit();
  assert.deepEqual(models.calls.mutations[0].ops, [{ op: 'unset', path: ['models'] }]);
});

test('English and Chinese render complete localized retry semantics', async () => {
  const keys = ['quotaRetry', 'quotaRetryEnabled', 'retryCount', 'retryInitial', 'retryMax', 'retryHelp', 'retryBudget', 'retryOff', 'retryPrecision', 'invalidRetryCount', 'invalidRetryDelay', 'invalidRetryOrder'];
  for (const locale of ['en', 'zh']) {
    const f = await fixture({ locale });
    for (const key of keys) assert.equal(typeof f.dictionaries[locale][key], 'string', `${locale}:${key}`);
    const content = text(f.editor.tree);
    for (const key of ['retryHelp', 'retryBudget', 'retryOff', 'retryPrecision']) assert.ok(content.includes(f.t(key)), key);
    assert.match(content, /gemini-native/);
    assert.match(content, /QUOTA/);
  }
});
