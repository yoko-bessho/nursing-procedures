// Git サーバーとのやり取りの境界。院内では Gitea / GitLab に差し替えるため、申請の処理は
// このインターフェースだけに依存させ、GitHub 固有の API はここの実装側に閉じ込める。

export type TreeEntry = { path: string; type: "blob" | "tree" };

export type FileVersion = {
  content: string;
  // ファイルのバージョン（GitHub では blob の SHA）。取得後に main が変わっていないかの判定に使う。
  version: string;
};

export type PullRequestRef = { number: number; url: string; title: string };

export interface GitProvider {
  // ベースブランチの先頭コミット。ブランチ作成の起点と、ツリー・ファイル取得の基準をそろえるのに使う。
  getHeadCommit(): Promise<string>;
  getTree(commit: string): Promise<TreeEntry[]>;
  getFile(path: string, commit: string): Promise<FileVersion | null>;
  listOpenPullRequestsTouching(path: string): Promise<PullRequestRef[]>;
  createBranch(name: string, fromCommit: string): Promise<void>;
  deleteBranch(name: string): Promise<void>;
  putFile(args: {
    branch: string;
    path: string;
    content: string;
    version: string;
    message: string;
  }): Promise<void>;
  createPullRequest(args: { head: string; title: string; body: string }): Promise<PullRequestRef>;
}

export class GitProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
