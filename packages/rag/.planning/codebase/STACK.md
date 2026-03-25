# Technology Stack

**Analysis Date:** 2026-03-25

## Languages

**Primary:**
- TypeScript 5.3.3 - All application code (`index.ts`)
- Target: ES2022
- Module: ESNext

**Secondary:**
- Markdown - Documentation storage (`docs/documentation.md`)

## Runtime

**Environment:**
- Node.js v24.12.0

**Package Manager:**
- pnpm 10.26.2
- Workspace: Part of monorepo (`ailab` root)
- Lockfile: Present at monorepo root (`../../pnpm-lock.yaml`)

## Frameworks

**Core:**
- None - Pure TypeScript implementation

**Development:**
- tsx - TypeScript execution for development (`pnpm dev` runs `tsx watch index.ts`)

**Build:**
- TypeScript Compiler (tsc) - Compilation to `dist/` directory

**Linting:**
- ESLint 8.56.0 with TypeScript support
- `@typescript-eslint/eslint-plugin` 7.0.1
- `@typescript-eslint/parser` 7.0.1

## Key Dependencies

**Critical:**
- `openai` ^6.32.0 - OpenAI API client for chat completions
- `dotenv` ^17.3.1 - Environment variable loading

**Dev Dependencies (from root):**
- `typescript` ^5.3.3 - TypeScript compiler
- `@types/node` ^20.11.16 - Node.js type definitions

**Built-in:**
- `fs/promises` - File system operations for reading documentation

## Configuration

**TypeScript:**
- Base config: `../../tsconfig.base.json`
- Package config: `tsconfig.json`
- Output directory: `./dist`
- Source directory: `./src` (though code is at root `index.ts`)

**Key Compiler Options:**
- `moduleResolution`: bundler
- `strict`: true
- `esModuleInterop`: true
- `declaration`: true (generates .d.ts files)
- `sourceMap`: true

**Environment:**
- `.env` file at package root
- Variables prefixed with `MAAS_*` for Model-as-a-Service provider

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm package manager

**Production:**
- Node.js runtime
- Environment variables configured
- Documentation file at `./docs/documentation.md`

---

*Stack analysis: 2026-03-25*
