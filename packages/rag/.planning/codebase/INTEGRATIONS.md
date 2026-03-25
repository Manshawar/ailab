# External Integrations

**Analysis Date:** 2026-03-25

## APIs & External Services

**LLM Provider (Model-as-a-Service):**
- Service: MAAS (Model-as-a-Service) provider with OpenAI-compatible API
- SDK: `openai` npm package (^6.32.0)
- Client initialization: `/Volumes/other/ai/ailab/packages/rag/index.ts` (lines 6-9)
- Usage: Chat completions API for RAG question answering

**API Configuration:**
- Base URL: Loaded from `MAAS_BASE_URL_OPENAI` environment variable
- Authentication: API key via `MAAS_API_KEY` environment variable
- Model ID: Specified via `MAAS_MODEL_ID` environment variable

## Data Storage

**File System:**
- Documentation source: `./docs/documentation.md`
- Read via: `fs/promises` module
- Encoding: UTF-8
- Size limit: 400,000 characters (warning threshold in code)

**Databases:**
- None - No database integration detected

**File Storage:**
- Local filesystem only
- Documentation stored as Markdown file

**Caching:**
- None - No caching layer detected

## Authentication & Identity

**API Authentication:**
- Method: API key via environment variables
- No user authentication or session management

## Monitoring & Observability

**Error Tracking:**
- None - Console.error used for basic error logging

**Logging:**
- Console-based logging only
- Error logging: `console.error(error)` in catch blocks
- Output logging: `console.log(answer)` for responses

## CI/CD & Deployment

**Hosting:**
- Not specified - Local development focus

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- `MAAS_BASE_URL_OPENAI` - API base URL for OpenAI-compatible endpoint
- `MAAS_API_KEY` - API authentication key
- `MAAS_MODEL_ID` - Model identifier for completions
- `MAAS_PROVIDER` - Provider name
- `MAAS_BASE_URL` - Base URL (alternate)
- `MAAS_API` - API endpoint
- `MAAS_MODEL_NAME` - Model name

**Secrets location:**
- `.env` file at package root (not committed to git)
- Loaded via `dotenv` package at runtime

## Data Flow

**RAG Pipeline:**
1. Load documentation from `./docs/documentation.md` via `fs.readFile`
2. Check document size (warn if > 400,000 chars)
3. Send to LLM with context + user question
4. Return generated response

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints

**Outgoing:**
- OpenAI chat completions API call
- Endpoint: `${MAAS_BASE_URL_OPENAI}/chat/completions`

## Dependencies at Risk

**`openai` package:**
- Version: ^6.32.0
- Risk: Major version changes may break API compatibility
- Mitigation: Lockfile present via pnpm

**`dotenv` package:**
- Version: ^17.3.1
- Risk: Environment loading dependency
- Mitigation: Standard package, widely used

---

*Integration audit: 2026-03-25*
