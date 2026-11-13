import { createHash, randomUUID } from 'node:crypto';
import { ApiError, GoogleGenAI } from '@google/genai';
import {
  LlmAdapter, LlmError, attributionHeaders, assertUsableApiKey,
  isContextWindowExceededError, isQuotaExceededError,
  requestImageHandleText, resolveImageAttachmentAccess,
} from '@deepseek-ai/dsh-llm';
import { resolveQuotaRetryPolicy } from './quota-retry.js';
import { extractShield } from './routing-shield/payload.js';

export const PROVIDER = 'gemini-native';
export const NAMESPACE = 'llm-gemini-native';
export const BASE_URL = 'https://generativelanguage.googleapis.com';
export const DEFAULT_MODELS = [
  { id: 'gemini-4-argon', name: 'Gemini 4 Argon' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];

export function modelInfo(provider, id, config) {
  const entry = config.models.find(model => model.id === id) ?? { id };
  const version = Number(/^gemini-(\d+(?:\.\d+)?)/.exec(id)?.[1]);
  const thinking = entry.thinking ?? (version >= 3 ? 'level' : version === 2.5 ? 'budget' : 'none');
  const efforts = entry.reasoningEfforts ?? (
    thinking === 'none' ? [] : /^gemini-3-pro/.test(id) ? ['low', 'high'] : ['low', 'medium', 'high']
  );
  return {
    provider, id, name: entry.name ?? id,
    inputModalities: entry.inputModalities ?? ['text', 'image'],
    context: { contextWindow: entry.contextWindow ?? 1048576 },
    defaultMaxTokens: entry.maxTokens ?? 65536,
    ...(efforts.length ? { reasoning: {
      efforts: efforts.map(id => ({ id, name: id })),
      defaultEffort: entry.defaultReasoning ?? (efforts.includes('medium') ? 'medium' : efforts.at(-1)),
    } } : {}),
  };
}

// Accept either an API root or a versioned Gemini gateway prefix.
export function endpointOptions(baseURL, apiVersion) {
  const baseUrl = baseURL.replace(/\/+$/, '');
  const version = /\/(v1(?:beta\d*|alpha\d*)?)$/.exec(baseUrl);
  return version ? { baseUrl: baseUrl.slice(0, -version[0].length), apiVersion: version[1] }
    : { baseUrl, apiVersion };
}

export function createClient(config, apiKey, fetch) {
  return new GoogleGenAI({
    apiKey: assertUsableApiKey(apiKey, 'gemini-native', config.apiKeyEnv),
    vertexai: false,
    httpOptions: {
      ...endpointOptions(config.baseURL, config.apiVersion),
      headers: { ...config.headers, ...attributionHeaders() },
      timeout: config.timeoutMs,
      retryOptions: { attempts: 1 },
      ...(fetch ? { fetch } : {}),
    },
  });
}

function toolName(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_.:-]{0,63}$/.test(name) ? name
    : `tool_${createHash('sha256').update(name).digest('hex').slice(0, 40)}`;
}

function restoreParts(block, replay) {
  if (block.type === 'tool-call') {
    const part = { functionCall: {
      name: toolName(block.name), args: JSON.parse(block.arguments),
      ...(replay?.nativeId ? { id: replay.nativeId } : {}),
    } };
    if (replay) Object.assign(part, replay.metadata);
    // Only foreign/synthetic history lacks native replay; never replace a real signature.
    else part.thoughtSignature = 'skip_thought_signature_validator';
    return [part];
  }
  if (replay) {
    let offset = 0;
    return replay.parts.map(({ length, ...metadata }) => {
      const text = block.text.slice(offset, offset + length);
      offset += length;
      return { text, ...metadata };
    });
  }
  return block.type === 'text' ? [{ text: block.text }] : [];
}

