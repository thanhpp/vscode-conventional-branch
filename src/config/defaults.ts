/**
 * Default configuration values for the Conventional Branch extension.
 */

export const DEFAULT_TYPES: string[] = [
  "feat",
  "fix",
  "hotfix",
  "chore",
  "refactor",
  "docs",
  "test",
  "ci",
  "perf",
  "style",
  "build",
  "revert",
];

export const DEFAULT_SCOPES: string[] = [];

export const DEFAULT_SERVICES: string[] = [];

export const DEFAULT_FORMAT = "{user}/{scope}/{type}/{service}/{description}";

export const DEFAULT_DESCRIPTION_SEPARATOR = "-";

export const DEFAULT_MAX_LENGTH = 80;

export const MRU_MAX_ITEMS = 10;

export const GLOBAL_STATE_KEYS = {
  USER_CACHE: "conventionalBranch.user",
  TYPE_MRU: "conventionalBranch.mru.types",
  SCOPE_MRU: "conventionalBranch.mru.scopes",
  SERVICE_MRU: "conventionalBranch.mru.services",
} as const;
