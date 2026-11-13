import { gitConfig } from "./config";
import type { GitProvider } from "./git-provider";
import { GitHubProvider } from "./github-provider";

// Route Handler から使う Git 実装の生成口。院内 Git へ移すときはここで実装を切り替える。
export function gitProvider(): GitProvider {
  return new GitHubProvider(gitConfig());
}
