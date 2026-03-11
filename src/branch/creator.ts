import * as vscode from "vscode";
import type { Repository } from "../utils/git";
import { branchExists } from "../utils/git";

/**
 * Create a new Git branch and check it out.
 *
 * If baseBranch is provided, first check out that branch and pull,
 * then create the new branch from it.
 *
 * If the branch name already exists, offers to add a numeric suffix.
 */
export async function createBranch(
  repo: Repository,
  branchName: string,
  baseBranch?: string,
  autoPush: boolean = false,
): Promise<boolean> {
  // Check for duplicate branch name
  let finalName = branchName;
  if (await branchExists(repo, branchName)) {
    const resolution = await handleDuplicateBranch(branchName);
    if (!resolution) {
      return false; // User cancelled
    }
    finalName = resolution;
  }

  // Switch to base branch if specified
  if (baseBranch && baseBranch.trim().length > 0) {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Checking out base branch: ${baseBranch}`,
          cancellable: false,
        },
        async () => {
          await repo.checkout(baseBranch);
          await repo.pull();
        },
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Failed to checkout base branch "${baseBranch}": ${errMsg}`);
      return false;
    }
  }

  // Create and checkout the new branch
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating branch: ${finalName}`,
        cancellable: false,
      },
      async () => {
        await repo.createBranch(finalName, true /* checkout */);
      },
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to create branch "${finalName}": ${errMsg}`);
    return false;
  }

  void vscode.window.showInformationMessage(`Branch created: ${finalName}`);

  // Auto-push if configured
  if (autoPush) {
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pushing branch to remote: ${finalName}`,
          cancellable: false,
        },
        async () => {
          await repo.push(undefined, finalName, true /* setUpstream */);
        },
      );
      void vscode.window.showInformationMessage(`Branch pushed to remote: ${finalName}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      void vscode.window.showWarningMessage(
        `Branch created locally but push failed: ${errMsg}`,
      );
    }
  }

  return true;
}

/**
 * Handle a duplicate branch name by offering to add a numeric suffix or cancel.
 * Returns the new branch name, or undefined if user cancels.
 */
async function handleDuplicateBranch(branchName: string): Promise<string | undefined> {
  const suffix2 = `${branchName}-2`;

  const choice = await vscode.window.showWarningMessage(
    `Branch "${branchName}" already exists.`,
    { modal: true },
    `Use "${suffix2}"`,
    "Enter custom name",
    "Cancel",
  );

  if (!choice || choice === "Cancel") {
    return undefined;
  }

  if (choice === `Use "${suffix2}"`) {
    return suffix2;
  }

  // "Enter custom name"
  const custom = await vscode.window.showInputBox({
    title: "Custom Branch Name",
    prompt: "Enter a custom branch name",
    value: branchName,
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return "Branch name cannot be empty.";
      }
      return undefined;
    },
  });

  return custom?.trim() || undefined;
}
