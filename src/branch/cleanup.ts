import * as vscode from "vscode";
import type { Repository, Ref } from "../utils/git";

/**
 * Interactive branch cleanup command.
 *
 * Shows all local branches (excluding the current HEAD branch),
 * lets the user multi-select which to delete, confirms, then deletes.
 * Also runs `git fetch --prune` to clean up stale remote-tracking refs.
 */
export async function cleanupBranches(repo: Repository): Promise<void> {
  // Get current HEAD branch name
  const headBranch = repo.state.HEAD?.name;

  // Fetch all local branches
  let branches: Ref[];
  try {
    branches = await repo.getBranches({ remote: false });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    void vscode.window.showErrorMessage(`Failed to list branches: ${errMsg}`);
    return;
  }

  // Filter out the current branch and HEAD
  const deletableBranches = branches.filter(
    (b) => b.name && b.name !== headBranch && b.name !== "HEAD",
  );

  if (deletableBranches.length === 0) {
    void vscode.window.showInformationMessage(
      "No local branches to clean up (only the current branch exists).",
    );
    return;
  }

  // Build QuickPick items
  const items: vscode.QuickPickItem[] = deletableBranches.map((b) => ({
    label: b.name ?? "(unnamed)",
    description: b.commit ? `$(git-commit) ${b.commit.slice(0, 7)}` : undefined,
    picked: false,
  }));

  const selected = await vscode.window.showQuickPick(items, {
    title: "Cleanup Local Branches — Select branches to delete",
    placeHolder: "Select branches to delete (multi-select)",
    canPickMany: true,
    ignoreFocusOut: true,
  });

  if (!selected || selected.length === 0) {
    void vscode.window.showInformationMessage("No branches selected for deletion.");
    return;
  }

  // Confirm deletion
  const branchList = selected.map((s) => `• ${s.label}`).join("\n");
  const confirm = await vscode.window.showWarningMessage(
    `Delete ${selected.length} branch(es)?\n\n${branchList}`,
    { modal: true },
    "Delete",
    "Cancel",
  );

  if (confirm !== "Delete") {
    return;
  }

  // Delete selected branches
  const errors: string[] = [];
  const deleted: string[] = [];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Deleting branches...",
      cancellable: false,
    },
    async (progress) => {
      for (const item of selected) {
        const branchName = item.label;
        progress.report({ message: branchName });
        try {
          await repo.deleteBranch(branchName, false /* no force */);
          deleted.push(branchName);
        } catch (err) {
          // Try with force if normal delete failed (unmerged branch)
          try {
            await repo.deleteBranch(branchName, true /* force */);
            deleted.push(branchName);
          } catch (forceErr) {
            const errMsg = forceErr instanceof Error ? forceErr.message : String(forceErr);
            errors.push(`${branchName}: ${errMsg}`);
          }
        }
      }
    },
  );

  // Prune remote-tracking refs
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Pruning stale remote-tracking refs...",
        cancellable: false,
      },
      async () => {
        await repo.fetch(undefined, undefined, undefined);
      },
    );
  } catch {
    // Fetch --prune failure is non-critical; just warn
    void vscode.window.showWarningMessage(
      "Could not prune remote-tracking refs (fetch failed). Branches were still deleted locally.",
    );
  }

  // Report results
  if (deleted.length > 0) {
    void vscode.window.showInformationMessage(
      `Deleted ${deleted.length} branch(es): ${deleted.join(", ")}`,
    );
  }

  if (errors.length > 0) {
    void vscode.window.showErrorMessage(`Failed to delete: ${errors.join("; ")}`);
  }
}
