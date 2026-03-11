import * as vscode from "vscode";
import type { WizardContext, StepResult } from "../types";
import { slugify } from "../../branch/sanitizer";
import { formatBranch } from "../../branch/formatter";

/**
 * Step: input a free-text description for the branch.
 *
 * Behaviour:
 * - Validates that the description is non-empty.
 * - Shows a live preview of the final branch name.
 * - Returns "back" if user clicks the Back button.
 * - Returns undefined if user presses Esc.
 */
export async function inputDescriptionStep(ctx: WizardContext): Promise<StepResult> {
  return new Promise<StepResult>((resolve) => {
    const inputBox = vscode.window.createInputBox();
    inputBox.title = "Conventional Branch — Step: Description";
    inputBox.prompt = "Enter a short description (words will be joined with separator)";
    inputBox.placeholder = "e.g. add rate limiter, fix login bug";
    inputBox.ignoreFocusOut = true;
    inputBox.buttons = [
      {
        iconPath: new vscode.ThemeIcon("arrow-left"),
        tooltip: "Back",
      },
    ];

    inputBox.onDidChangeValue((value) => {
      if (value.trim().length === 0) {
        inputBox.validationMessage = undefined;
        inputBox.title = "Conventional Branch — Step: Description";
        return;
      }

      const slugged = slugify(value.trim(), ctx.config.descriptionSeparator);
      const previewValues = { ...ctx.collected, description: value.trim() };
      const preview = formatBranch(ctx.format, previewValues, {
        separator: ctx.config.descriptionSeparator,
        lowercase: ctx.config.lowercaseOnly,
        maxLength: ctx.config.maxLength,
      });

      inputBox.title = `Conventional Branch  →  ${preview}`;

      if (slugged !== value.trim()) {
        inputBox.validationMessage = `Will be sanitized to: ${slugged}`;
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

      if (raw.length === 0) {
        inputBox.validationMessage = "Description is required.";
        return;
      }

      const value = slugify(raw, ctx.config.descriptionSeparator);
      done(value);
    });

    inputBox.onDidHide(() => done(undefined));
    inputBox.show();
  });
}
