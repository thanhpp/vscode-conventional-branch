"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode11 = __toESM(require("vscode"));

// src/config/settings.ts
var vscode = __toESM(require("vscode"));

// src/config/defaults.ts
var DEFAULT_TYPES = [
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
  "revert"
];
var DEFAULT_SCOPES = [];
var DEFAULT_SERVICES = [];
var DEFAULT_FORMAT = "{user}/{scope}/{type}/{service}/{description}";
var DEFAULT_DESCRIPTION_SEPARATOR = "-";
var DEFAULT_MAX_LENGTH = 80;
var MRU_MAX_ITEMS = 10;
var GLOBAL_STATE_KEYS = {
  USER_CACHE: "conventionalBranch.user",
  TYPE_MRU: "conventionalBranch.mru.types",
  SCOPE_MRU: "conventionalBranch.mru.scopes",
  SERVICE_MRU: "conventionalBranch.mru.services"
};

// src/config/settings.ts
function getConfig() {
  const config = vscode.workspace.getConfiguration("conventionalBranch");
  return {
    format: config.get("format", DEFAULT_FORMAT),
    user: config.get("user", ""),
    types: config.get("types", DEFAULT_TYPES),
    scopes: config.get("scopes", DEFAULT_SCOPES),
    services: config.get("services", DEFAULT_SERVICES),
    scopeRequired: config.get("scopeRequired", false),
    descriptionSeparator: config.get(
      "descriptionSeparator",
      DEFAULT_DESCRIPTION_SEPARATOR
    ),
    lowercaseOnly: config.get("lowercaseOnly", true),
    maxLength: config.get("maxLength", DEFAULT_MAX_LENGTH),
    autoPush: config.get("autoPush", false),
    baseBranch: config.get("baseBranch", "")
  };
}

// src/utils/git.ts
var vscode2 = __toESM(require("vscode"));
function getGitAPI() {
  const gitExtension = vscode2.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    return void 0;
  }
  if (!gitExtension.isActive) {
    return void 0;
  }
  return gitExtension.exports.getAPI(1);
}
async function pickRepository(gitAPI) {
  const repos = gitAPI.repositories;
  if (repos.length === 0) {
    void vscode2.window.showErrorMessage(
      "No Git repositories found. Please open a folder with a Git repository."
    );
    return void 0;
  }
  if (repos.length === 1) {
    return repos[0];
  }
  const items = repos.map((repo) => ({
    label: repo.rootUri.fsPath.split("/").pop() ?? repo.rootUri.fsPath,
    description: repo.rootUri.fsPath,
    repo
  }));
  const picked = await vscode2.window.showQuickPick(items, {
    title: "Select Repository",
    placeHolder: "Choose a repository to create the branch in"
  });
  return picked == null ? void 0 : picked.repo;
}
async function branchExists(repo, branchName) {
  const branches = await repo.getBranches({ remote: false });
  return branches.some((b) => b.name === branchName);
}

// src/wizard/runner.ts
var vscode8 = __toESM(require("vscode"));

