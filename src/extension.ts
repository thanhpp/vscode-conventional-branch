import * as vscode from "vscode";
import { getConfig } from "./config/settings";
import { getGitAPI, pickRepository } from "./utils/git";
import { runWizard } from "./wizard/runner";
import { createBranch } from "./branch/creator";
import { cleanupBranches } from "./branch/cleanup";
import { pickBranchOrCreate, CREATE_NEW } from "./branch/checkout";
import { GLOBAL_STATE_KEYS } from "./config/defaults";

export function activate(context: vscode.ExtensionContext): void {
  // Command: Create Conventional Branch
  const createCmd = vscode.commands.registerCommand(
    "conventionalBranch.create",
    async () => {
      const gitAPI = getGitAPI();
      if (!gitAPI) {
        void vscode.window.showErrorMessage(
          "Git extension is not available. Please ensure the built-in Git extension is active.",
        );
        return;
      }

      const repo = await pickRepository(gitAPI);
      if (!repo) {
        return; // User cancelled or no repo found
      }

      const choice = await pickBranchOrCreate(repo);
      if (!choice) {
        return; // User cancelled
      }

      if (choice === CREATE_NEW) {
        const config = getConfig();
        const branchName = await runWizard(config, context);
        if (!branchName) {
          return; // User cancelled wizard
        }
        await createBranch(repo, branchName, config.baseBranch || undefined, config.autoPush);
      } else {
        try {
          await repo.checkout(choice);
        } catch (err) {
          void vscode.window.showErrorMessage(
            `Failed to checkout '${choice}': ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    },
  );

  // Command: Cleanup Local Branches
  const cleanupCmd = vscode.commands.registerCommand(
    "conventionalBranch.cleanup",
    async () => {
      const gitAPI = getGitAPI();
      if (!gitAPI) {
        void vscode.window.showErrorMessage(
          "Git extension is not available. Please ensure the built-in Git extension is active.",
        );
        return;
      }

      const repo = await pickRepository(gitAPI);
      if (!repo) {
        return;
      }

      await cleanupBranches(repo);
    },
  );

  // Command: Clear Cached User Prefix
  const clearUserCmd = vscode.commands.registerCommand(
    "conventionalBranch.clearUserCache",
    async () => {
      await context.globalState.update(GLOBAL_STATE_KEYS.USER_CACHE, undefined);
      void vscode.window.showInformationMessage("Conventional Branch: User prefix cache cleared.");
    },
  );

  context.subscriptions.push(createCmd, cleanupCmd, clearUserCmd);
}

export function deactivate(): void {
  // Nothing to clean up
}