export async function toRequest(options, config, services = {}) {
  const contents = [];
  const system = options.system ? [options.system] : [];
  let shield;
  const calls = new Map();
  const images = new Map();
  const append = (role, parts) => {
    if (!parts.length) return;
    if (contents.at(-1)?.role === role) contents.at(-1).parts.push(...parts);
    else contents.push({ role, parts });
  };
  async function userParts(blocks) {
    const parts = [];
    for (const block of blocks) {
      if (block.type === 'text') parts.push({ text: block.text });
      if (block.type === 'image') {
        const ref = block.attachment;
        if (!images.has(ref.attachmentId)) {
          if (!services.attachments) throw new LlmError('Gemini image input requires the attachment service', 'UNSUPPORTED_CONTENT');
          images.set(ref.attachmentId, await services.attachments.readImageRequest(ref, {
            width: ref.width, height: ref.height, maxBytes: ref.bytes,
          }, options.signal));
        }
        const image = images.get(ref.attachmentId);
        const access = resolveImageAttachmentAccess(services.attachments, services.processPath, ref);
        parts.push({ text: requestImageHandleText(ref, image, access) });
        parts.push({ inlineData: { mimeType: image.mediaType, data: Buffer.from(image.data).toString('base64') } });
      }
    }
    return parts;
  }
  for (const message of options.messages) {
    if (message.role === 'system' || message.role === 'developer') {
      for (const block of message.content) {
        if (block.type !== 'text') continue;
        const section = message.role === 'system' && message.source?.kind === 'system-prompt'
          ? extractShield(block.text) : { text: block.text };
        system.push(section.text);
        if (section.shield) shield = section.shield;
      }
    } else if (message.role === 'assistant') {
      const state = message.source?.replayState;
      const replay = state?.response?.kind === 'gemini-native' && state.response.version === 1 ? state.blocks : undefined;
      const parts = [];
      for (const [index, block] of message.content.entries()) {
        if (block.type === 'tool-call') calls.set(block.id, {
          name: toolName(block.name), ...(replay?.[index]?.nativeId ? { id: replay[index].nativeId } : {}),
        });
        if (['text', 'reasoning', 'tool-call'].includes(block.type)) parts.push(...restoreParts(block, replay?.[index]));
      }
      append('model', parts);
    } else if (message.role === 'tool') {
      const parts = await userParts(message.content);
      const text = parts.filter(part => part.text !== undefined).map(part => part.text).join('\n');
      const media = parts.filter(part => part.inlineData);
      append('user', [{ functionResponse: {
        ...calls.get(message.toolCallId),
        response: message.isError ? { error: text } : { output: text },
        ...(media.length ? { parts: media } : {}),
      } }]);
    } else append('user', await userParts(message.content));
  }

  if (shield) append('user', [{ text: shield }]);

  const model = modelInfo(options.provider, options.model, config);
  const entry = config.models.find(entry => entry.id === options.model) ?? {};
  const effort = options.reasoningEffort ?? model.reasoning?.defaultEffort;
  const isGemini4 = /^gemini-4(?:[.-]|$)/.test(options.model);
  const maxOutputTokens = options.maxTokens ?? model.defaultMaxTokens;
  if (isGemini4 && maxOutputTokens > 65536) {
    throw new LlmError('Gemini 4 single-request output is limited to 65,536 tokens; long decode is not enabled in this provider.', 'UNSUPPORTED_OPTION');
  }
  const thinking = entry.thinking ?? (/^gemini-2\.5/.test(options.model) ? 'budget' : 'level');
  const thinkingConfig = effort === undefined ? undefined : {
    includeThoughts: true,
    ...(thinking === 'budget' ? {
      thinkingBudget: entry.thinkingBudgets?.[effort] ?? ({
        low: 1024, medium: 8192, high: options.model.includes('pro') ? 32768 : 24576,
      })[effort],
    } : { thinkingLevel: effort.toUpperCase() }),
  };
  const tools = (options.tools ?? []).filter(tool => !tool.deferLoading);
  return {
    model: options.model,
    contents,
    config: {
      abortSignal: options.signal,
      automaticFunctionCalling: { disable: true },
      automaticContinuation: false,
      candidateCount: 1,
      maxOutputTokens,
      ...(system.length ? { systemInstruction: system.join('\n\n') } : {}),
      ...(thinkingConfig ? { thinkingConfig } : {}),
      ...(!isGemini4 && options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.stop ? { stopSequences: [...options.stop] } : {}),
      ...(tools.length ? { tools: [{ functionDeclarations: tools.map(tool => ({
        name: toolName(tool.name), description: tool.description, parametersJsonSchema: tool.parameters,
      })) }] } : {}),
    },
  };
}

