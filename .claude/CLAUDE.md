# conventional-branch — Claude Code Instructions

## Project Overview

A VSCode extension that guides users through creating conventionally-named Git branches via a step-by-step QuickPick wizard.

**Default branch format:** `{user}:{scope}/{type}/{service}/{description}`
**Example output:** `ty:api/feat/order-service/add-rate-limiter`

## Architecture

```
src/
├── extension.ts          # Activate/deactivate, register 3 commands
├── config/
│   ├── defaults.ts       # Default types list, globalState key constants
│   └── settings.ts       # getConfig() reads all settings from VSCode workspace config
├── wizard/
│   ├── types.ts          # WizardContext, WizardStep, BACK_LABEL, SKIP_LABEL
│   ├── runner.ts         # Orchestrates steps, parses template, handles back-navigation
│   └── steps/
│       ├── inputUser.ts
│       ├── selectType.ts
│       ├── selectScope.ts
│       ├── selectService.ts
│       └── inputDescription.ts
├── branch/
│   ├── formatter.ts      # parseTemplate(), formatBranch(), previewBranch()
│   ├── sanitizer.ts      # slugify(), validateBranchName(), sanitizeBranchName()
│   ├── creator.ts        # createBranch() — VSCode Git API, duplicate detection, auto-push
│   └── cleanup.ts        # Multi-select branch deletion + fetch --prune
└── utils/
    └── git.ts            # getGitAPI(), pickRepository(), branchExists()
test/
├── formatter.test.ts     # 18 tests
└── sanitizer.test.ts     # 37 tests
```

## Commands

| Command ID | Title | Trigger |
|---|---|---|
| `conventionalBranch.create` | Create Conventional Branch | Command Palette, SCM title bar icon |
| `conventionalBranch.cleanup` | Cleanup Local Branches | Command Palette |
| `conventionalBranch.clearUserCache` | Clear User Cache | Command Palette |

## Build & Test

```bash
npm run build        # esbuild → dist/extension.js
npm run watch        # esbuild watch mode
npm test             # vitest run (55 tests)
npm run lint         # eslint src
npm run vscode:prepublish  # production build
```

## Key Design Decisions

- **Steps derived from template**: `parseTemplate(format)` extracts `{token}` names in order; the runner only shows steps for tokens present in the template.
- **Back-navigation**: Runner maintains a history stack of step indices; each QuickPick/InputBox has a "← Back" item.
- **MRU sorting**: `globalState` tracks recently used types/scopes/services; surfaced at the top of QuickPick lists.
- **User cache**: First-use prompts for user prefix, stored in `globalState`. `config.user` always takes precedence.
- **Git API**: Uses `vscode.extensions.getExtension('vscode.git').exports.getAPI(1)` — no shell exec.
- **Colon allowed in branch names**: The default format uses `:` as a structural separator; Git allows it in local branch names, so `validateBranchName` does not reject it.

## Configuration Namespace

All settings are under `conventionalBranch.*`. Read via `vscode.workspace.getConfiguration('conventionalBranch')`. Workspace-level `.vscode/settings.json` overrides user settings automatically.

## Tech Stack

- TypeScript (strict mode, ES2020, Node16 modules)
- esbuild for bundling
- vitest for unit tests
- ESLint + Prettier
- Min VSCode version: 1.85+
