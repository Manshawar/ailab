# Architecture

**Analysis Date:** 2026-03-25

## Pattern Overview

**Overall:** Simple Script Pattern

**Key Characteristics:**
- Single-file application with no module decomposition
- Direct integration with OpenAI API for LLM inference
- File-based document retrieval (no vector database)
- Synchronous execution flow with top-level await

## Layers

**Application Layer:**
- Purpose: Entry point and orchestration
- Location: `/Volumes/other/ai/ailab/packages/rag/index.ts`
- Contains: Main execution logic, OpenAI client initialization, question answering function
- Depends on: OpenAI SDK, dotenv, Node.js fs/promises
- Used by: Direct execution via `tsx` or Node.js

**Data Layer:**
- Purpose: Document storage for retrieval
- Location: `/Volumes/other/ai/ailab/packages/rag/docs/documentation.md`
- Contains: Plain text documentation (novel content)
- Access method: Direct file read via `fs.readFile()`

**External Service Layer:**
- Purpose: LLM inference via OpenAI-compatible API
- Provider: OpenAI SDK with configurable baseURL
- Authentication: Environment-based API key

## Data Flow

**Question Answering Flow:**

1. **Initialization**
   - Load environment variables from `.env` via `dotenv.config()`
   - Initialize OpenAI client with `baseURL` and `apiKey` from environment

2. **Document Retrieval**
   - Read entire documentation file: `./docs/documentation.md`
   - Check document size against 400,000 character threshold
   - Warn if document may exceed context window

3. **Prompt Construction**
   - System prompt: "You are a helpful assistant that answers questions based on the provided documentation.."
   - User prompt: Combines full document text with user question

4. **LLM Inference**
   - Call `openai.chat.completions.create()` with configured model
   - Pass messages array with system and user roles

5. **Response Handling**
   - Extract answer from `response.choices[0].message.content`
   - Return answer or `null` on error

**State Management:**
- No persistent state between invocations
- Each execution is independent
- Environment variables loaded fresh on each run

## Key Abstractions

**OpenAI Client:**
- Purpose: Interface to LLM service
- Configuration: Environment-driven (`MAAS_BASE_URL_OPENAI`, `MAAS_API_KEY`, `MAAS_MODEL_ID`)
- Pattern: Singleton instance created at module load time

**Document Context:**
- Purpose: Knowledge base for RAG
- Format: Plain text file
- Loading: Full file read into memory as single string
- Limitation: No chunking or embedding-based retrieval

**Question Answerer:**
- Purpose: Core RAG function
- Function: `answerQuestion(question: string)`
- Returns: `Promise<string | null>`
- Error handling: Try-catch with console.error and null return

## Entry Points

**Main Entry Point:**
- Location: `/Volumes/other/ai/ailab/packages/rag/index.ts`
- Triggers: Direct execution (`tsx index.ts` or `node index.ts`)
- Responsibilities:
  - Initialize OpenAI client
  - Define `answerQuestion` function
  - Execute hardcoded question: "这本小说叫什么名字"
  - Log answer to console

**Execution Flow:**
1. Module loads and executes top-level code
2. Environment configuration loaded
3. OpenAI client instantiated
4. `answerQuestion` invoked with hardcoded question
5. Result logged and process exits

## Error Handling

**Strategy:** Basic try-catch with graceful degradation

**Patterns:**
- Wrap LLM call and file operations in try-catch block
- Log errors to console with `console.error()`
- Return `null` on failure to allow caller to handle
- No retry logic or circuit breaker pattern

**Document Size Warning:**
- Check if context exceeds 400,000 characters
- Warn but proceed anyway (non-blocking)

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.log()` and `console.warn()` for operational output
- Debug: Direct environment variable logging at startup

**Configuration:**
- Approach: Environment variables via `.env` file
- Required vars: `MAAS_BASE_URL_OPENAI`, `MAAS_API_KEY`, `MAAS_MODEL_ID`

**Authentication:**
- Approach: API key passed via OpenAI client configuration
- Source: Environment variable `MAAS_API_KEY`

---

*Architecture analysis: 2026-03-25*