// src/branch/sanitizer.ts
function slugify(value, separator = "-") {
  let result = value.normalize("NFKD");
  result = result.replace(/[\s_]+/g, separator);
  result = result.replace(/[~^:?*[\\\s@{}]/g, separator);
  result = result.replace(/\.\./g, separator);
  result = result.replace(/@\{/g, separator);
  const escapedSep = escapeRegex(separator);
  result = result.replace(new RegExp(`${escapedSep}{2,}`, "g"), separator);
  result = result.replace(new RegExp(`^${escapedSep}+|${escapedSep}+$`, "g"), "");
  result = result.replace(/^\.+|\.+$/g, "");
  result = result.replace(/\.lock$/, "");
  return result;
}
function validateBranchName(name) {
  if (!name || name.trim().length === 0) {
    return "Branch name cannot be empty.";
  }
  if (name.startsWith(".") || name.endsWith(".")) {
    return "Branch name cannot start or end with a dot.";
  }
  if (name.endsWith(".lock")) {
    return 'Branch name cannot end with ".lock".';
  }
  if (/\.\./.test(name)) {
    return 'Branch name cannot contain "..".';
  }
  if (/[\s~^:?*[\\\x00-\x1f\x7f]/.test(name)) {
    return "Branch name contains invalid characters.";
  }
  if (/@\{/.test(name)) {
    return 'Branch name cannot contain "@{".';
  }
  if (/\/\//.test(name)) {
    return "Branch name cannot contain consecutive slashes.";
  }
  if (name.startsWith("/") || name.endsWith("/")) {
    return "Branch name cannot start or end with a slash.";
  }
  return void 0;
}
function sanitizeBranchName(name, separator = "-", lowercase = true, maxLength = 80) {
  let result = name;
  if (lowercase) {
    result = result.toLowerCase();
  }
  result = result.replace(/\.\./g, ".");
  result = result.replace(/@\{/g, "");
  result = result.replace(/[~^:?*[\\\x00-\x1f\x7f]/g, separator);
  result = result.replace(/\/\/+/g, "/");
  if (separator !== "/") {
    const escapedSep = escapeRegex(separator);
    result = result.replace(new RegExp(`${escapedSep}{2,}`, "g"), separator);
  }
  result = result.replace(/^[/:\-_.]+|[/:\-_.]+$/g, "");
  result = result.replace(/\.lock$/, "");
  if (maxLength > 0 && result.length > maxLength) {
    result = result.slice(0, maxLength);
    result = result.replace(/[/:\-_.]+$/, "");
  }
  return result;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/branch/formatter.ts
function parseTemplate(format) {
  const matches = [...format.matchAll(/\{(\w+)\}/g)];
  return matches.map((m) => m[1]);
}
function formatBranch(format, values, options) {
  let result = format;
  for (const [key, rawValue] of Object.entries(values)) {
    const slugged = rawValue.trim().length > 0 ? slugify(rawValue.trim(), options.separator) : "";
    result = result.replace(`{${key}}`, slugged);
  }
  result = result.replace(/\{(\w+)\}/g, "");
  result = result.replace(/([/:_\-.])[/:_\-.]+/g, "$1");
  result = result.replace(/^[/:_\-.]+|[/:_\-.]+$/g, "");
  if (options.lowercase) {
    result = result.toLowerCase();
  }
  if (options.maxLength > 0 && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
    result = result.replace(/[/:_\-.]+$/, "");
  }
  return result;
}

// src/wizard/steps/inputUser.ts
var vscode3 = __toESM(require("vscode"));
async function inputUserStep(ctx) {
  const cached = ctx.extensionContext.globalState.get(GLOBAL_STATE_KEYS.USER_CACHE, "");
  const defaultValue = cached || ctx.config.user || "";
  return new Promise((resolve) => {
    const inputBox = vscode3.window.createInputBox();
    inputBox.title = "Conventional Branch \u2014 Step: User Prefix";
    inputBox.prompt = "Enter your username or initials (used as branch prefix)";
    inputBox.placeholder = "e.g. ty, john, alice";
    inputBox.value = defaultValue;
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode3.ThemeIcon("arrow-left"),
        tooltip: "Back"
      }
    ];
    inputBox.onDidChangeValue((value) => {
      const slugged = slugify(value, ctx.config.descriptionSeparator);
      if (slugged !== value && value.length > 0) {
        inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
      } else {
        inputBox.validationMessage = void 0;
      }
    });
    inputBox.onDidTriggerButton((_btn) => {
      inputBox.hide();
      resolve("back");
    });
    inputBox.onDidAccept(() => {
      const raw = inputBox.value.trim();
      inputBox.hide();
      const value = raw.length > 0 ? slugify(raw, ctx.config.descriptionSeparator) : "";
      void ctx.extensionContext.globalState.update(GLOBAL_STATE_KEYS.USER_CACHE, value);
      resolve(value);
    });
    inputBox.onDidHide(() => {
      resolve(void 0);
    });
    inputBox.show();
  });
}

// src/wizard/steps/selectType.ts
var vscode4 = __toESM(require("vscode"));

// src/wizard/types.ts
var BACK_LABEL = "$(arrow-left) Back";
var SKIP_LABEL = "$(circle-slash) Skip";

// src/wizard/steps/selectType.ts
async function selectTypeStep(ctx) {
  const mru = ctx.extensionContext.globalState.get(GLOBAL_STATE_KEYS.TYPE_MRU, []);
  const types = ctx.config.types;
  const mruSet = new Set(mru);
  const mruItems = mru.filter((t) => types.includes(t)).map((t) => ({ label: t, description: "recently used" }));
  const otherItems = types.filter((t) => !mruSet.has(t)).map((t) => ({ label: t }));
  const items = [
    { label: BACK_LABEL, kind: vscode4.QuickPickItemKind.Default },
    { label: "", kind: vscode4.QuickPickItemKind.Separator },
    ...mruItems,
    ...otherItems
  ];
  const preview = buildPreview(ctx);
  return new Promise((resolve) => {
    const qp = vscode4.window.createQuickPick();
    qp.title = `Conventional Branch \u2014 Step: Type${preview ? `  \u2192  ${preview}` : ""}`;
    qp.placeholder = "Select a branch type";
    qp.items = items;
    qp.ignoreFocusOut = true;
    let resolved = false;
    function done(result) {
      if (!resolved) {
        resolved = true;
        qp.hide();
        resolve(result);
      }
    }
    qp.onDidAccept(() => {
      const selected = qp.selectedItems[0];
      if (!selected) {
        return;
      }
      if (selected.label === BACK_LABEL) {
        done("back");
        return;
      }
      const value = selected.label;
      const newMru = [value, ...mru.filter((t) => t !== value)].slice(0, MRU_MAX_ITEMS);
      void ctx.extensionContext.globalState.update(GLOBAL_STATE_KEYS.TYPE_MRU, newMru);
      done(value);
    });
    qp.onDidHide(() => done(void 0));
    qp.show();
  });
}
function buildPreview(ctx) {
  const { collected, format } = ctx;
  if (Object.keys(collected).length === 0) {
    return "";
  }
  let preview = format;
  for (const [key, value] of Object.entries(collected)) {
    preview = preview.replace(`{${key}}`, value || "");
  }
  return preview;
}

// src/wizard/steps/selectScope.ts
var vscode5 = __toESM(require("vscode"));
async function selectScopeStep(ctx) {
  if (ctx.config.scopes.length > 0) {
    return selectScopeFromList(ctx);
  }
  return inputScopeFreeText(ctx);
}
async function selectScopeFromList(ctx) {
  const mru = ctx.extensionContext.globalState.get(GLOBAL_STATE_KEYS.SCOPE_MRU, []);
  const scopes = ctx.config.scopes;
  const mruSet = new Set(mru);
  const mruItems = mru.filter((s) => scopes.includes(s)).map((s) => ({ label: s, description: "recently used" }));
  const otherItems = scopes.filter((s) => !mruSet.has(s)).map((s) => ({ label: s }));
  const items = [
    { label: BACK_LABEL, kind: vscode5.QuickPickItemKind.Default }
  ];
  if (!ctx.config.scopeRequired) {
    items.push({ label: SKIP_LABEL, description: "no scope" });
  }
  items.push(
    { label: "", kind: vscode5.QuickPickItemKind.Separator },
    ...mruItems,
    ...otherItems
  );
  const preview = buildPreview2(ctx);
  return new Promise((resolve) => {
    const qp = vscode5.window.createQuickPick();
    qp.title = `Conventional Branch \u2014 Step: Scope${preview ? `  \u2192  ${preview}` : ""}`;
    qp.placeholder = ctx.config.scopeRequired ? "Select a scope" : "Select a scope (optional)";
    qp.items = items;
    qp.ignoreFocusOut = true;
    let resolved = false;
    function done(result) {
      if (!resolved) {
        resolved = true;
        qp.hide();
        resolve(result);
      }
    }
    qp.onDidAccept(() => {
      const selected = qp.selectedItems[0];
      if (!selected) {
        return;
      }
      if (selected.label === BACK_LABEL) {
        done("back");
        return;
      }
      if (selected.label === SKIP_LABEL) {
        done("");
        return;
      }
      const value = selected.label;
      const newMru = [value, ...mru.filter((s) => s !== value)].slice(0, MRU_MAX_ITEMS);
      void ctx.extensionContext.globalState.update(GLOBAL_STATE_KEYS.SCOPE_MRU, newMru);
      done(value);
    });
    qp.onDidHide(() => done(void 0));
    qp.show();
  });
}
async function inputScopeFreeText(ctx) {
  const preview = buildPreview2(ctx);
  return new Promise((resolve) => {
    const inputBox = vscode5.window.createInputBox();
    inputBox.title = `Conventional Branch \u2014 Step: Scope${preview ? `  \u2192  ${preview}` : ""}`;
    inputBox.prompt = ctx.config.scopeRequired ? "Enter a scope for this branch" : "Enter a scope for this branch (leave empty to skip)";
    inputBox.placeholder = "e.g. api, auth, payments";
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode5.ThemeIcon("arrow-left"),
        tooltip: "Back"
      }
    ];
    inputBox.onDidChangeValue((value) => {
      if (value.length > 0) {
        const slugged = slugify(value, ctx.config.descriptionSeparator);
        if (slugged !== value) {
          inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
        } else {
          inputBox.validationMessage = void 0;
        }
      } else {
        inputBox.validationMessage = void 0;
      }
    });
    let resolved = false;
    function done(result) {
      if (!resolved) {
        resolved = true;
        inputBox.hide();
        resolve(result);
      }
    }
    inputBox.onDidTriggerButton((_btn) => {
      done("back");
    });
    inputBox.onDidAccept(() => {
      const raw = inputBox.value.trim();
      if (ctx.config.scopeRequired && raw.length === 0) {
        inputBox.validationMessage = "Scope is required.";
        return;
      }
      const value = raw.length > 0 ? slugify(raw, ctx.config.descriptionSeparator) : "";
      done(value);
    });
    inputBox.onDidHide(() => done(void 0));
    inputBox.show();
  });
}
function buildPreview2(ctx) {
  const { collected, format } = ctx;
  if (Object.keys(collected).length === 0) {
    return "";
  }
  let preview = format;
  for (const [key, value] of Object.entries(collected)) {
    preview = preview.replace(`{${key}}`, value || "");
  }
  return preview;
}

// src/wizard/steps/selectService.ts
var vscode6 = __toESM(require("vscode"));
async function selectServiceStep(ctx) {
  if (ctx.config.services.length > 0) {
    return selectServiceFromList(ctx);
  }
  return inputServiceFreeText(ctx);
}
async function selectServiceFromList(ctx) {
  const mru = ctx.extensionContext.globalState.get(GLOBAL_STATE_KEYS.SERVICE_MRU, []);
  const services = ctx.config.services;
  const mruSet = new Set(mru);
  const mruItems = mru.filter((s) => services.includes(s)).map((s) => ({ label: s, description: "recently used" }));
  const otherItems = services.filter((s) => !mruSet.has(s)).map((s) => ({ label: s }));
  const items = [
    { label: BACK_LABEL, kind: vscode6.QuickPickItemKind.Default },
    { label: SKIP_LABEL, description: "no service" },
    { label: "", kind: vscode6.QuickPickItemKind.Separator },
    ...mruItems,
    ...otherItems
  ];
  const preview = buildPreview3(ctx);
  return new Promise((resolve) => {
    const qp = vscode6.window.createQuickPick();
    qp.title = `Conventional Branch \u2014 Step: Service${preview ? `  \u2192  ${preview}` : ""}`;
    qp.placeholder = "Select a service or component (optional)";
    qp.items = items;
    qp.ignoreFocusOut = true;
    let resolved = false;
    function done(result) {
      if (!resolved) {
        resolved = true;
        qp.hide();
        resolve(result);
      }
    }
    qp.onDidAccept(() => {
      const selected = qp.selectedItems[0];
      if (!selected) {
        return;
      }
      if (selected.label === BACK_LABEL) {
        done("back");
        return;
      }
      if (selected.label === SKIP_LABEL) {
        done("");
        return;
      }
      const value = selected.label;
      const newMru = [value, ...mru.filter((s) => s !== value)].slice(0, MRU_MAX_ITEMS);
      void ctx.extensionContext.globalState.update(GLOBAL_STATE_KEYS.SERVICE_MRU, newMru);
      done(value);
    });
    qp.onDidHide(() => done(void 0));
    qp.show();
  });
}
async function inputServiceFreeText(ctx) {
  const preview = buildPreview3(ctx);
  return new Promise((resolve) => {
    const inputBox = vscode6.window.createInputBox();
    inputBox.title = `Conventional Branch \u2014 Step: Service${preview ? `  \u2192  ${preview}` : ""}`;
    inputBox.prompt = "Enter a service or component name (leave empty to skip)";
    inputBox.placeholder = "e.g. order-service, auth-api, payments";
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode6.ThemeIcon("arrow-left"),
        tooltip: "Back"
      }
    ];
    inputBox.onDidChangeValue((value) => {
      if (value.length > 0) {
        const slugged = slugify(value, ctx.config.descriptionSeparator);
        if (slugged !== value) {
          inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
        } else {
          inputBox.validationMessage = void 0;
        }
      } else {
        inputBox.validationMessage = void 0;
      }
    });
    let resolved = false;
    function done(result) {
      if (!resolved) {
        resolved = true;
        inputBox.hide();
        resolve(result);
      }
    }
    inputBox.onDidTriggerButton((_btn) => {
      done("back");
    });
    inputBox.onDidAccept(() => {
      const raw = inputBox.value.trim();
      const value = raw.length > 0 ? slugify(raw, ctx.config.descriptionSeparator) : "";
      done(value);
    });
    inputBox.onDidHide(() => done(void 0));
    inputBox.show();
  });
}
function buildPreview3(ctx) {
  const { collected, format } = ctx;
  if (Object.keys(collected).length === 0) {
    return "";
  }
  let preview = format;
  for (const [key, value] of Object.entries(collected)) {
    preview = preview.replace(`{${key}}`, value || "");
  }
  return preview;
}

// src/wizard/steps/inputDescription.ts
var vscode7 = __toESM(require("vscode"));
async function inputDescriptionStep(ctx) {
  return new Promise((resolve) => {
    const inputBox = vscode7.window.createInputBox();
    inputBox.title = "Conventional Branch \u2014 Step: Description";
    inputBox.prompt = "Enter a short description (words will be joined with separator)";
    inputBox.placeholder = "e.g. add rate limiter, fix login bug";
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode7.ThemeIcon("arrow-left"),
        tooltip: "Back"
      }
    ];
    inputBox.onDidChangeValue((value) => {
      if (value.trim().length === 0) {
        inputBox.validationMessage = void 0;
        inputBox.title = "Conventional Branch \u2014 Step: Description";
        return;
      }
      const slugged = slugify(value.trim(), ctx.config.descriptionSeparator);
      const previewValues = { ...ctx.collected, description: value.trim() };
      const preview = formatBranch(ctx.format, previewValues, {
        separator: ctx.config.descriptionSeparator,
        lowercase: ctx.config.lowercaseOnly,
        maxLength: ctx.config.maxLength
      });
      inputBox.title = `Conventional Branch  \u2192  ${preview}`;
      if (slugged !== value.trim()) {
        inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
      } else {
        inputBox.validationMessage = void 0;
      }
    });
    let resolved = false;
    function done(result) {
      if (!resolved) {
        resolved = true;
        inputBox.hide();
        resolve(result);
      }
    }
    inputBox.onDidTriggerButton((_btn) => {
      done("back");
    });
    inputBox.onDidAccept(() => {
      const raw = inputBox.value.trim();
      if (raw.length === 0) {
        inputBox.validationMessage = "Description is required.";
        return;
      }
      const value = slugify(raw, ctx.config.descriptionSeparator);
      done(value);
    });
    inputBox.onDidHide(() => done(void 0));
    inputBox.show();
  });
}

