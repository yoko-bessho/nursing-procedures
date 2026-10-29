import type { NextConfig } from "next";
import { BASE_PATH } from "./lib/site";

const nextConfig: NextConfig = {
  // 配信先は静的ホスティングのみ（テストは GitHub Pages、将来は院内 Web サーバーを想定）。
  // どの配信先にも載せ替えられるよう、実行時サーバーを前提にせず静的エクスポートに固定する。
  output: "export",
  images: {
    // 静的エクスポートではデフォルトの画像最適化（サーバー処理）が使えないため無効化する。
    unoptimized: true,
  },
  // サブパス配信（GitHub Pages のプロジェクトサイトなど）に備える。ルート配信のときは
  // BASE_PATH が空なので何も設定しない（basePath は空文字を受け付けないため）。
  ...(BASE_PATH ? { basePath: BASE_PATH, assetPrefix: BASE_PATH } : {}),
};

export default nextConfig;
