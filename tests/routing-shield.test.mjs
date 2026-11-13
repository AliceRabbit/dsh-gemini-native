import test from 'node:test';
import assert from 'node:assert/strict';
import { Config, apply, inject } from '../routing-shield/index.js';
import { createShieldSection, extractShield, REMINDER_RULE } from '../routing-shield/payload.js';
import { toRequest, DEFAULT_MODELS, PROVIDER } from '../gemini.js';

const text = text => ({ type: 'text', text });
const system = value => ({ role: 'system', source: { kind: 'system-prompt' }, content: [text(value)] });
const user = value => ({ role: 'user', content: [text(value)] });
const request = messages => toRequest({ provider: PROVIDER, model: DEFAULT_MODELS[0].id, messages }, { models: DEFAULT_MODELS });
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('three strengths record their complete barrier and decode without new randomness', () => {
  for (const [mode, floor, probes] of [['probe-only', 220, 1], ['hybrid', 5000, 4], ['fortress', 6400, 4]]) {
    const section = createShieldSection(mode);
    const decoded = extractShield(section);
    assert.equal(decoded.text, REMINDER_RULE);
    assert.match(decoded.shield, /^<system-reminder>\n[\s\S]+\n<\/system-reminder>$/);
    assert.equal(decoded.shield.match(/Google DeepMind/g).length, probes);
    assert.ok(decoded.shield.match(/<!-- [A-Za-z0-9]+ -->/g).join('').length >= floor);
    assert.equal(decoded.shield.match(/\[\/\/\]: #/g).length, mode === 'probe-only' ? 1 : 3);
    assert.deepEqual(extractShield(section), decoded);
    assert.notEqual(createShieldSection(mode), section);
    assert.deepEqual(extractShield(`Before\n\n${section}\n\nAfter`), { text: `Before\n\n${REMINDER_RULE}\n\nAfter`, shield: decoded.shield });
  }
});

test('tail placement preserves ordinary and parallel-tool requests, signatures, and frozen input', async () => {
  const section = createShieldSection('hybrid');
  const shield = extractShield(section).shield;
  const assistant = {
    role: 'assistant',
    source: { replayState: { response: { kind: 'gemini-native', version: 1 }, blocks: {
      0: { type: 'tool-call', nativeId: 'native-a', metadata: { thoughtSignature: 'signature-a' } },
      1: { type: 'tool-call', nativeId: 'native-b', metadata: { thoughtSignature: 'signature-b' } },
    } } },
    content: ['a', 'b'].map(id => ({ type: 'tool-call', id, name: 'lookup', arguments: JSON.stringify({ id }) })),
  };
  const tools = ['a', 'b'].map(id => ({ role: 'tool', toolCallId: id, content: [text(`result-${id}`)] }));
  for (const history of [[user('hello')], [user('lookup'), assistant, ...tools], [user('hello'), { role: 'assistant', content: [text('answer')] }]]) {
    const baseline = await request([system('Original'), ...history]);
    const input = freeze([system(`Original\n\n${section}`), ...history]);
    const protectedRequest = await request(input);
    assert.deepEqual(await request(input), protectedRequest);
    const tail = protectedRequest.contents.at(-1);
    assert.equal(tail.role, 'user');
    assert.deepEqual(tail.parts.pop(), { text: shield });
    if (!tail.parts.length) protectedRequest.contents.pop();
    assert.deepEqual(protectedRequest.contents, baseline.contents);
    assert.equal(protectedRequest.config.systemInstruction, `Original\n\n${REMINDER_RULE}`);
    assert.equal(input[0].content[0].text, `Original\n\n${section}`);
  }
});

test('component targets only native Gemini; absent section restores baseline and foreign content is untouched', async () => {
  let section;
  const config = Config({});
  apply({ inject() {}, systemPrompt: { section(value) { section = value; } } }, { mode: { get: () => config.mode } });
  assert.deepEqual(inject, ['systemPrompt']);
  assert.equal(section.interpolate, false);
  assert.equal(section.text({ modelSelection: { provider: 'other' } }), '');
  assert.equal(section.text({}), '');
  const content = section.text({ modelSelection: { provider: PROVIDER } });
  config.mode = 'probe-only';
  assert.equal(section.text({ modelSelection: { provider: PROVIDER } }).match(/Google DeepMind/g).length, 2);
  const on = await request([system(`Original\n\n${content}`), user('hello')]);
  assert.equal(on.contents[0].parts.length, 2);
  const off = await request([system('Original'), user('hello')]);
  assert.deepEqual(off.contents, [{ role: 'user', parts: [{ text: 'hello' }] }]);
  assert.equal(off.config.systemInstruction, 'Original');
  const foreign = await request([{ role: 'developer', content: [text(content)] }, user(content)]);
  assert.equal(foreign.config.systemInstruction, content);
  assert.deepEqual(foreign.contents, [{ role: 'user', parts: [{ text: content }] }]);
});
