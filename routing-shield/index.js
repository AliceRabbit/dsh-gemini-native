import z from '@deepseek-ai/schemastery';
import { createShieldSection } from './payload.js';

export const name = 'gemini-routing-shield';
export const inject = ['systemPrompt'];
export const Config = z.object({
  mode: z.union(['hybrid', 'probe-only', 'fortress']).default('hybrid').volatile(),
}).i18n({
  zh: { mode: { $description: '防护强度', $value: ['均衡 · 约 5,000 字符屏障（默认）', '轻量 · 约 220 字符屏障', '强化 · 约 6,400 字符屏障'] } },
  en: { mode: { $description: 'Shield strength', $value: ['Balanced · ~5,000 barrier characters (default)', 'Light · ~220 barrier characters', 'Strong · ~6,400 barrier characters'] } },
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
