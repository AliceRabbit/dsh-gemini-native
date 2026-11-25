import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { LlmRuntime } from '@deepseek-ai/dsh-llm';
import { Config } from '../index.js';
import { GeminiAdapter, PROVIDER } from '../gemini.js';

const config = raw => Object.fromEntries(Object.entries(Config(raw)).map(([key, value]) => [key, value.get()]));

test('advertises the documented thinking levels for built-in and custom-list model IDs', async () => {
  const adapter = new GeminiAdapter({ options: () => config({}) });
  const standard = ['low', 'medium', 'high'];
  const catalog = new Map((await adapter.listModels(PROVIDER)).map(model => [model.id, model]));
  for (const [id, levels, defaultEffort] of [
    ['gemini-4-hydrogen', [...standard, 'xhigh'], 'high'],
    ['gemini-4-neon', [...standard, 'xhigh'], 'high'],
    ['gemini-4-carbon', standard, 'medium'],
    ['gemini-4-argon', standard, 'medium'],
    ['gemini-3.8-flash', standard, 'medium'],
    ['gemini-3.5-flash-lite', ['minimal', ...standard], 'minimal'],
    ['gemini-3.1-pro-preview', standard, 'high'],
  ]) {
    const reasoning = catalog.get(id).reasoning;
    assert.deepEqual(reasoning.efforts.map(effort => effort.id), levels, id);
    assert.equal(reasoning.defaultEffort, defaultEffort, id);
  }

  const models = [{ id: 'gemini-4-neon', reasoningEfforts: ['high', 'xhigh'], defaultReasoning: 'xhigh' }];
  const custom = new GeminiAdapter({ options: () => config({ models }) });
  assert.equal((await custom.resolveModel(PROVIDER, models[0].id)).reasoning.defaultEffort, 'xhigh');
  assert.equal((await custom.resolveModel(PROVIDER, 'gemini-4-hydrogen')).reasoning.defaultEffort, 'high');
});

test('DSH and the SDK preserve xhigh on the wire and reject it on Carbon', async t => {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  const llm = new LlmRuntime(ctx);
  const requests = [];
  const adapter = new GeminiAdapter({
    options: () => config({ baseURL: 'https://example.invalid/gemini' }),
    resolveApiKey: async () => 'test-api-key',
    fetch: async (url, init) => {
      requests.push([new URL(url).pathname, JSON.parse(init.body).generationConfig.thinkingConfig]);
      return new Response('data: {"candidates":[{"content":{"role":"model","parts":[{"text":"ok"}]},"finishReason":"STOP"}]}\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      });
    },
  });
  llm.registerAdapter([PROVIDER], adapter);
  const messages = [{ role: 'user', content: [{ type: 'text', text: 'test' }] }];
  for (const [model, reasoningEffort, thinking] of [
    ['gemini-4-hydrogen', 'xhigh', { thinkingLevel: 'XHIGH' }],
    ['gemini-4-neon', undefined, { thinkingLevel: 'HIGH' }],
    ['gemini-4-carbon', undefined, { thinkingLevel: 'MEDIUM' }],
    ['gemini-3.5-flash-lite', undefined, { thinkingLevel: 'MINIMAL' }],
    ['gemini-2.5-flash', undefined, { thinkingBudget: 8192 }],
  ]) {
    const options = { provider: PROVIDER, model, reasoningEffort, messages };
    const chunks = await Array.fromAsync(llm.stream(options));
    assert.equal(chunks.at(-1).reason.kind, 'stop');
    assert.deepEqual(requests.at(-1), [`/gemini/v1beta/models/${model}:streamGenerateContent`, { includeThoughts: true, ...thinking }]);
  }
  await assert.rejects(llm.resolveCallConfig({ provider: PROVIDER, model: 'gemini-4-carbon', reasoningEffort: 'xhigh' }));
  assert.equal(requests.length, 5);
});
