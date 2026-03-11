import * as vscode from "vscode";
import type { WizardContext, StepResult } from "../types";
import { GLOBAL_STATE_KEYS } from "../../config/defaults";
import { slugify } from "../../branch/sanitizer";

/**
 * Step: prompt the user for their username/prefix.
 *
 * Behaviour:
 * - Pre-fills from globalState cache or config default.
 * - Saves chosen value back to globalState for future runs.
 * - Returns "back" if user selects the Back item.
 * - Returns undefined if user presses Esc.
 */
export async function inputUserStep(ctx: WizardContext): Promise<StepResult> {
  const cached = ctx.extensionContext.globalState.get<string>(GLOBAL_STATE_KEYS.USER_CACHE, "");
  const defaultValue = cached || ctx.config.user || "";

  return new Promise<StepResult>((resolve) => {
    const inputBox = vscode.window.createInputBox();
    inputBox.title = "Conventional Branch — Step: User Prefix";
    inputBox.prompt = "Enter your username or initials (used as branch prefix)";
    inputBox.placeholder = "e.g. ty, john, alice";
    inputBox.value = defaultValue;
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode.ThemeIcon("arrow-left"),
        tooltip: "Back",
      },
    ];

    inputBox.onDidChangeValue((value) => {
      const slugged = slugify(value, ctx.config.descriptionSeparator);
      if (slugged !== value && value.length > 0) {
        inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
      } else {
        inputBox.validationMessage = undefined;
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

      // Cache the value
      void ctx.extensionContext.globalState.update(GLOBAL_STATE_KEYS.USER_CACHE, value);

      resolve(value);
    });

    inputBox.onDidHide(() => {
      // Only resolve undefined if not already resolved by accept/button
      resolve(undefined);
    });

    inputBox.show();
  });
}
