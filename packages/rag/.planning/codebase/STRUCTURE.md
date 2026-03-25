# Codebase Structure

**Analysis Date:** 2026-03-25

## Directory Layout

```
/Volumes/other/ai/ailab/packages/rag/
├── index.ts              # Main entry point and application logic
├── package.json          # Package manifest and scripts
├── tsconfig.json         # TypeScript configuration (extends base)
├── .env                  # Environment variables (not committed)
├── docs/                 # Document storage for RAG context
│   └── documentation.md  # Source documentation (novel content)
├── .planning/            # Planning documentation
│   └── codebase/         # Codebase analysis documents
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md
└── node_modules/         # Dependencies
```

## Directory Purposes

**Root Directory:**
- Purpose: Application root containing entry point and configuration
- Contains: Single-file application, package config, TypeScript config
- Key files: `index.ts`, `package.json`, `tsconfig.json`

**docs/:**
- Purpose: Document storage for retrieval context
- Contains: Plain text documentation files
- Key files: `documentation.md` - Source material for RAG queries
- Note: Currently contains novel content used as knowledge base

**.planning/codebase/:**
- Purpose: Codebase documentation and analysis
- Contains: Architecture and structure documentation
- Generated: No (manually maintained)
- Committed: Yes

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (via `npm install` or `pnpm install`)
- Committed: No (in .gitignore)

## Key File Locations

**Entry Points:**
- `/Volumes/other/ai/ailab/packages/rag/index.ts`: Main application entry point

**Configuration:**
- `/Volumes/other/ai/ailab/packages/rag/package.json`: npm scripts and dependencies
- `/Volumes/other/ai/ailab/packages/rag/tsconfig.json`: TypeScript compiler options (extends `../../tsconfig.base.json`)
- `/Volumes/other/ai/ailab/packages/rag/.env`: Runtime environment variables

**Core Logic:**
- `/Volumes/other/ai/ailab/packages/rag/index.ts`: Contains all application logic including:
  - OpenAI client initialization
  - `answerQuestion()` function
  - Main execution flow

**Data:**
- `/Volumes/other/ai/ailab/packages/rag/docs/documentation.md`: Source documentation for RAG context

## Naming Conventions

**Files:**
- Entry point: `index.ts` (standard Node.js convention)
- Documentation: `documentation.md` (descriptive)
- Config files: Standard names (`package.json`, `tsconfig.json`)

**Directories:**
- Documentation storage: `docs/` (conventional)
- Planning docs: `.planning/` (hidden prefix for meta files)

## Where to Add New Code

**New Feature:**
- Primary code: `/Volumes/other/ai/ailab/packages/rag/index.ts` (current single-file approach)
- Recommended: Create `src/` directory and split into modules if complexity grows

**New RAG Functions:**
- Add to `/Volumes/other/ai/ailab/packages/rag/index.ts` or
- Create `/Volumes/other/ai/ailab/packages/rag/src/rag/` for multiple retrieval strategies

**New Document Sources:**
- Add markdown files to `/Volumes/other/ai/ailab/packages/rag/docs/`
- Update file reading logic in `index.ts` to select appropriate document

**Utilities:**
- Current: Add to `/Volumes/other/ai/ailab/packages/rag/index.ts`
- Recommended: Create `/Volumes/other/ai/ailab/packages/rag/src/utils/` for shared helpers

**Configuration:**
- Environment variables: Add to `.env` file
- TypeScript: Modify `/Volumes/other/ai/ailab/packages/rag/tsconfig.json`

## Special Directories

**docs/:**
- Purpose: Knowledge base documents for RAG
- Format: Plain text/markdown files
- Access: Read via `fs.readFile()` in application code
- Size consideration: Large files may exceed LLM context window (400K char check in place)

**.planning/:**
- Purpose: Project planning and documentation
- Contains: Codebase analysis, architecture docs
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-25*
