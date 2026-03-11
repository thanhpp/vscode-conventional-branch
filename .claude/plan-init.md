# VSCode Conventional Branch — Extension Plan

## 1. Overview

A VSCode extension that guides users through creating conventionally-named Git branches via a step-by-step QuickPick wizard (same UX pattern as [vscode-conventional-commits](https://github.com/vivaxy/vscode-conventional-commits)).

**Output format (default):**

```
{user}:{scope}/{type}/{service}/{description}
```

**Example:** `ty:api/feat/order-service/add-rate-limiter`

The format is **fully user-configurable** via settings — variables act as tokens in a template string.

---

## 2. Architecture

```
conventional-branch/
├── package.json              # Extension manifest, commands, settings schema
├── tsconfig.json
├── src/
│   ├── extension.ts          # Activate/deactivate, register commands
│   ├── wizard/
│   │   ├── runner.ts         # Orchestrates step sequence, collects answers
│   │   ├── steps/
│   │   │   ├── selectType.ts
│   │   │   ├── selectScope.ts
│   │   │   ├── selectService.ts
│   │   │   ├── inputDescription.ts
│   │   │   └── inputUser.ts
│   │   └── types.ts          # WizardStep interface, StepResult
│   ├── config/
│   │   ├── settings.ts       # Read/resolve VS Code settings
│   │   └── defaults.ts       # Default types, scopes, services
│   ├── branch/
│   │   ├── formatter.ts      # Template interpolation → branch name
│   │   ├── sanitizer.ts      # Slugify, validate git branch name
│   │   ├── creator.ts        # git checkout -b via VSCode Git API
│   │   └── cleanup.ts        # Delete local branches + fetch --prune
│   └── utils/
│       └── git.ts            # Git extension API wrapper
└── test/
    ├── formatter.test.ts
    └── sanitizer.test.ts
```

### Key design decisions

- **Wizard runner pattern** — Each step is a standalone function returning `StepResult | undefined` (undefined = user cancelled). The runner iterates steps sequentially and supports back-navigation.
- **Template-based format** — Branch format is a string like `{user}:{scope}/{type}/{service}/{description}`. The formatter interpolates collected values. Users swap/remove/reorder tokens freely.
- **Steps derived from template** — The wizard parses the format template to determine which steps to show and in what order. If `{scope}` is removed from the template, no scope step appears.
- **VSCode Git Extension API** — Use the built-in `vscode.extensions.getExtension('vscode.git')` to create branches programmatically (no shell exec needed).

---

## 3. Configuration Schema (`package.json` contributes.configuration)

> **All config is read from VSCode settings** via `vscode.workspace.getConfiguration('conventionalBranch')`. This means users configure the extension through Settings UI, `settings.json`, or workspace-level `.vscode/settings.json`. The extension never maintains its own config file.

| Setting                                   | Type      | Default                                                                                         | Description                                                                                                                                                                                        |
| ----------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conventionalBranch.format`               | `string`  | `{user}:{scope}/{type}/{service}/{description}`                                                 | Branch name template. Separators (`:`, `/`, `-`, etc.) are literal chars in the string — users define their own format freely. Tokens: `{user}`, `{type}`, `{scope}`, `{service}`, `{description}` |
| `conventionalBranch.user`                 | `string`  | `""`                                                                                            | Default user prefix. If empty, wizard prompts for it on first use and caches in `globalState`.                                                                                                     |
| `conventionalBranch.types`                | `array`   | `["feat","fix","hotfix","chore","refactor","docs","test","ci","perf","style","build","revert"]` | Selectable branch types                                                                                                                                                                            |
| `conventionalBranch.scopes`               | `array`   | `[]`                                                                                            | Selectable scopes. Empty = free-text input.                                                                                                                                                        |
| `conventionalBranch.services`             | `array`   | `[]`                                                                                            | Selectable services/components. Empty = free-text input.                                                                                                                                           |
| `conventionalBranch.scopeRequired`        | `boolean` | `false`                                                                                         | If false, scope step shows "(skip)" option                                                                                                                                                         |
| `conventionalBranch.descriptionSeparator` | `string`  | `"-"`                                                                                           | Word separator within the description slug (e.g., `add rate limiter` → `add-rate-limiter`)                                                                                                         |
| `conventionalBranch.lowercaseOnly`        | `boolean` | `true`                                                                                          | Force all segments lowercase                                                                                                                                                                       |
| `conventionalBranch.maxLength`            | `number`  | `80`                                                                                            | Max branch name length (0 = unlimited)                                                                                                                                                             |
| `conventionalBranch.autoPush`             | `boolean` | `false`                                                                                         | Push new branch to remote after creation                                                                                                                                                           |
| `conventionalBranch.baseBranch`           | `string`  | `""`                                                                                            | Base branch to create from (empty = current HEAD)                                                                                                                                                  |

### Workspace-level overrides

All settings support workspace-level config via `vscode.workspace.getConfiguration`, so teams can commit `.vscode/settings.json` with shared types/scopes/services per repo. User-level settings act as fallback defaults.

---

## 4. Wizard Flow (UI)

Modeled after Conventional Commits: sequential QuickPick/InputBox steps triggered via Command Palette or SCM title bar icon.

```
┌─────────────────────────────────────────────────────┐
│  Step 1: Select type                                │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🔍 Filter...                                │    │
│  │  feat      ─ A new feature                  │    │
│  │  fix       ─ A bug fix                      │    │
│  │  hotfix    ─ Critical production fix         │    │
│  │  chore     ─ Maintenance task                │    │
│  │  refactor  ─ Code restructuring              │    │
│  │  ...                                         │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Step 2: Select scope (optional)                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🔍 Filter or type custom scope...           │    │
│  │  (skip)                                      │    │
│  │  api                                         │    │
│  │  ui                                          │    │
│  │  infra                                       │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Step 3: Select service/component                   │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🔍 Filter or type custom service...         │    │
│  │  order-service                               │    │
│  │  matching-engine                             │    │
│  │  gateway                                     │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Step 4: Enter description                          │
│  ┌─────────────────────────────────────────────┐    │
│  │  add-rate-limiter                            │    │
│  └─────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────┤
│  Result: ty:api/feat/order-service/add-rate-limiter │
│  [✓ Branch created & checked out]                   │
└─────────────────────────────────────────────────────┘
```

**Back-navigation:** Pressing `Esc` on any step cancels the entire flow. A dedicated "← Back" item at the top of each QuickPick (step 2+) returns to the previous step.

**Preview:** A status bar item or QuickPick title shows the branch name being built in real-time: `Building: ty:api/feat/...`

---

## 5. Core Components

### 5.1 Template Engine (`formatter.ts`)

```typescript
// Parse template to extract ordered variable list
function parseTemplate(format: string): string[] {
  // "{user}:{scope}/{type}/{service}/{description}"
  // → ["user", "scope", "type", "service", "description"]
  return [...format.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

// Interpolate collected values into template
function formatBranch(
  format: string,
  values: Record<string, string>,
  options: { separator: string; lowercase: boolean; maxLength: number },
): string {
  let result = format;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(`{${key}}`, value);
  }
  // Collapse empty optionals: remove dangling/repeated separators
  // Handles any user-defined separator chars in the format string
  result = result.replace(/[/:_-]{2,}/g, (match) => match[0]); // collapse repeated separators
  result = result.replace(/^[/:_-]+|[/:_-]+$/g, ""); // trim leading/trailing separators
  if (options.lowercase) result = result.toLowerCase();
  if (options.maxLength > 0) result = result.slice(0, options.maxLength);
  return result;
}
```

### 5.2 Branch Sanitizer (`sanitizer.ts`)

- Replace spaces/special chars → separator (default `-`)
- Strip characters invalid in git refs (`~`, `^`, `:` except in user prefix, `[`, `\`, `..`, `@{`)
- Collapse repeated separators
- Trim leading/trailing separators per segment

### 5.3 Wizard Step Interface (`types.ts`)

```typescript
interface WizardContext {
  collected: Record<string, string>; // values gathered so far
  format: string; // current template
  config: ExtensionConfig;
}

interface WizardStep {
  variable: string; // template token this step fills
  run(ctx: WizardContext): Promise<string | undefined>;
  // returns value or undefined (cancelled)
}
```

### 5.4 Git Integration (`creator.ts`)

```typescript
async function createBranch(
  branchName: string,
  baseBranch?: string,
): Promise<void> {
  const gitExt = vscode.extensions.getExtension("vscode.git")!.exports;
  const repo = gitExt.getAPI(1).repositories[0];

  if (baseBranch) {
    await repo.checkout(baseBranch);
    await repo.pull();
  }
  await repo.createBranch(branchName, true); // true = checkout
}
```

---

## 6. Entry Points

| Trigger            | ID                           | Description                                               |
| ------------------ | ---------------------------- | --------------------------------------------------------- |
| Command Palette    | `conventionalBranch.create`  | Main wizard command                                       |
| Command Palette    | `conventionalBranch.cleanup` | Delete local branches + prune remotes                     |
| SCM title bar icon | `conventionalBranch.create`  | Git branch icon in Source Control view title              |
| Keyboard shortcut  | User-configurable            | Suggested default: `Ctrl+Shift+B` (if not conflicting)    |
| Status bar         | `conventionalBranch.create`  | Optional clickable status bar item showing current branch |

### `package.json` registration (key parts)

```jsonc
{
  "contributes": {
    "commands": [
      {
        "command": "conventionalBranch.create",
        "title": "Create Conventional Branch",
        "icon": "$(git-branch)",
      },
      {
        "command": "conventionalBranch.cleanup",
        "title": "Cleanup Local Branches",
        "icon": "$(trash)",
      },
    ],
    "menus": {
      "scm/title": [
        {
          "command": "conventionalBranch.create",
          "group": "navigation",
          "when": "scmProvider == git",
        },
      ],
    },
  },
}
```

---

## 7. Implementation Plan

> **This plan is structured for Claude Code to execute sequentially.** Each task includes acceptance criteria. Complete each phase fully before moving to the next.

### Phase 1 — MVP (core wizard + branch creation)

**1.1 Scaffold the extension project**

- Initialize with `yo code` (TypeScript, esbuild bundler)
- Configure `tsconfig.json` with `strict: true`, target `ES2020`, module `Node16`
- Add `@types/vscode` and `vscode.git` typings
- Verify: `npm run compile` succeeds with zero errors

**1.2 Define configuration schema in `package.json`**

- Register all settings under `contributes.configuration` with `conventionalBranch.*` namespace (see Section 3 for full schema)
- All variable lists (types, scopes, services) and the format template must be read from `vscode.workspace.getConfiguration('conventionalBranch')`
- Include JSON schema validation (enums for known types, array items as strings)
- Verify: settings appear in VSCode Settings UI under "Conventional Branch" section

**1.3 Implement config reader (`src/config/settings.ts`)**

- Single `getConfig()` function that reads all `conventionalBranch.*` settings from VSCode workspace configuration
- Return a typed `ExtensionConfig` object with resolved defaults
- Must support workspace-level overrides (this is automatic via `vscode.workspace.getConfiguration`, but verify by testing with `.vscode/settings.json`)
- Verify: config changes in settings.json are reflected on next command invocation without reload

**1.4 Build template parser + formatter + sanitizer**

- `parseTemplate(format)` → extracts ordered variable names from `{token}` placeholders
- `formatBranch(format, values, options)` → interpolates values, collapses empty segments and dangling separators
- `sanitize(segment)` → slugifies text, strips git-invalid chars, collapses separators
- Verify: unit tests pass for these cases:
  - Standard format with all values → `ty:api/feat/order-service/add-rate-limiter`
  - Skipped optional scope → no double-slash or dangling separator
  - Special chars in description → cleaned to slug
  - Empty values → segments removed cleanly
  - Custom format `{type}/{description}` → works with only 2 steps

**1.5 Build wizard steps (`src/wizard/steps/`)**

- Each step is a function matching the `WizardStep` interface
- `selectType` — QuickPick from `config.types`, each item shows type + description
- `selectScope` — QuickPick from `config.scopes` with "(skip)" option if `scopeRequired` is false; falls back to InputBox if scopes list is empty
- `selectService` — QuickPick from `config.services`; falls back to InputBox if services list is empty
- `inputDescription` — InputBox with placeholder, auto-slugifies on accept
- `inputUser` — InputBox, pre-filled from `config.user` if set; cache accepted value in `globalState`
- **The wizard runner must dynamically determine which steps to show by parsing the format template** — if a `{token}` isn't in the format, its step is skipped entirely
- Verify: wizard runs end-to-end in Extension Development Host, produces correct branch name

**1.6 Git integration (`src/branch/creator.ts`)**

- Get repo via `vscode.extensions.getExtension('vscode.git')!.exports.getAPI(1).repositories[0]`
- Check if branch name already exists; if so, show warning with option to append suffix
- Create branch and checkout via `repo.createBranch(name, true)`
- Show info notification on success with the created branch name
- Verify: branch is created and checked out in a real git repo

**1.7 Wire up command + SCM menu entry**

- Register `conventionalBranch.create` command in `extension.ts` activate
- Add SCM title bar icon (see Section 6 for menu contribution)
- Guard: if no git repo is open, show error notification and abort
- Verify: command appears in Command Palette and SCM title bar

### Phase 2 — Polish

**2.1 Back-navigation in wizard**

- Add "← Back" as the first QuickPick item on steps 2+
- When selected, re-run the previous step with its last value pre-selected
- Maintain a step history stack for correct back traversal

**2.2 Real-time branch preview**

- Show partially-built branch name in QuickPick `title` property as each step completes
- Format: `Branch: ty:api/feat/▸ ...` (with `▸` indicating current position)

**2.3 User prefix caching**

- On first use, prompt for user prefix and store in `context.globalState`
- On subsequent uses, skip the user step and use cached value
- If `config.user` is set, always use that instead of cache
- Add a `conventionalBranch.clearUserCache` command to reset

**2.4 Multi-root workspace support**

- If `repositories.length > 1`, show a repo picker QuickPick as step 0
- Use selected repo for branch creation

**2.5 Input validation**

- Validate branch name against git ref rules before creation
- Show inline validation messages in InputBox (`inputBox.validationMessage`)
- Warn (not block) if branch name exceeds `maxLength`

### Phase 3 — Nice-to-haves

**3.1 Auto-push to remote**

- If `config.autoPush` is true, run `repo.push()` after branch creation
- Show progress notification during push

**3.2 Base branch selection**

- If `config.baseBranch` is set, checkout + pull that branch before creating
- If empty, create from current HEAD (default)

**3.3 MRU sorting for QuickPick lists**

- Track recently used types/scopes/services in `globalState`
- Sort QuickPick items with MRU entries at top, separated by a divider

**3.4 Unit tests**

- Test `parseTemplate`, `formatBranch`, `sanitize` with edge cases
- Test wizard step sequencing logic (which steps show for which format)
- Use vitest; run via `npm test`

**3.5 Branch cleanup command (`conventionalBranch.cleanup`)**

- Register a second command: `conventionalBranch.cleanup`
- Equivalent behavior to `git branch | grep -v \* | xargs git branch -D ; git fetch --prune`
- Flow:
  1. List all local branches except the currently checked-out branch
  2. Show a QuickPick with `canPickMany: true` — all branches pre-selected
  3. User deselects any branches they want to keep
  4. Show a confirmation dialog: "Delete N local branches and prune remote tracking refs?"
  5. On confirm: delete selected branches via `repo.deleteBranch(name)` in sequence, then run `git fetch --prune` via the Git extension API (or `child_process` fallback if API doesn't expose prune)
  6. Show summary notification: "Deleted N branches. Pruned remote tracking refs."
- Guard: if only one branch exists (current), show info message and abort
- Verify: branches are deleted, `git branch` shows only the current branch, stale remote refs are cleaned

**3.6 Marketplace packaging**

- Create README.md with feature overview, config examples, screenshots
- Design extension icon
- Package with `vsce package`, test install from `.vsix`

---

## 8. Edge Cases & Decisions

| Case                             | Decision                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Empty scope (optional)           | Remove `{scope}` segment and its surrounding separator from output                                       |
| Duplicate branch name            | Check existing branches, warn user, offer suffix (`-2`)                                                  |
| No Git repo open                 | Show error notification, abort                                                                           |
| Multi-root workspace             | Show repo picker QuickPick as step 0                                                                     |
| User hits Esc mid-wizard         | Cancel entirely, no branch created                                                                       |
| Branch name exceeds max length   | Truncate description, warn user                                                                          |
| Invalid chars in free-text input | Sanitize on-the-fly, show preview                                                                        |
| Custom separators in format      | All literal chars between `{tokens}` are preserved as-is; only collapsed when adjacent to an empty token |

---

## 9. Tech Stack

| Concern    | Choice            | Rationale                                 |
| ---------- | ----------------- | ----------------------------------------- |
| Language   | TypeScript        | Standard for VSCode extensions            |
| Build      | esbuild           | Fast bundling, recommended by VSCode docs |
| Test       | vitest            | Lightweight, fast, TS-native              |
| Lint       | ESLint + Prettier | Standard                                  |
| Package    | vsce              | Official VSCode extension packaging       |
| Min VSCode | 1.85+             | Stable Git Extension API                  |
