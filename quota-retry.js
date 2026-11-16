import z from '@deepseek-ai/schemastery';
import { resolveRetryPolicy } from '@deepseek-ai/dsh-llm';

export const DEFAULT_QUOTA_RETRY = Object.freeze({
  enabled: true,
  maxRetries: 5,
  initialDelayMs: 5000,
  maxDelayMs: 30000,
});

const PATH = 'gemini-native.quotaRetry';
const NORMAL_POLICY = resolveRetryPolicy(undefined, PATH);
const QUOTA_CODES = [...new Set([...NORMAL_POLICY.retryableCodes, 'QUOTA'])];

// A bounded, provider-owned policy. The SDK still makes exactly one attempt;
// Harness owns the durable retry events, backoff, cancellation and step budget.
export const QuotaRetrySchema = z.transform(z.object({
  enabled: z.boolean().default(DEFAULT_QUOTA_RETRY.enabled),
  maxRetries: z.number().step(1).min(1).max(20).default(DEFAULT_QUOTA_RETRY.maxRetries),
  initialDelayMs: z.number().step(1).min(1000).max(300000).default(DEFAULT_QUOTA_RETRY.initialDelayMs),
  maxDelayMs: z.number().step(1).min(1000).max(300000).default(DEFAULT_QUOTA_RETRY.maxDelayMs),
}), value => {
  if (value.initialDelayMs > value.maxDelayMs) {
    throw new Error(`${PATH}: maxDelayMs must be greater than or equal to initialDelayMs`);
  }
  return value;
}, true).default(DEFAULT_QUOTA_RETRY);

export function resolveQuotaRetryPolicy(input) {
  const settings = QuotaRetrySchema(input);
  if (!settings.enabled) return NORMAL_POLICY;
  return resolveRetryPolicy({
    mode: 'normal',
    maxRetries: settings.maxRetries,
    retryableCodes: QUOTA_CODES,
    backoff: {
      initialDelayMs: settings.initialDelayMs,
      maxDelayMs: settings.maxDelayMs,
      jitterRatio: NORMAL_POLICY.jitterRatio,
    },
  }, PATH);
}
