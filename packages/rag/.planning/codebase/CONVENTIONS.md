# Coding Conventions

**Analysis Date:** 2026-03-25

## Naming Patterns

**Files:**
- Entry point: `index.ts` (lowercase, single word)
- Source files: Not yet established (no `src/` directory currently exists)
- Configuration: `tsconfig.json` (kebab-case)

**Functions:**
- camelCase for function names
  - Example: `answerQuestion(question: string)` in `index.ts`
- Arrow functions preferred for async operations
  - Example: `const answerQuestion = async (question: string) => { ... }`

**Variables:**
- camelCase for local variables
  - Example: `const openai = new OpenAI({ ... })`
- UPPER_SNAKE_CASE for environment variables
  - Example: `process.env.MAAS_BASE_URL_OPENAI`

**Types:**
- PascalCase for class names
  - Example: `OpenAI` (from imported library)
- No custom type definitions observed yet

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc` or `biome.json`)
- 2-space indentation observed in `index.ts`
- No trailing semicolons enforced (some lines have them, some don't - inconsistent)

**Linting:**
- ESLint configured in `package.json` scripts: `"lint": "eslint src/"`
- No ESLint config file detected (likely using default or inherited from parent)
- Lint target is `src/` directory, but no `src/` directory exists in the project

## Import Organization

**Order:**
1. External library imports (e.g., `openai`, `dotenv`)
2. Node.js built-in modules (e.g., `fs/promises`)

**Pattern:**
```typescript
import { OpenAI } from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";
```

**Path Aliases:**
- No path aliases configured
- Relative imports not yet used (project is flat structure)

## TypeScript Usage Patterns

**Module System:**
- ESM modules: `"type": "module"` in `package.json`
- File extensions not required in imports (TypeScript handles this)

**Type Inference:**
- Implicit return types on functions
- No explicit type annotations on variables (relies on inference)

**Async/Await:**
- Used consistently for asynchronous operations
- Top-level await used in `index.ts`: `const answer = await answerQuestion(...)`

**Configuration:**
- Extends base config: `extends: "../../tsconfig.base.json"`
- Output directory: `./dist`
- Root directory: `./src` (but no `src/` directory exists yet)

## Error Handling

**Patterns:**
- Try-catch blocks for async operations
- Error logged to console, returns `null` on failure
- Example:
```typescript
try {
  // ... async operation
} catch (error) {
  console.error(error);
  return null;
}
```

## Logging

**Framework:** Console-only (no structured logging library)

**Patterns:**
- `console.log()` for general output
- `console.error()` for errors
- `console.warn()` for warnings (e.g., document size check)

## Comments

**When to Comment:**
- Minimal commenting observed
- Commented-out code present: `// answerQuestion("Hello, world!");`

**Documentation:**
- No JSDoc/TSDoc comments observed
- No inline documentation for functions

## Function Design

**Size:**
- Single function in `index.ts` is moderately sized (~30 lines)
- Mix of concerns in one function (file reading, API call, error handling)

**Parameters:**
- Single parameter functions preferred
- Descriptive parameter names

**Return Values:**
- Returns `Promise<string | null>` implicitly
- `null` used as error sentinel

## Module Design

**Exports:**
- No explicit exports in current code
- Everything is local to the module

**Barrel Files:**
- Not used (project too small)

## Environment Configuration

**Pattern:**
- `dotenv` loaded at module initialization
- Environment variables accessed via `process.env`
- No validation of required environment variables

---

*Convention analysis: 2026-03-25*
