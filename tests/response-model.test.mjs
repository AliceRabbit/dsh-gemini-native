import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MODELS, PROVIDER, toChunks, toRequest } from '../gemini.js';

const finish = { candidates: [{ content: { parts: [{ text: 'hello' }] }, finishReason: 'STOP' }] };
const collect = async (chunks, options = { model: 'requested-alias' }) => {
  const result = [];
  for await (const chunk of toChunks(chunks, options)) result.push(chunk);
  return result;
};
const identity = chunks => chunks.at(-1).replayState.response;

test('preserves the exact returned modelVersion, independently of the request alias', async () => {
  const chunks = await collect([{ modelVersion: 'gemini-server-version-001' }, finish]);
  assert.deepEqual(identity(chunks), { kind: 'gemini-native', version: 1, modelVersion: 'gemini-server-version-001' });
  assert.equal(chunks.find(chunk => chunk.type === 'text-delta').text, 'hello');
});

test('keeps identity from final metadata-only chunk and preserves token usage', async () => {
  const chunks = await collect([finish, { modelVersion: 'returned-final', usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 12, thoughtsTokenCount: 3 } }]);
  assert.equal(identity(chunks).modelVersion, 'returned-final');
  assert.equal(chunks.find(chunk => chunk.type === 'usage').usage.outputTokens, 15);
});

test('keeps server identity even when it equals the configured model', async () => {
  assert.equal(identity(await collect([{ ...finish, modelVersion: 'requested-alias' }])).modelVersion, 'requested-alias');
});

test('missing or malformed versions never fall back to the request or a previous response', async () => {
  await collect([{ ...finish, modelVersion: 'previous-model' }]);
  for (const modelVersion of [undefined, null, '', '  ', 123]) {
    assert.deepEqual(identity(await collect([{ ...finish, modelVersion }])), { kind: 'gemini-native', version: 1 });
  }
  const chunks = await collect([{ modelVersion: 'kept' }, { ...finish, modelVersion: '' }]);
  assert.equal(identity(chunks).modelVersion, 'kept');
});

test('tool-call response keeps both the model version and replay signatures', async () => {
  const chunks = await collect([
    { candidates: [{ content: { parts: [{ text: 'step ', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: 'one', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: '!', thought: true, thoughtSignature: 'thought-sig' }] } }] },
    { modelVersion: 'gemini-tool-model', candidates: [{ content: { parts: [{ functionCall: { name: 'lookup', args: { q: 'test' } }, thoughtSignature: 'signature' }] }, finishReason: 'STOP' }] },
  ]);
  assert.equal(identity(chunks).modelVersion, 'gemini-tool-model');
  assert.equal(chunks.at(-1).reason.kind, 'tool-calls');
  assert.deepEqual(chunks.at(-1).replayState.blocks[0].parts, [
    { length: 8, thought: true },
    { length: 1, thought: true, thoughtSignature: 'thought-sig' },
  ]);
  assert.equal(chunks.at(-1).replayState.blocks[1].metadata.thoughtSignature, 'signature');
});

test('drops unsigned empty text and thought parts during streaming and replay while preserving signed ones', async () => {
  const toolChunks = await collect([
    { candidates: [{ content: { parts: [{ text: '', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ functionCall: { name: 'lookup', args: { q: 'x' } }, thoughtSignature: 'call-sig' }] } }] },
    { candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }] },
  ]);
  const ended = toolChunks.filter(chunk => chunk.type === 'block-end').map(chunk => chunk.block);
  assert.equal(ended.length, 1);
  assert.equal(ended[0].type, 'tool-call');
  assert.equal(toolChunks.at(-1).replayState.blocks.length, 1);

  const signedTextChunks = await collect([
    { candidates: [{ content: { parts: [{ text: 'hello' }] } }] },
    { candidates: [{ content: { parts: [{ text: ' ' }] } }] },
    { candidates: [{ content: { parts: [{ text: 'world' }] } }] },
    { candidates: [{ content: { parts: [{ text: '', thoughtSignature: 'tail-sig' }] }, finishReason: 'STOP' }] },
  ]);
  const textBlocks = signedTextChunks.filter(chunk => chunk.type === 'block-end').map(chunk => chunk.block);
  assert.deepEqual(textBlocks, [{ type: 'text', text: 'hello world' }]);
  assert.deepEqual(signedTextChunks.at(-1).replayState.blocks[0].parts, [
    { length: 11 },
    { length: 0, thoughtSignature: 'tail-sig' },
  ]);

  const request = await toRequest({
    provider: PROVIDER,
    model: DEFAULT_MODELS[0].id,
    messages: [
      { role: 'user', content: [{ type: 'text', text: 'go' }] },
      {
        role: 'assistant',
        source: { replayState: { response: { kind: 'gemini-native', version: 1 }, blocks: [
          { nativeId: 'native-1', metadata: { thoughtSignature: 'call-sig' } },
          { parts: [{ length: 0 }] },
        ] } },
        content: [
          { type: 'tool-call', id: 'c1', name: 'lookup', arguments: '{"q":"x"}' },
          { type: 'text', text: '' },
        ],
      },
      { role: 'tool', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }] },
      {
        role: 'assistant',
        source: { replayState: { response: { kind: 'gemini-native', version: 1 }, blocks: [
          { parts: [{ length: 4 }, { length: 0, thoughtSignature: 'tail-sig' }] },
        ] } },
        content: [{ type: 'text', text: 'done' }],
      },
      { role: 'user', content: [{ type: 'text', text: 'next' }] },
    ],
  }, { models: DEFAULT_MODELS });
  assert.deepEqual(request.contents[1].parts, [
    { functionCall: { name: 'lookup', args: { q: 'x' }, id: 'native-1' }, thoughtSignature: 'call-sig' },
  ]);
  assert.deepEqual(request.contents[3].parts, [
    { text: 'done' },
    { text: '', thoughtSignature: 'tail-sig' },
  ]);
});
