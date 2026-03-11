# Conventional Branch

A VSCode extension that guides you through creating conventionally-named Git branches via a step-by-step wizard — inspired by [vscode-conventional-commits](https://github.com/vivaxy/vscode-conventional-commits).

## Features

- **Step-by-step wizard** — QuickPick UI walks you through each part of the branch name
- **Configurable format** — define your own template using `{tokens}`
- **Back-navigation** — press `← Back` at any step to revise a previous answer
- **Live preview** — see the branch name being built in real time
- **MRU sorting** — recently used types/scopes/services appear at the top
- **Branch cleanup** — delete multiple local branches and prune remote refs in one go
- **Multi-root workspace** — picks the right repository when multiple are open

## Default Branch Format

```
{user}:{scope}/{type}/{service}/{description}
```

**Example:** `ty:api/feat/order-service/add-rate-limiter`

## Usage

### Create a branch

- Open the **Command Palette** (`Ctrl+Shift+P`) → `Conventional Branch: Checkout`
- Or click the **branch icon** in the Source Control title bar

The wizard will guide you through each token defined in your format template.

### Clean up branches

- Command Palette → `Conventional Branch: Cleanup Local Branches`
- Select branches to delete, confirm — stale remote refs are pruned automatically.

## Configuration

All settings are under `conventionalBranch.*` in your VSCode settings.

| Setting                | Default                                         | Description                                          |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `format`               | `{user}:{scope}/{type}/{service}/{description}` | Branch name template                                 |
| `user`                 | `""`                                            | Default user prefix (prompted on first use if empty) |
| `types`                | `["feat","fix","hotfix",...]`                   | Selectable branch types                              |
| `scopes`               | `[]`                                            | Selectable scopes — empty means free-text input      |
| `services`             | `[]`                                            | Selectable services — empty means free-text input    |
| `scopeRequired`        | `false`                                         | If false, scope shows a (skip) option                |
| `descriptionSeparator` | `"-"`                                           | Word separator in the description slug               |
| `lowercaseOnly`        | `true`                                          | Force all segments lowercase                         |
| `maxLength`            | `80`                                            | Max branch name length (0 = unlimited)               |
| `autoPush`             | `false`                                         | Push new branch to remote after creation             |
| `baseBranch`           | `""`                                            | Base branch to create from (empty = current HEAD)    |

### Custom format example

```json
"conventionalBranch.format": "{type}/{description}"
```

This shows only 2 steps (type + description) and produces branches like `feat/add-rate-limiter`.

### Team-shared config

Commit a `.vscode/settings.json` to share types/scopes/services across your team:

```json
{
  "conventionalBranch.scopes": ["api", "ui", "infra"],
  "conventionalBranch.services": ["order-service", "matching-engine", "gateway"]
}
```

## Commands

| Command                                           | Description                               |
| ------------------------------------------------- | ----------------------------------------- |
| `Conventional Branch: Checkout`                   | Open the branch creation wizard           |
| `Conventional Branch: Cleanup Local Branches`     | Delete local branches + prune remote refs |
| `Conventional Branch: Clear Cached User Prefix`   | Reset the stored user prefix              |

## Requirements

- VSCode 1.85+
- A Git repository open in the workspace
