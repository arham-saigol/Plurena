Use the following models:

1. Minimax M3:
- Vision: Yes
- Primary: Opencode Go (minimax-m3)
- Fallback: Openrouter (minimax/minimax-m3)

2. GLM 5.2:
- Vision: No
- Primary: Opencode Go (glm-5.2)
- Fallback: Openrouter (z-ai/glm-5.2)

3. Deepseek V4 Pro:
- Vision: No
- Primary: Opencode Go (deepseek-v4-pro)
- Fallback: Openrouter (deepseek/deepseek-v4-pro)

4. Deepseek V4 Flash:
- Vision: No
- Primary: Opencode Go (deepseek-v4-flash)
- Fallback: Openrouter (deepseek/deepseek-v4-flash)

5. Kimi K2.6
- Vision: Yes
- Primary: Opencode Go (kimi-k2.6)
- Fallback: Openrouter (moonshotai/kimi-k2.6)

6. Kimi K2.7 Code 
- Vision: Yes 
- Primary: Opencode Go (kimi-k2.7-code)
- Fallback: Openrouter (moonshotai/kimi-k2.7-code)

7. Qwen3.7 Plus
- Vision: Yes
- Primary: Opencode Go (qwen3.7-plus)
- Fallback: Openrouter (qwen/qwen3.7-plus)

8. MiMo V2.5
- Vision: Yes
- Primary: Opencode Go (mimo-v2.5)
- Fallback: Openrouter (xiaomi/mimo-v2.5)

9. Hy3 
- Vision: No
- Primary: Openrouter (tencent/hy3:free)
- Fallback: Openrouter (tencent/hy3)

10. Step 3.7 Flash
- Vision: Yes
- Primary: Openrouter (stepfun/step-3.7-flash)
- Fallback: None

- If both the primary and fallback fail for a model, use another model instead rather than failing. 
- For comparisons that include images, use a vision model as non-vision models won't be able to see images. 