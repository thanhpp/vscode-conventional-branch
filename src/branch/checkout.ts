import * as vscode from "vscode";
import type { Repository, Ref } from "../utils/git";

/**
 * Sentinel value returned when the user chooses to create a new conventional branch.
 */
export const CREATE_NEW = "__create_new__";

interface BranchItem extends vscode.QuickPickItem {
  /** The name to pass to repo.checkout(). Undefined for the "create new" item. */
  checkoutName?: string;
}

/**
 * Show a QuickPick listing all local and remote branches.
 * The first item is always "Create a new conventional branch".
 *
 * Returns:
 * - `CREATE_NEW`   — user wants to run the creation wizard
 * - branch string  — name to pass to `repo.checkout()`
 * - `undefined`    — user cancelled (Esc)
 */
export async function pickBranchOrCreate(repo: Repository): Promise<string | undefined> {
  const [localBranches, remoteBranches] = await Promise.all([
    repo.getBranches({ remote: false }),
    repo.getBranches({ remote: true }),
  ]);

  const currentBranch = repo.state.HEAD?.name;

  const items: BranchItem[] = [];

  // Always-first: create new conventional branch
  items.push({
    label: "$(add) Create a new conventional branch",
    description: "Open the branch creation wizard",
    alwaysShow: true,
  });

  // Local branches
  const localFiltered = localBranches.filter(
    (b): b is Ref & { name: string } => !!b.name && b.name !== "HEAD",
  );
  if (localFiltered.length > 0) {
    items.push({ label: "Local", kind: vscode.QuickPickItemKind.Separator });
    for (const b of localFiltered) {
      const isCurrent = b.name === currentBranch;
      items.push({
        label: b.name,
        description: isCurrent ? "$(check) current" : b.commit ? b.commit.slice(0, 7) : undefined,
        checkoutName: b.name,
      });
    }
  }

  // Remote branches (filter out remote/HEAD pointers)
  const remoteFiltered = remoteBranches.filter(
    (b): b is Ref & { name: string; remote: string } =>
      !!b.name && !!b.remote && !b.name.endsWith("/HEAD"),
  );
  if (remoteFiltered.length > 0) {
    items.push({ label: "Remote", kind: vscode.QuickPickItemKind.Separator });
    for (const b of remoteFiltered) {
      // Strip "remote/" prefix so Git DWIM creates a local tracking branch on checkout
      const localName = b.name.slice(b.remote.length + 1);
      items.push({
        label: b.name,
        description: b.commit ? b.commit.slice(0, 7) : undefined,
        checkoutName: localName,
      });
    }
  }

  const picked = await vscode.window.showQuickPick(items, {
    title: "Conventional Branch — Checkout or Create",
    placeHolder: "Select a branch to checkout, or create a new one",
    ignoreFocusOut: true,
  });

  if (!picked) {
    return undefined;
  }

  if (!picked.checkoutName) {
    return CREATE_NEW;
  }

  return picked.checkoutName;
}
