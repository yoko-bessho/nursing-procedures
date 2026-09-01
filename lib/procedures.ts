import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { BASE_PATH, PROCEDURE_ASSETS_PREFIX } from "./site";

// `@/*` はリポジトリルート解決だが、コンテンツはビルド時にファイルシステムから読むので
// process.cwd() を起点にする（インポートではなく I/O のため）。
const PROCEDURES_DIR = path.join(process.cwd(), "procedures");

// ディレクトリ名は「2 桁以上の数字プレフィックス + '-' + コード」。数字は並び順専用で URL には出さない。
const DIR_NAME_RE = /^\d{2,}-[a-z0-9-]+$/;
const PREFIX_RE = /^\d+-/;

export type CategoryFrontmatter = {
  title: string;
  description?: string;
};

export type ProcedureFrontmatter = {
  title: string;
  summary?: string;
  tags: string[];
  updated?: string;
};

export type ProcedureRef = {
  major: string;
  category: string;
  procedure: string;
};

export type ProcedureSummary = ProcedureRef &
  ProcedureFrontmatter & {
    routePath: string;
  };

export type CategoryNode = {
  slug: string;
  title: string;
  description?: string;
  routePath: string;
  procedures: ProcedureSummary[];
};

export type MajorNode = {
  slug: string;
  title: string;
  description?: string;
  routePath: string;
  categories: CategoryNode[];
};

export type ProcedureDetail = ProcedureRef & {
  frontmatter: ProcedureFrontmatter;
  markdown: string;
  routePath: string;
};

// 先頭の数字を並び順キーとして取り出す。プレフィックスが無い場合は末尾送り。
function orderOf(dirName: string): number {
  const m = dirName.match(/^(\d+)/);
  return m ? Number.parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

// ディレクトリ名 → URL セグメント（数字プレフィックスを除去）。
function toSegment(dirName: string): string {
  return dirName.replace(PREFIX_RE, "");
}

function listChildDirs(absDir: string): string[] {
  return fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "images")
    .map((e) => e.name)
    .sort((a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b));
}

function readCategory(absDir: string): CategoryFrontmatter {
  const file = path.join(absDir, "_category.md");
  if (!fs.existsSync(file)) {
    throw new Error(`_category.md が見つかりません: ${path.relative(process.cwd(), absDir)}`);
  }
  const { data } = matter(fs.readFileSync(file, "utf8"));
  if (typeof data.title !== "string" || data.title.trim() === "") {
    throw new Error(`_category.md の title が未設定です: ${path.relative(process.cwd(), file)}`);
  }
  return {
    title: data.title,
    description: typeof data.description === "string" ? data.description : undefined,
  };
}

function readProcedureFrontmatter(absDir: string): ProcedureFrontmatter {
  const file = path.join(absDir, "index.md");
  if (!fs.existsSync(file)) {
    throw new Error(`index.md が見つかりません: ${path.relative(process.cwd(), absDir)}`);
  }
  const { data } = matter(fs.readFileSync(file, "utf8"));
  if (typeof data.title !== "string" || data.title.trim() === "") {
    throw new Error(`index.md の title が未設定です: ${path.relative(process.cwd(), file)}`);
  }
  return {
    title: data.title,
    summary: typeof data.summary === "string" ? data.summary : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    updated: data.updated != null ? String(data.updated) : undefined,
  };
}

// procedures/ ツリー全体を大分類→カテゴリ→手順の入れ子で返す（一覧ページ用）。
export function getProcedureTree(): MajorNode[] {
  return listChildDirs(PROCEDURES_DIR).map((majorDir) => {
    const majorAbs = path.join(PROCEDURES_DIR, majorDir);
    const majorSlug = toSegment(majorDir);
    const majorMeta = readCategory(majorAbs);

    const categories = listChildDirs(majorAbs).map((catDir) => {
      const catAbs = path.join(majorAbs, catDir);
      const catSlug = toSegment(catDir);
      const catMeta = readCategory(catAbs);

      const procedures = listChildDirs(catAbs).map((procDir): ProcedureSummary => {
        const procSlug = toSegment(procDir);
        const fm = readProcedureFrontmatter(path.join(catAbs, procDir));
        return {
          major: majorSlug,
          category: catSlug,
          procedure: procSlug,
          routePath: `${majorSlug}/${catSlug}/${procSlug}`,
          ...fm,
        };
      });

      return {
        slug: catSlug,
        title: catMeta.title,
        description: catMeta.description,
        routePath: `${majorSlug}/${catSlug}`,
        procedures,
      };
    });

    return {
      slug: majorSlug,
      title: majorMeta.title,
      description: majorMeta.description,
      routePath: majorSlug,
      categories,
    };
  });
}

// generateStaticParams 用に、全手順のルートパラメータを平坦な配列で返す。
export function getAllProcedureParams(): ProcedureRef[] {
  return getProcedureTree().flatMap((major) =>
    major.categories.flatMap((cat) =>
      cat.procedures.map((p) => ({
        major: p.major,
        category: p.category,
        procedure: p.procedure,
      })),
    ),
  );
}

export function getMajor(majorSlug: string): MajorNode | undefined {
  return getProcedureTree().find((m) => m.slug === majorSlug);
}

export function getCategory(majorSlug: string, categorySlug: string): CategoryNode | undefined {
  return getMajor(majorSlug)?.categories.find((c) => c.slug === categorySlug);
}

// URL セグメントから実ディレクトリを逆引きし、手順本文と frontmatter を返す。
export function getProcedure(
  majorSlug: string,
  categorySlug: string,
  procedureSlug: string,
): ProcedureDetail | undefined {
  const majorDir = listChildDirs(PROCEDURES_DIR).find((d) => toSegment(d) === majorSlug);
  if (!majorDir) return undefined;
  const majorAbs = path.join(PROCEDURES_DIR, majorDir);

  const catDir = listChildDirs(majorAbs).find((d) => toSegment(d) === categorySlug);
  if (!catDir) return undefined;
  const catAbs = path.join(majorAbs, catDir);

  const procDir = listChildDirs(catAbs).find((d) => toSegment(d) === procedureSlug);
  if (!procDir) return undefined;
  const procAbs = path.join(catAbs, procDir);

  const raw = fs.readFileSync(path.join(procAbs, "index.md"), "utf8");
  const { content } = matter(raw);
  return {
    major: majorSlug,
    category: categorySlug,
    procedure: procedureSlug,
    frontmatter: readProcedureFrontmatter(procAbs),
    markdown: content,
    routePath: `${majorSlug}/${categorySlug}/${procedureSlug}`,
  };
}

// Markdown 内の相対画像パス（images/foo.png）を、コピー済みアセットの絶対パスへ変換する。
export function resolveImageSrc(routePath: string, src: string): string {
  if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(src) || src.startsWith("/")) return src;
  const clean = src.replace(/^\.\//, "");
  return `${BASE_PATH}/${PROCEDURE_ASSETS_PREFIX}/${routePath}/${clean}`;
}

export { DIR_NAME_RE, PREFIX_RE, toSegment, orderOf, PROCEDURES_DIR };
