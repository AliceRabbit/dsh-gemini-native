import z from '@deepseek-ai/schemastery';
import { createShieldSection } from './payload.js';

export const name = 'gemini-routing-shield';
export const inject = ['systemPrompt'];
export const Config = z.object({
  mode: z.union(['hybrid', 'probe-only', 'fortress', 'minimal']).default('hybrid').volatile(),
}).i18n({
  zh: { mode: { $description: '防护强度', $value: ['均衡（默认）', '轻量', '强化', '极简'] } },
  en: { mode: { $description: 'Shield strength', $value: ['Balanced (default)', 'Light', 'Strong', 'Minimal'] } },
});

export function apply(ctx, config) {
  ctx.inject(['settings'], child => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)));
  ctx.systemPrompt.section({
    name: 'gemini-native:routing-shield',
    order: 10300,
    interpolate: false,
    text: ({ modelSelection }) => modelSelection?.provider === 'gemini-native' ? createShieldSection(config.mode.get()) : '',
  });
}