export async function* toChunks(stream, options) {
  const names = new Map((options.tools ?? []).map(tool => [toolName(tool.name), tool.name]));
  const blocks = [];
  const replay = [];
  let current = -1;
  let usage;
  let finish;
  let modelVersion;
  let hasTools = false;
  for await (const chunk of stream) {
    // Preserve the server's identity even on metadata-only stream chunks.
    if (typeof chunk.modelVersion === 'string' && chunk.modelVersion.trim()) modelVersion = chunk.modelVersion;
    if (chunk.usageMetadata) usage = chunk.usageMetadata;
    if (chunk.promptFeedback?.blockReason) throw new LlmError(`Gemini blocked the prompt: ${chunk.promptFeedback.blockReason}`, 'CONTENT_FILTER');
    const candidate = chunk.candidates?.[0];
    if (!candidate) continue;
    for (const part of candidate.content?.parts ?? []) {
      if (part.functionCall) {
        if (current >= 0) {
          yield { type: 'block-end', index: current, block: blocks[current] };
          current = -1;
        }
        const call = part.functionCall;
        const index = blocks.length;
        const block = { type: 'tool-call', id: call.id ?? randomUUID(), name: names.get(call.name) ?? call.name, arguments: JSON.stringify(call.args ?? {}) };
        const { functionCall, ...metadata } = part;
        blocks.push(block);
        replay.push({ ...(call.id ? { nativeId: call.id } : {}), metadata });
        hasTools = true;
        yield { type: 'block-start', index, blockType: 'tool-call' };
        yield { type: 'tool-call-delta', index, id: block.id, name: block.name, argumentsDelta: block.arguments };
        yield { type: 'block-end', index, block };
      } else if (part.text !== undefined || part.thoughtSignature) {
        const type = part.thought ? 'reasoning' : 'text';
        if (current < 0 || blocks[current].type !== type) {
          if (current >= 0) yield { type: 'block-end', index: current, block: blocks[current] };
          current = blocks.length;
          blocks.push({ type, text: '' });
          replay.push({ parts: [] });
          yield { type: 'block-start', index: current, blockType: type };
        }
        const { text = '', ...metadata } = part;
        replay[current].parts.push({ length: text.length, ...metadata });
        blocks[current].text += text;
        if (text) yield { type: `${type}-delta`, index: current, text };
      } else {
        throw new LlmError('Gemini returned an unsupported output part; select a text-output model.', 'UNSUPPORTED_CONTENT');
      }
    }
    if (candidate.finishReason) finish = candidate.finishReason;
  }
  if (current >= 0) yield { type: 'block-end', index: current, block: blocks[current] };
  if (!finish) throw new LlmError('Gemini stream ended before a finish reason was received', 'TRANSPORT');
  if (usage) yield { type: 'usage', usage: {
    inputTokens: (usage.promptTokenCount ?? 0) - (usage.cachedContentTokenCount ?? 0),
    outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
    ...(usage.cachedContentTokenCount !== undefined ? { cacheReadTokens: usage.cachedContentTokenCount } : {}),
    ...(usage.thoughtsTokenCount !== undefined ? { reasoningTokens: usage.thoughtsTokenCount } : {}),
    ...(usage.totalTokenCount !== undefined ? { totalTokens: usage.totalTokenCount } : {}),
  } };
  let reason;
  if (finish === 'MAX_TOKENS') reason = { kind: 'max-tokens' };
  else if (finish === 'STOP') reason = hasTools ? { kind: 'tool-calls' } : blocks.some(block => block.type === 'text' && block.text)
    ? { kind: 'stop' } : { kind: 'error', failure: { code: 'EMPTY_RESPONSE', message: 'Gemini returned no answer or tool call' } };
  else reason = { kind: 'error', failure: {
    code: finish === 'MALFORMED_FUNCTION_CALL' ? 'INVALID_RESPONSE' : 'CONTENT_FILTER',
    message: `Gemini stopped: ${finish}`,
  } };
  yield { type: 'finish', reason, replayState: { response: {
    kind: 'gemini-native', version: 1, ...(modelVersion ? { modelVersion } : {}),
  }, blocks: replay } };
}