// src/wizard/runner.ts
var STEP_REGISTRY = {
  user: inputUserStep,
  type: selectTypeStep,
  scope: selectScopeStep,
  service: selectServiceStep,
  description: inputDescriptionStep
};
function buildSteps(format) {
  const variables = parseTemplate(format);
  const steps = [];
  for (const variable of variables) {
    const stepFn = STEP_REGISTRY[variable];
    if (stepFn) {
      steps.push({
        variable,
        run: stepFn
      });
    }
  }
  return steps;
}
async function runWizard(config, extensionContext) {
  const steps = buildSteps(config.format);
  if (steps.length === 0) {
    void vscode8.window.showErrorMessage(
      "The branch format template contains no recognized variables. Please check your conventionalBranch.format setting."
    );
    return void 0;
  }
  const ctx = {
    collected: {},
    format: config.format,
    config,
    extensionContext
  };
  let stepIndex = 0;
  while (stepIndex < steps.length) {
    const step = steps[stepIndex];
    const result = await step.run(ctx);
    if (result === void 0) {
      return void 0;
    }
    if (result === "back") {
      if (stepIndex === 0) {
        return void 0;
      }
      const prevStep = steps[stepIndex - 1];
      delete ctx.collected[prevStep.variable];
      stepIndex--;
      continue;
    }
    ctx.collected[step.variable] = result;
    stepIndex++;
  }
  const rawBranchName = formatBranch(ctx.format, ctx.collected, {
    separator: config.descriptionSeparator,
    lowercase: config.lowercaseOnly,
    maxLength: 0
    // Don't truncate yet; we validate first
  });
  const branchName = sanitizeBranchName(
    rawBranchName,
    config.descriptionSeparator,
    config.lowercaseOnly,
    config.maxLength
  );
  const validationError = validateBranchName(branchName);
  if (validationError) {
    void vscode8.window.showErrorMessage(`Generated branch name is invalid: ${validationError}`);
    return void 0;
  }
  return branchName;
}

