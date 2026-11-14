import type { FileVersion, GitProvider, PullRequestRef, TreeEntry } from "./git-provider";
import { GitProviderError } from "./git-provider";

// GitHub REST API による実装。外部ライブラリ（Octokit 等）を使わず fetch だけで書くのは、
// 院内実装へ差し替えるときに依存を持ち越さないため。
export class GitHubProvider implements GitProvider {
  constructor(
    private readonly cfg: { token: string; owner: string; repo: string; baseBranch: string },
  ) {}

  private async request<T>(method: string, apiPath: string, body?: unknown): Promise<T> {
    const res = await fetch(`https://api.github.com/repos/${this.cfg.owner}/${this.cfg.repo}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      // 応答本文にはトークンは含まれないが、利用者向けには GitHub のメッセージだけを渡す。
      const detail = await res.json().catch(() => ({}));
      throw new GitProviderError(
        `GitHub API ${method} ${apiPath} が失敗しました: ${res.status} ${(detail as { message?: string }).message ?? ""}`,
        res.status,
      );
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  async getHeadCommit(): Promise<string> {
    const ref = await this.request<{ object: { sha: string } }>(
      "GET",
      `/git/ref/heads/${encodeURIComponent(this.cfg.baseBranch)}`,
    );
    return ref.object.sha;
  }

  async getTree(commit: string): Promise<TreeEntry[]> {
    const tree = await this.request<{ tree: TreeEntry[]; truncated: boolean }>(
      "GET",
      `/git/trees/${commit}?recursive=1`,
    );
    // 途中で切れたツリーで採番や存在確認をすると誤るため、黙って続けない。
    if (tree.truncated) throw new GitProviderError("リポジトリのツリーが大きすぎて取得しきれません", 502);
    return tree.tree;
  }

  async getFile(filePath: string, commit: string): Promise<FileVersion | null> {
    try {
      const file = await this.request<{ content: string; sha: string; encoding: string }>(
        "GET",
        `/contents/${encodePath(filePath)}?ref=${commit}`,
      );
      return { content: Buffer.from(file.content, "base64").toString("utf8"), version: file.sha };
    } catch (e) {
      if (e instanceof GitProviderError && e.status === 404) return null;
      throw e;
    }
  }

  async listOpenPullRequestsTouching(filePath: string): Promise<PullRequestRef[]> {
    const pulls = await this.request<{ number: number; html_url: string; title: string }[]>(
      "GET",
      `/pulls?state=open&base=${encodeURIComponent(this.cfg.baseBranch)}&per_page=50`,
    );
    const hits: PullRequestRef[] = [];
    for (const pr of pulls) {
      const files = await this.request<{ filename: string }[]>("GET", `/pulls/${pr.number}/files?per_page=100`);
      if (files.some((f) => f.filename === filePath)) {
        hits.push({ number: pr.number, url: pr.html_url, title: pr.title });
      }
    }
    return hits;
  }

  async createBranch(name: string, fromCommit: string): Promise<void> {
    await this.request("POST", "/git/refs", { ref: `refs/heads/${name}`, sha: fromCommit });
  }

  async deleteBranch(name: string): Promise<void> {
    await this.request("DELETE", `/git/refs/heads/${encodePath(name)}`);
  }

  async putFile(args: {
    branch: string;
    path: string;
    content: string;
    version: string;
    message: string;
  }): Promise<void> {
    // sha（取得時のバージョン）を渡すと、ブランチ上のファイルがそれと違えば GitHub が拒否する。
    await this.request("PUT", `/contents/${encodePath(args.path)}`, {
      message: args.message,
      content: Buffer.from(args.content, "utf8").toString("base64"),
      sha: args.version,
      branch: args.branch,
    });
  }

  async createPullRequest(args: { head: string; title: string; body: string }): Promise<PullRequestRef> {
    const pr = await this.request<{ number: number; html_url: string; title: string }>("POST", "/pulls", {
      title: args.title,
      head: args.head,
      base: this.cfg.baseBranch,
      body: args.body,
    });
    return { number: pr.number, url: pr.html_url, title: pr.title };
  }
}

function encodePath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}