function sdkError(error, signal) {
  if (error instanceof LlmError) return error;
  if (signal?.aborted) return new LlmError('Gemini request cancelled', 'ABORTED', { cause: error });
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return new LlmError('Gemini request timed out', 'TIMEOUT', { cause: error });
  if (error instanceof ApiError) {
    const status = error.status;
    const code = isContextWindowExceededError(error.message) ? 'CONTEXT_WINDOW_EXCEEDED'
      : isQuotaExceededError(error.message) ? 'QUOTA'
      : status === 401 || status === 403 ? 'AUTH' : status === 429 ? 'RATE_LIMIT'
      : status >= 500 ? 'SERVER' : 'INVALID_REQUEST';
    return new LlmError(error.message, code, { status, cause: error });
  }
  return new LlmError(error.message, 'TRANSPORT', { cause: error });
}

export class GeminiAdapter extends LlmAdapter {
  constructor({ options, resolveApiKey, services = () => ({}), fetch }) {
    super();
    this.options = options;
    this.resolveApiKey = resolveApiKey;
    this.services = services;
    this.fetch = fetch;
  }
  providerInfo(provider) { return { id: provider, name: 'Gemini' }; }
  providerRetryPolicy(provider) {
    if (provider !== PROVIDER) return undefined;
    return resolveQuotaRetryPolicy(this.options().quotaRetry);
  }
  async listModels(provider) {
    const config = this.options();
    return config.models.map(model => modelInfo(provider, model.id, config));
  }
  async resolveModel(provider, model) { return modelInfo(provider, model, this.options()); }
  async prepareCall(provider, model) {
    const config = this.options();
    return { model: modelInfo(provider, model, config), stream: options => this.streamWithConfig(options, config) };
  }
  stream(options) { return this.streamWithConfig(options, this.options()); }
  async *streamWithConfig(options, config) {
    const consumer = new AbortController();
    const signal = options.signal ? AbortSignal.any([options.signal, consumer.signal]) : consumer.signal;
    try {
      const apiKey = await this.resolveApiKey(config);
      const request = await toRequest({ ...options, signal }, config, this.services());
      const client = createClient(config, apiKey, this.fetch);
      yield* toChunks(await client.models.generateContentStream(request), options);
    } catch (error) {
      throw sdkError(error, options.signal);
    } finally {
      consumer.abort();
    }
  }
  async discover(request, signal) {
    const config = this.options();
    const apiKey = request.apiKey ?? await this.resolveApiKey(config);
    const client = createClient({ ...config, baseURL: request.baseURL || config.baseURL }, apiKey, this.fetch);
    const models = [];
    try {
      const pages = await client.models.list({ config: { pageSize: 1000, abortSignal: signal } });
      for await (const model of pages) {
        if (!model.supportedActions?.includes('generateContent')) continue;
        const id = model.name.replace(/^models\//, '');
        // This route produces text. Other Gemini products use different output contracts.
        if (/embedding|image|tts|live|audio|robotics|computer-use/i.test(id)) continue;
        models.push({ id, name: model.displayName ?? id, contextWindow: model.inputTokenLimit,
          maxTokens: Math.min(model.outputTokenLimit ?? 65536, 65536), inputModalities: ['text', 'image'] });
      }
      return models;
    } catch (error) { throw sdkError(error, signal); }
  }
}
