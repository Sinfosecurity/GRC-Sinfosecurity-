# AI architecture

`AIProvider` behavior is in `backend/src/ai/aiProvider.ts`.

- Configured via `OPENAI_API_KEY` or `AI_API_KEY` (OpenAI-compatible `AI_BASE_URL`)
- Features: summarization, weak-control identification, evidence/policy/contract analysis, finding drafts, remediation, executive summary, portfolio query
- Context is truncated and redacted for secrets
- Operations log organization, feature, provider, model, success, latency — not full prompts
- If unconfigured: `{ status: "NOT_CONFIGURED" }`
- AI does not calculate official risk scores
