import * as vscode from "vscode";
import type { WizardContext, StepResult } from "../types";
import { BACK_LABEL } from "../types";
import { GLOBAL_STATE_KEYS, MRU_MAX_ITEMS } from "../../config/defaults";

/**
 * Step: select a branch type from a predefined list.
 *
 * Behaviour:
 * - Shows the configured types, sorted with MRU items first.
 * - Returns "back" if user selects the Back item.
 * - Returns undefined if user presses Esc.
 */
export async function selectTypeStep(ctx: WizardContext): Promise<StepResult> {
  const mru = ctx.extensionContext.globalState.get<string[]>(GLOBAL_STATE_KEYS.TYPE_MRU, []);

  const types = ctx.config.types;

  // Build QuickPick items with MRU items at the top
  const mruSet = new Set(mru);
  const mruItems: vscode.QuickPickItem[] = mru
    .filter((t) => types.includes(t))
    .map((t) => ({ label: t, description: "recently used" }));

  const otherItems: vscode.QuickPickItem[] = types
    .filter((t) => !mruSet.has(t))
    .map((t) => ({ label: t }));

  const items: vscode.QuickPickItem[] = [
    { label: BACK_LABEL, kind: vscode.QuickPickItemKind.Default },
    { label: "", kind: vscode.QuickPickItemKind.Separator },
    ...mruItems,
    ...otherItems,
  ];

  const preview = buildPreview(ctx);

  return new Promise<StepResult>((resolve) => {
    const qp = vscode.window.createQuickPick();
    qp.title = `Conventional Branch — Step: Type${preview ? `  →  ${preview}` : ""}`;
    qp.placeholder = "Select a branch type";
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

      const value = selected.label;

      // Update MRU
      const newMru = [value, ...mru.filter((t) => t !== value)].slice(0, MRU_MAX_ITEMS);
      void ctx.extensionContext.globalState.update(GLOBAL_STATE_KEYS.TYPE_MRU, newMru);

      done(value);
    });

    qp.onDidHide(() => done(undefined));

    qp.show();
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
