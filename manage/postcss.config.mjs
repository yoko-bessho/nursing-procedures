// 申請画面のプレビューを閲覧サイトと同じ見た目にするため、閲覧サイトの globals.css（Tailwind）を
// そのまま読み込む。Next は PostCSS の設定をアプリのディレクトリから探すので、ルートの設定を再利用する。
export { default } from "../postcss.config.mjs";
