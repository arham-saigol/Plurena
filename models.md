# Model Routing

1. MiniMax M3

- Vision: Yes
- Primary: OpenCode Go (`minimax-m3`)
- Fallback: Vercel AI Gateway (`minimax/minimax-m3`)

2. GLM 5.2

- Vision: No
- Primary: OpenCode Go (`glm-5.2`)
- Fallback: Vercel AI Gateway (`zai/glm-5.2`)
- Roles: Persona/respondent generation and synthesis

3. DeepSeek V4 Pro

- Vision: No
- Primary: OpenCode Go (`deepseek-v4-pro`)
- Fallback: Vercel AI Gateway (`deepseek/deepseek-v4-pro`)

4. DeepSeek V4 Flash

- Vision: No
- Primary: OpenCode Go (`deepseek-v4-flash`)
- Fallback: Vercel AI Gateway (`deepseek/deepseek-v4-flash`)

5. Kimi K2.6

- Vision: Yes
- Primary: OpenCode Go (`kimi-k2.6`)
- Fallback: Vercel AI Gateway (`moonshotai/kimi-k2.6`)

6. Kimi K2.7 Code

- Vision: Yes
- Primary: OpenCode Go (`kimi-k2.7-code`)
- Fallback: Vercel AI Gateway (`moonshotai/kimi-k2.7-code`)

7. Qwen3.7 Plus

- Vision: Yes
- Primary: OpenCode Go (`qwen3.7-plus`)
- Fallback: Vercel AI Gateway (`alibaba/qwen3.7-plus`)

8. MiMo V2.5

- Vision: Yes
- Primary: OpenCode Go (`mimo-v2.5`)
- Fallback: Vercel AI Gateway (`xiaomi/mimo-v2.5`)

9. Hy3

- Vision: No
- Primary: OpenCode Go (`hy3`)
- Fallback: Vercel AI Gateway (`tencent/hy3`)

10. Step 3.7 Flash

- Vision: Yes
- Primary: StepFun (`step-3.7-flash`)
- Fallback: Vercel AI Gateway (`stepfun/step-3.7-flash`)

11. Laguna S 2.1

- Vision: No
- Primary: Vercel AI Gateway (`poolside/laguna-s-2.1-free`)
- Fallback: Vercel AI Gateway (`poolside/laguna-s-2.1`)

If both routes for a model fail, routing continues through other eligible models. Image comparisons only use vision-capable models. OpenCode Go routes use the provider-specific OpenAI-compatible or Anthropic-compatible protocol configured in the application.
