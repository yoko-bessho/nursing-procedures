import matter from "gray-matter";
import { DIR_NAME_RE, toSegment } from "@/lib/procedures";
import type { TreeEntry } from "./git-provider";

// URL のセグメント（数字プレフィックスを除いた名前）から、Git 上の index.md のパスを逆引きする。
// 判定は閲覧サイトのローダーと同じ関数（toSegment / DIR_NAME_RE）を使い、URL とファイルの対応をずらさない。
export function findProcedurePath(
  tree: TreeEntry[],
  major: string,
  category: string,
  procedure: string,
): string | null {
  const dirs = tree.filter((e) => e.type === "tree").map((e) => e.path);
  const child = (parent: string, segment: string) =>
    dirs.find((d) => {
      const name = d.slice(parent.length + 1);
      return d.startsWith(`${parent}/`) && !name.includes("/") && DIR_NAME_RE.test(name) && toSegment(name) === segment;
    });
  const majorDir = child("procedures", major);
  const categoryDir = majorDir && child(majorDir, category);
  const procedureDir = categoryDir && child(categoryDir, procedure);
  if (!procedureDir) return null;
  const file = `${procedureDir}/index.md`;
  return tree.some((e) => e.type === "blob" && e.path === file) ? file : null;
}

export type EditableFields = {
  title: string;
  summary: string;
  tags: string[];
  body: string;
};

const EDITABLE_KEYS = new Set(["title", "summary", "tags", "updated"]);

export type ParsedProcedure = EditableFields & { updated?: string };

export function parseProcedure(raw: string): ParsedProcedure {
  const { data, content } = matter(raw);
  // 知らない項目があるまま書き戻すと、その項目を落とすか書式を崩す。黙って失うより編集を断る。
  const unknown = Object.keys(data).filter((k) => !EDITABLE_KEYS.has(k));
  if (unknown.length > 0) {
    throw new Error(`この手順には申請画面で扱えない項目があります: ${unknown.join(", ")}`);
  }
  return {
    title: String(data.title ?? ""),
    summary: typeof data.summary === "string" ? data.summary : "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    updated: data.updated instanceof Date ? data.updated.toISOString().slice(0, 10) : data.updated,
    body: content,
  };
}

// YAML として特別な意味を持ちうる値だけを引用符で囲む。gray-matter（js-yaml）で書き戻すと
// tags の書き方や日付の表記が既存ファイルと変わり、PR の差分が本質と無関係な行で埋まるため、
// 既存ファイルと同じ書式で手書きする。
function yamlScalar(value: string): string {
  const needsQuote =
    value === "" ||
    /^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
    /[:#]\s|\s#|:$|\s$/.test(value) ||
    /[\n\r\t]/.test(value) ||
    /^(true|false|yes|no|on|off|null|~|[-+]?\d[\d_.:eE+-]*)$/i.test(value);
  // JSON の文字列表記は YAML の二重引用符文字列としてそのまま正しい。
  return needsQuote ? JSON.stringify(value) : value;
}

export function serializeProcedure(fields: EditableFields, updated: string): string {
  const lines = [`title: ${yamlScalar(fields.title)}`];
  if (fields.summary) lines.push(`summary: ${yamlScalar(fields.summary)}`);
  if (fields.tags.length > 0) {
    lines.push(`tags: [${fields.tags.map((t) => (/[,[\]]/.test(t) ? JSON.stringify(t) : yamlScalar(t))).join(", ")}]`);
  }
  lines.push(`updated: ${updated}`);
  const raw = `---\n${lines.join("\n")}\n---\n${fields.body}`;

  // 手書きの YAML が意図どおりに読めるかを、閲覧サイトと同じパーサーで読み戻して確かめる。
  const back = parseProcedure(raw);
  if (
    back.title !== fields.title ||
    back.summary !== fields.summary ||
    back.tags.join("\u0000") !== fields.tags.join("\u0000") ||
    back.body !== fields.body ||
    back.updated !== updated
  ) {
    throw new Error("frontmatter を正しく書き出せませんでした（記号の扱いを確認してください）");
  }
  return raw;
}

// 手順の更新日は日本時間の日付にそろえる（既存の updated は日付のみの表記）。
export function todayInTokyo(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}
