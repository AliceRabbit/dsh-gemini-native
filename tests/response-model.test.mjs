import test from 'node:test';
import assert from 'node:assert/strict';
import { toChunks } from '../gemini.js';

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
  const chunks = await collect([{ modelVersion: 'gemini-tool-model', candidates: [{ content: { parts: [{ functionCall: { name: 'lookup', args: { q: 'test' } }, thoughtSignature: 'signature' }] }, finishReason: 'STOP' }] }]);
  assert.equal(identity(chunks).modelVersion, 'gemini-tool-model');
  assert.equal(chunks.at(-1).reason.kind, 'tool-calls');
  assert.equal(chunks.at(-1).replayState.blocks[0].metadata.thoughtSignature, 'signature');
});
