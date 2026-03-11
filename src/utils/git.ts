import * as vscode from "vscode";

// Type definitions for the VS Code Git Extension API
export interface GitExtension {
  getAPI(version: 1): GitAPI;
}

export interface GitAPI {
  repositories: Repository[];
  onDidOpenRepository: vscode.Event<Repository>;
}

export interface Repository {
  rootUri: vscode.Uri;
  state: RepositoryState;
  checkout(treeish: string): Promise<void>;
  createBranch(name: string, checkout: boolean, ref?: string): Promise<void>;
  deleteBranch(name: string, force?: boolean): Promise<void>;
  getBranches(query: BranchQuery): Promise<Ref[]>;
  pull(unshallow?: boolean): Promise<void>;
  push(remoteName?: string, branchName?: string, setUpstream?: boolean): Promise<void>;
  fetch(remote?: string, ref?: string, depth?: number): Promise<void>;
}

export interface RepositoryState {
  HEAD: Branch | undefined;
  refs: Ref[];
}

export interface Ref {
  type: RefType;
  name?: string;
  commit?: string;
  remote?: string;
}

export interface Branch extends Ref {
  upstream?: UpstreamRef;
  ahead?: number;
  behind?: number;
}

export interface UpstreamRef {
  remote: string;
  name: string;
}

export interface BranchQuery {
  remote: boolean;
  pattern?: string;
  count?: number;
  contains?: string;
}

export const enum RefType {
  Head = 0,
  RemoteHead = 1,
  Tag = 2,
}

/**
 * Get the VS Code Git Extension API.
 * Returns undefined if the Git extension is not installed or not activated.
 */
export function getGitAPI(): GitAPI | undefined {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) {
    return undefined;
  }

  if (!gitExtension.isActive) {
    return undefined;
  }

  return gitExtension.exports.getAPI(1);
}

/**
 * Get available repositories. Shows a picker if there are multiple.
 * Returns undefined if user cancels or no repo is available.
 */
export async function pickRepository(gitAPI: GitAPI): Promise<Repository | undefined> {
  const repos = gitAPI.repositories;

  if (repos.length === 0) {
    void vscode.window.showErrorMessage(
      "No Git repositories found. Please open a folder with a Git repository.",
    );
    return undefined;
  }

  if (repos.length === 1) {
    return repos[0];
  }

  // Multi-root: let user pick
  const items = repos.map((repo) => ({
    label: repo.rootUri.fsPath.split("/").pop() ?? repo.rootUri.fsPath,
    description: repo.rootUri.fsPath,
    repo,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    title: "Select Repository",
    placeHolder: "Choose a repository to create the branch in",
  });

  return picked?.repo;
}

/**
 * Check if a branch name already exists locally.
 */
export async function branchExists(repo: Repository, branchName: string): Promise<boolean> {
  const branches = await repo.getBranches({ remote: false });
  return branches.some((b) => b.name === branchName);
}
