import * as vscode from "vscode";
import type { WizardContext, StepResult } from "../types";
import { BACK_LABEL, SKIP_LABEL } from "../types";
import { GLOBAL_STATE_KEYS, MRU_MAX_ITEMS } from "../../config/defaults";
import { slugify } from "../../branch/sanitizer";

/**
 * Step: select or input a service/component.
 *
 * Behaviour:
 * - If config.services is non-empty, shows a QuickPick with MRU sorting.
 * - If config.services is empty, shows a free-text InputBox.
 * - Always shows a "(skip)" option.
 * - Returns "" for skipped service.
 * - Returns "back" if user selects the Back item.
 * - Returns undefined if user presses Esc.
 */
export async function selectServiceStep(ctx: WizardContext): Promise<StepResult> {
  if (ctx.config.services.length > 0) {
    return selectServiceFromList(ctx);
  }
  return inputServiceFreeText(ctx);
}

async function selectServiceFromList(ctx: WizardContext): Promise<StepResult> {
  const mru = ctx.extensionContext.globalState.get<string[]>(GLOBAL_STATE_KEYS.SERVICE_MRU, []);
  const services = ctx.config.services;

  const mruSet = new Set(mru);
  const mruItems: vscode.QuickPickItem[] = mru
    .filter((s) => services.includes(s))
    .map((s) => ({ label: s, description: "recently used" }));

  const otherItems: vscode.QuickPickItem[] = services
    .filter((s) => !mruSet.has(s))
    .map((s) => ({ label: s }));

  const items: vscode.QuickPickItem[] = [
    { label: BACK_LABEL, kind: vscode.QuickPickItemKind.Default },
    { label: SKIP_LABEL, description: "no service" },
    { label: "", kind: vscode.QuickPickItemKind.Separator },
    ...mruItems,
    ...otherItems,
  ];

  const preview = buildPreview(ctx);

  return new Promise<StepResult>((resolve) => {
    const qp = vscode.window.createQuickPick();
    qp.title = `Conventional Branch — Step: Service${preview ? `  →  ${preview}` : ""}`;
    qp.placeholder = "Select a service or component (optional)";
    qp.items = items;
    qp.ignoreFocusOut = true;

    let resolved = false;

    function done(result: StepResult) {
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

    qp.onDidHide(() => done(undefined));
    qp.show();
  });
}

async function inputServiceFreeText(ctx: WizardContext): Promise<StepResult> {
  const preview = buildPreview(ctx);

  return new Promise<StepResult>((resolve) => {
    const inputBox = vscode.window.createInputBox();
    inputBox.title = `Conventional Branch — Step: Service${preview ? `  →  ${preview}` : ""}`;
    inputBox.prompt = "Enter a service or component name (leave empty to skip)";
    inputBox.placeholder = "e.g. order-service, auth-api, payments";
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode.ThemeIcon("arrow-left"),
        tooltip: "Back",
      },
    ];

    inputBox.onDidChangeValue((value) => {
      if (value.length > 0) {
        const slugged = slugify(value, ctx.config.descriptionSeparator);
        if (slugged !== value) {
          inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
        } else {
          inputBox.validationMessage = undefined;
        }
      } else {
        inputBox.validationMessage = undefined;
      }
    });

    let resolved = false;

    function done(result: StepResult) {
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

    inputBox.onDidHide(() => done(undefined));
    inputBox.show();
  });
}

function buildPreview(ctx: WizardContext): string {
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
