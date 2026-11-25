import z from '@deepseek-ai/schemastery';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { LlmError } from '@deepseek-ai/dsh-llm';
import { BASE_URL, DEFAULT_MODELS, GeminiAdapter, NAMESPACE, PROVIDER } from './gemini.js';
import { QuotaRetrySchema, resolveQuotaRetryPolicy } from './quota-retry.js';

export const name = 'llm-gemini-native';
export const inject = ['llm'];
const reasoningEffort = z.union(['minimal', 'low', 'medium', 'high', 'xhigh']);
const model = z.object({
  id: z.string().required(), name: z.string(),
  contextWindow: z.number().step(1).min(1), maxTokens: z.number().step(1).min(1),
  inputModalities: z.array(z.union(['text', 'image'])).default(undefined),
  thinking: z.union(['none', 'level', 'budget']),
  reasoningEfforts: z.array(reasoningEffort).default(undefined),
  defaultReasoning: reasoningEffort,
  thinkingBudgets: z.dict(z.number().step(1).min(0)),
});
export const Config = z.object({
  apiKeyEnv: z.string().role('credential-ref').default('GEMINI_API_KEY').volatile(),
  baseURL: z.string().default(BASE_URL).volatile(),
  apiVersion: z.string().default('v1beta').volatile(),
  models: z.array(model).default(DEFAULT_MODELS).volatile(),
  timeoutMs: z.number().step(1).min(1).default(900000).volatile(),
  headers: z.dict(z.string()).default({}).volatile(),
  quotaRetry: QuotaRetrySchema.volatile(),
});
const CONFIG_KEYS = Object.keys(Config.dict);

export function apply(ctx, config) {
  const options = () => Object.fromEntries(CONFIG_KEYS.map(key => [key, config[key].get()]));
  const adapter = new GeminiAdapter({
    options,
    resolveApiKey: async config => {
      const credentials = ctx.get('credentials');
      const hit = credentials ? await credentials.resolve(config.apiKeyEnv) : launchEnvironmentOf(ctx).get(config.apiKeyEnv);
      if (!hit) throw new LlmError(`Configure the Gemini API key in Settings → Models → Gemini (${config.apiKeyEnv})`, 'MISSING_CREDENTIAL');
      return hit.value;
    },
    services: {
      get attachments() { return ctx.get('attachments'); },
      processPath: path => ctx.get('fs')?.processPathFromHostPath(path),
    },
  });
  const settingsNs = ctx.fiber.entry?.options.id ?? NAMESPACE;
  const registration = ctx.llm.registerAdapter([PROVIDER], adapter);
  let registeredPolicy = JSON.stringify(resolveQuotaRetryPolicy(config.quotaRetry.get()));
  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER, displayName: 'Gemini', settingsNs, settingsPath: [],
    defaultBaseURL: BASE_URL, nativeAuth: { env: ['GEMINI_API_KEY'], oauth: false },
  }]);
  ctx.llm.registerModelDiscovery(settingsNs, (request, signal) => adapter.discover(request, signal));
  ctx.inject(['settings'], child => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)));
  ctx.on('loader/volatile-update', () => {
    // Retry policies are captured by the registry, not read on every request.
    // Replace atomically; merely emitting adapters-updated would leave a stale policy.
    const nextPolicy = JSON.stringify(resolveQuotaRetryPolicy(config.quotaRetry.get()));
    if (nextPolicy !== registeredPolicy) {
      registration.replace([PROVIDER]);
      registeredPolicy = nextPolicy;
    } else {
      ctx.emit('llm/adapters-updated');
    }
  });
}
