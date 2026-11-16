import test from 'node:test';
import assert from 'node:assert/strict';
import { Config, apply, inject } from '../routing-shield/index.js';
import { createShieldSection, extractShield, REMINDER_RULE } from '../routing-shield/payload.js';
import { toRequest, DEFAULT_MODELS, PROVIDER } from '../gemini.js';

const text = text => ({ type: 'text', text });
const system = value => ({ role: 'system', source: { kind: 'system-prompt' }, content: [text(value)] });
const user = value => ({ role: 'user', content: [text(value)] });
const request = messages => toRequest({ provider: PROVIDER, model: DEFAULT_MODELS[0].id, messages }, { models: DEFAULT_MODELS });
const MD_REF_RE = /^(?:\[\/\/\]: (?:#|<>)|\[#\]: #|\[::\]: #) (?:\([A-Za-z0-9.-]+\)|"[A-Za-z0-9.-]+")$/gm;

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('three strengths record polymorphic v1.4 barriers and decode without new randomness', () => {
  for (const [mode, floor, [minProbes, maxProbes], [minMd, maxMd]] of [
    ['probe-only', 230, [1, 2], [1, 2]],
    ['hybrid', 5020, [3, 5], [2, 5]],
    ['fortress', 6550, [3, 5], [2, 5]],
  ]) {
    const section = createShieldSection(mode);
    const decoded = extractShield(section);
    assert.equal(decoded.text, REMINDER_RULE);
    assert.match(decoded.shield, /^<system-reminder>\n[\s\S]+\n<\/system-reminder>$/);
    const comments = decoded.shield.match(/<!-- [A-Za-z0-9._:=;-]+ -->/g) ?? [];
    assert.ok(comments.length > 0);
    for (const comment of comments) assert.ok(!comment.slice(4, -3).includes('--'));
    assert.ok(comments.join('').length >= floor);
    const mdRefs = decoded.shield.match(MD_REF_RE) ?? [];
    assert.ok(mdRefs.length >= minMd && mdRefs.length <= maxMd);
    const probes = decoded.shield.match(/Google DeepMind/g)?.length ?? 0;
    assert.ok(probes >= minProbes && probes <= maxProbes);
    assert.deepEqual(extractShield(section), decoded);
    assert.notEqual(createShieldSection(mode), section);
    assert.deepEqual(extractShield(`Before\n\n${section}\n\nAfter`), { text: `Before\n\n${REMINDER_RULE}\n\nAfter`, shield: decoded.shield });
  }

  const samples = Array.from({ length: 16 }, () => extractShield(createShieldSection('hybrid')).shield);
  assert.ok(samples.some(sample => /Who are you|foundation model|base model/i.test(sample)), 'synthesizes English probes');
  assert.ok(samples.some(sample => /你是谁|基座|底层/.test(sample)), 'synthesizes Chinese probes');
  assert.ok(new Set(samples.map(sample => sample.split('\n').length)).size > 1, 'varies line count across layouts');
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
  const probeOnlyCount = section.text({ modelSelection: { provider: PROVIDER } }).match(/Google DeepMind/g).length;
  assert.ok(probeOnlyCount >= 2 && probeOnlyCount <= 3);
  const on = await request([system(`Original\n\n${content}`), user('hello')]);
  assert.equal(on.contents[0].parts.length, 2);
  const off = await request([system('Original'), user('hello')]);
  assert.deepEqual(off.contents, [{ role: 'user', parts: [{ text: 'hello' }] }]);
  assert.equal(off.config.systemInstruction, 'Original');
  const foreign = await request([{ role: 'developer', content: [text(content)] }, user(content)]);
  assert.equal(foreign.config.systemInstruction, content);
  assert.deepEqual(foreign.contents, [{ role: 'user', parts: [{ text: content }] }]);
});
