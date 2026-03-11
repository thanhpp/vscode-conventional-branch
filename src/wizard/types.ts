import type { ExtensionConfig } from "../config/settings";
import type * as vscode from "vscode";

/**
 * Context passed through all wizard steps.
 */
export interface WizardContext {
  /** Values collected so far, keyed by variable name (e.g. "user", "type") */
  collected: Record<string, string>;
  /** The branch format template */
  format: string;
  /** Extension configuration */
  config: ExtensionConfig;
  /** VS Code extension context for globalState access */
  extensionContext: vscode.ExtensionContext;
}

/**
 * Result of a wizard step execution.
 * - string: the collected value (may be empty string for skipped optional steps)
 * - "back": user wants to go back to the previous step
 * - undefined: user cancelled (Esc) → abort wizard
 */
export type StepResult = string | "back" | undefined;

/**
 * A single wizard step.
 */
export interface WizardStep {
  /** The template variable this step collects (e.g. "user", "type") */
  variable: string;
  /** Execute the step UI. Returns StepResult. */
  run(ctx: WizardContext): Promise<StepResult>;
}

/** Label used for the "go back" quick pick item */
export const BACK_LABEL = "$(arrow-left) Back";

/** Label used for "skip" quick pick item */
export const SKIP_LABEL = "$(circle-slash) Skip";