// src/branch/creator.ts
var vscode9 = __toESM(require("vscode"));
async function createBranch(repo, branchName, baseBranch, autoPush = false) {
  let finalName = branchName;
  if (await branchExists(repo, branchName)) {
    const resolution = await handleDuplicateBranch(branchName);
    if (!resolution) {
      return false;
    }
    finalName = resolution;
  }
  if (baseBranch && baseBranch.trim().length > 0) {
    try {
      await vscode9.window.withProgress(
        {
          location: vscode9.ProgressLocation.Notification,
          title: `Checking out base branch: ${baseBranch}`,
          cancellable: false
        },
        async () => {
          await repo.checkout(baseBranch);
          await repo.pull();
        }
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      void vscode9.window.showErrorMessage(`Failed to checkout base branch "${baseBranch}": ${errMsg}`);
      return false;
    }
  }
  try {
    await vscode9.window.withProgress(
      {
        location: vscode9.ProgressLocation.Notification,
        title: `Creating branch: ${finalName}`,
        cancellable: false
      },
      async () => {
        await repo.createBranch(
          finalName,
          true
          /* checkout */
        );
      }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    void vscode9.window.showErrorMessage(`Failed to create branch "${finalName}": ${errMsg}`);
    return false;
  }
  void vscode9.window.showInformationMessage(`Branch created: ${finalName}`);
  if (autoPush) {
    try {
      await vscode9.window.withProgress(
        {
          location: vscode9.ProgressLocation.Notification,
          title: `Pushing branch to remote: ${finalName}`,
          cancellable: false
        },
        async () => {
          await repo.push(
            void 0,
            finalName,
            true
            /* setUpstream */
          );
        }
      );
      void vscode9.window.showInformationMessage(`Branch pushed to remote: ${finalName}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      void vscode9.window.showWarningMessage(
        `Branch created locally but push failed: ${errMsg}`
      );
    }
  }
  return true;
}
async function handleDuplicateBranch(branchName) {
  const suffix2 = `${branchName}-2`;
  const choice = await vscode9.window.showWarningMessage(
    `Branch "${branchName}" already exists.`,
    { modal: true },
    `Use "${suffix2}"`,
    "Enter custom name",
    "Cancel"
  );
  if (!choice || choice === "Cancel") {
    return void 0;
  }
  if (choice === `Use "${suffix2}"`) {
    return suffix2;
  }
  const custom = await vscode9.window.showInputBox({
    title: "Custom Branch Name",
    prompt: "Enter a custom branch name",
    value: branchName,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return "Branch name cannot be empty.";
      }
      return void 0;
    }
  });
  return (custom == null ? void 0 : custom.trim()) || void 0;
}

// src/branch/cleanup.ts
var vscode10 = __toESM(require("vscode"));
async function cleanupBranches(repo) {
  var _a;
  const headBranch = (_a = repo.state.HEAD) == null ? void 0 : _a.name;
  let branches;
  try {
    branches = await repo.getBranches({ remote: false });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    void vscode10.window.showErrorMessage(`Failed to list branches: ${errMsg}`);
    return;
  }
  const deletableBranches = branches.filter(
    (b) => b.name && b.name !== headBranch && b.name !== "HEAD"
  );
  if (deletableBranches.length === 0) {
    void vscode10.window.showInformationMessage(
      "No local branches to clean up (only the current branch exists)."
    );
    return;
  }
  const items = deletableBranches.map((b) => ({
    label: b.name ?? "(unnamed)",
    description: b.commit ? `$(git-commit) ${b.commit.slice(0, 7)}` : void 0,
    picked: false
  }));
  const selected = await vscode10.window.showQuickPick(items, {
    title: "Cleanup Local Branches \u2014 Select branches to delete",
    placeHolder: "Select branches to delete (multi-select)",
    canPickMany: true,
    ignoreFocusOut: true
  });
  if (!selected || selected.length === 0) {
    void vscode10.window.showInformationMessage("No branches selected for deletion.");
    return;
  }
  const branchList = selected.map((s) => `\u2022 ${s.label}`).join("\n");
  const confirm = await vscode10.window.showWarningMessage(
    `Delete ${selected.length} branch(es)?

${branchList}`,
    { modal: true },
    "Delete",
    "Cancel"
  );
  if (confirm !== "Delete") {
    return;
  }
  const errors = [];
  const deleted = [];
  await vscode10.window.withProgress(
    {
      location: vscode10.ProgressLocation.Notification,
      title: "Deleting branches...",
      cancellable: false
    },
    async (progress) => {
      for (const item of selected) {
        const branchName = item.label;
        progress.report({ message: branchName });
        try {
          await repo.deleteBranch(
            branchName,
            false
            /* no force */
          );
          deleted.push(branchName);
        } catch (err) {
          try {
            await repo.deleteBranch(
              branchName,
              true
              /* force */
            );
            deleted.push(branchName);
          } catch (forceErr) {
            const errMsg = forceErr instanceof Error ? forceErr.message : String(forceErr);
            errors.push(`${branchName}: ${errMsg}`);
          }
        }
      }
    }
  );
  try {
    await vscode10.window.withProgress(
      {
        location: vscode10.ProgressLocation.Notification,
        title: "Pruning stale remote-tracking refs...",
        cancellable: false
      },
      async () => {
        await repo.fetch(void 0, void 0, void 0);
      }
    );
  } catch {
    void vscode10.window.showWarningMessage(
      "Could not prune remote-tracking refs (fetch failed). Branches were still deleted locally."
    );
  }
  if (deleted.length > 0) {
    void vscode10.window.showInformationMessage(
      `Deleted ${deleted.length} branch(es): ${deleted.join(", ")}`
    );
  }
  if (errors.length > 0) {
    void vscode10.window.showErrorMessage(`Failed to delete: ${errors.join("; ")}`);
  }
}

// src/extension.ts
function activate(context) {
  const createCmd = vscode11.commands.registerCommand(
    "conventionalBranch.create",
    async () => {
      const gitAPI = getGitAPI();
      if (!gitAPI) {
        void vscode11.window.showErrorMessage(
          "Git extension is not available. Please ensure the built-in Git extension is active."
        );
        return;
      }
      const repo = await pickRepository(gitAPI);
      if (!repo) {
        return;
      }
      const config = getConfig();
      const branchName = await runWizard(config, context);
      if (!branchName) {
        return;
      }
      await createBranch(repo, branchName, config.baseBranch || void 0, config.autoPush);
    }
  );
  const cleanupCmd = vscode11.commands.registerCommand(
    "conventionalBranch.cleanup",
    async () => {
      const gitAPI = getGitAPI();
      if (!gitAPI) {
        void vscode11.window.showErrorMessage(
          "Git extension is not available. Please ensure the built-in Git extension is active."
        );
        return;
      }
      const repo = await pickRepository(gitAPI);
      if (!repo) {
        return;
      }
      await cleanupBranches(repo);
    }
  );
  const clearUserCmd = vscode11.commands.registerCommand(
    "conventionalBranch.clearUserCache",
    async () => {
      await context.globalState.update(GLOBAL_STATE_KEYS.USER_CACHE, void 0);
      void vscode11.window.showInformationMessage("Conventional Branch: User prefix cache cleared.");
    }
  );
  context.subscriptions.push(createCmd, cleanupCmd, clearUserCmd);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
