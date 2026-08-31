import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/site";

const nextConfig: NextConfig = {
  // 配信先は GitHub Pages（静的ホスティングのみ）。実行時サーバーを前提にしないよう
  // 静的エクスポートに固定する。
  output: "export",
  images: {
    // 静的エクスポートではデフォルトの画像最適化（サーバー処理）が使えないため無効化する。
    unoptimized: true,
  },
  // GitHub Pages のプロジェクトサイト（サブパス配信）に備える。BASE_PATH が空のうちは
  // 何も設定しない（basePath は空文字を受け付けないため）。
  ...(BASE_PATH ? { basePath: BASE_PATH, assetPrefix: BASE_PATH } : {}),
};

export default nextConfig;
