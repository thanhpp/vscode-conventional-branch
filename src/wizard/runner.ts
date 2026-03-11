import * as vscode from "vscode";
import type { WizardContext, WizardStep, StepResult } from "./types";
import type { ExtensionConfig } from "../config/settings";
import { parseTemplate, formatBranch } from "../branch/formatter";
import { validateBranchName, sanitizeBranchName } from "../branch/sanitizer";
import { inputUserStep } from "./steps/inputUser";
import { selectTypeStep } from "./steps/selectType";
import { selectScopeStep } from "./steps/selectScope";
import { selectServiceStep } from "./steps/selectService";
import { inputDescriptionStep } from "./steps/inputDescription";

/**
 * Map of variable name → step factory function.
 * The wizard runner will look up steps based on the variables present in the template.
 */
const STEP_REGISTRY: Record<string, (ctx: WizardContext) => Promise<StepResult>> = {
  user: inputUserStep,
  type: selectTypeStep,
  scope: selectScopeStep,
  service: selectServiceStep,
  description: inputDescriptionStep,
};

/**
 * Build the ordered list of WizardStep objects based on the format template.
 * Only variables present in the template get a wizard step.
 */
function buildSteps(format: string): WizardStep[] {
  const variables = parseTemplate(format);
  const steps: WizardStep[] = [];

  for (const variable of variables) {
    const stepFn = STEP_REGISTRY[variable];
    if (stepFn) {
      steps.push({
        variable,
        run: stepFn,
      });
    }
  }

  return steps;
}

export interface WizardResult {
  branchName: string;
  cancelled: boolean;
}

/**
 * Run the full wizard and return the final branch name.
 *
 * Supports back-navigation: if a step returns "back", the runner goes back
 * to the previous step (re-running it). Steps cannot go back past step 0.
 *
 * Returns undefined if the user cancelled at any point.
 */
export async function runWizard(
  config: ExtensionConfig,
  extensionContext: vscode.ExtensionContext,
): Promise<string | undefined> {
  const steps = buildSteps(config.format);

  if (steps.length === 0) {
    void vscode.window.showErrorMessage(
      "The branch format template contains no recognized variables. " +
        "Please check your conventionalBranch.format setting.",
    );
    return undefined;
  }

  const ctx: WizardContext = {
    collected: {},
    format: config.format,
    config,
    extensionContext,
  };

  let stepIndex = 0;

  while (stepIndex < steps.length) {
    const step = steps[stepIndex];

    // Pre-populate context with current collected values (so preview works)
    const result = await step.run(ctx);

    if (result === undefined) {
      // User cancelled (Esc)
      return undefined;
    }

    if (result === "back") {
      if (stepIndex === 0) {
        // Can't go back further — treat as cancel
        return undefined;
      }
      // Remove the value collected by the previous step so it gets re-collected
      const prevStep = steps[stepIndex - 1];
      delete ctx.collected[prevStep.variable];
      stepIndex--;
      continue;
    }

    ctx.collected[step.variable] = result;
    stepIndex++;
  }

  // All steps complete — build the branch name
  const rawBranchName = formatBranch(ctx.format, ctx.collected, {
    separator: config.descriptionSeparator,
    lowercase: config.lowercaseOnly,
    maxLength: 0, // Don't truncate yet; we validate first
  });

  // Sanitize
  const branchName = sanitizeBranchName(
    rawBranchName,
    config.descriptionSeparator,
    config.lowercaseOnly,
    config.maxLength,
  );

  // Validate
  const validationError = validateBranchName(branchName);
  if (validationError) {
    void vscode.window.showErrorMessage(`Generated branch name is invalid: ${validationError}`);
    return undefined;
  }

  return branchName;
}
