import path from "node:path";
import type { NextConfig } from "next";

// 申請アプリ（修正申請・追加申請と Git 操作）。閲覧サイトは静的エクスポートのまま変えず、
// サーバー処理が要るものだけをこの別アプリに置く。院内では Nginx で同じドメインの /manage/ に並べる。
const nextConfig: NextConfig = {
  // 閲覧サイトと同じドメインに置くと、両アプリの資材が /_next/ で衝突する。
  // basePath で申請アプリ側を /manage/_next/ に寄せて分ける。
  basePath: "/manage",
  // 閲覧サイトの部品（本文表示など）を共有し、依存もルートの node_modules を共有する。
  // ルート外のファイルはコンパイル対象にならないため、リポジトリのルートを明示する。
  turbopack: {
    root: path.join(import.meta.dirname, ".."),
  },
};

export default nextConfig;
