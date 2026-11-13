import fs from "node:fs";
import path from "node:path";

// サーバー側でだけ読む設定。Git のトークンはここから Route Handler にだけ渡り、ブラウザへは出さない。
// 値は manage/.env.local（gitignore 済み）に置く。

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`環境変数 ${name} が未設定です（manage/.env.local）`);
  return value;
}

export function gitConfig() {
  return {
    token: required("GITHUB_TOKEN"),
    owner: required("GITHUB_OWNER"),
    repo: required("GITHUB_REPO"),
    baseBranch: process.env.GITHUB_BASE_BRANCH ?? "main",
  };
}

// 書き込み系 API を受け付けるオリジン。認証がない段階では、これが「別サイトから localhost の API を
// 叩かれる」攻撃を防ぐ唯一の壁になるため、既定は開発サーバー自身のオリジンだけにする。
export function allowedOrigins(): string[] {
  const raw = process.env.MANAGE_ALLOWED_ORIGINS ?? "http://127.0.0.1:3001";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// 既存の検査スクリプト（scripts/*.mjs）を移植せずに呼ぶため、リポジトリのルートを特定する。
// `npm run dev:manage` はルートで実行され、Next はディレクトリ指定でも作業ディレクトリを変えない。
// manage/ で直接起動された場合に備えて親もたどる。
export function repoRoot(): string {
  for (const dir of [process.cwd(), path.dirname(process.cwd())]) {
    if (fs.existsSync(path.join(dir, "scripts", "check-patient-info.mjs"))) return dir;
  }
  throw new Error("リポジトリのルート（scripts/ のある場所）が見つかりません");
}
