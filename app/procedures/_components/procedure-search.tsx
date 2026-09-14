"use client";

import Link from "next/link";
import MiniSearch from "minisearch";
import { useState } from "react";
import { makeExcerpt, SEARCH_INDEX_PATH, tokenize, type SearchDocument } from "@/lib/search";
import { BASE_PATH } from "@/lib/site";

type Engine = {
  index: MiniSearch<SearchDocument>;
  docs: Map<string, SearchDocument>
};

const MAX_RESULTS = 10;

// ページを離れて戻っても再取得・再構築しないよう、モジュールスコープで 1 回だけ読み込む。
let enginePromise: Promise<Engine> | null = null;

function loadEngine(): Promise<Engine> {
  // fetch は next/link と違って basePath を補わないため、ここでだけ BASE_PATH を前置する。
  enginePromise ??= fetch(`${BASE_PATH}${SEARCH_INDEX_PATH}`)
    .then((res) => {
      if (!res.ok) throw new Error(`検索データの取得に失敗しました（${res.status}）`);
      return res.json() as Promise<SearchDocument[]>;
    })
    .then((docs) => {
      const index = new MiniSearch<SearchDocument>({
        fields: ["title", "tags", "summary", "body"],
        tokenize,
        // tags は配列なので、他の項目と同じく 1 つの文字列にしてから tokenize に渡す。
        extractField: (doc, field) =>
          field === "tags" ? doc.tags.join(" ") : doc[field as keyof SearchDocument],
        searchOptions: {
          boost: { title: 3, tags: 2 },
          // OR だと「気管吸引」で「気管」だけを含む手順まで拾うため、すべての 2 文字組を含むものに絞る。
          combineWith: "AND",
          // 1 文字の入力は 2 文字組と一致しないので、その文字で始まる組を前方一致で拾う。
          prefix: (term) => term.length === 1,
        },
      });
      index.addAll(docs);
      return { index, docs: new Map(docs.map((doc) => [doc.id, doc])) };
    })
    .catch((error: unknown) => {
      // 失敗した Promise を残すと二度と読み込めないので、破棄して次のフォーカスで再試行させる。
      enginePromise = null;
      throw error;
    });
  return enginePromise;
}

export function ProcedureSearch() {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [query, setQuery] = useState("");

  // 検索しない閲覧では検索データを落とさないよう、初めてフォーカスしたときに読み込む。
  function handleFocus() {
    if (engine || status === "loading") return;
    setStatus("loading");
    loadEngine().then(
      (loaded) => {
        setEngine(loaded);
        setStatus("idle");
      },
      () => setStatus("error"),
    );
  }

  const trimmed = query.trim();
  const results =
    engine && trimmed
      ? engine.index
          .search(trimmed)
          .slice(0, MAX_RESULTS)
          .map((result) => {
            const doc = engine.docs.get(result.id)!;
            return { doc, excerpt: makeExcerpt(doc.body, trimmed) };
          })
      : [];

  return (
    <div role="search" className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        aria-label="手順を検索"
        placeholder="手順を検索（例: 吸引、鎮静）"
        className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />

      {/* ヘッダーに置くため、結果は下に流し込まず浮かせる。流し込むとヘッダーの高さが入力ごとに
          変わり、ページ全体が上下に動いてしまう。 */}
      {trimmed && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-black/10 bg-background shadow-lg dark:border-white/15">
          {status === "loading" && (
            <p className="px-3 py-2 text-sm text-black/60 dark:text-white/60">読み込み中…</p>
          )}
          {status === "error" && (
            <p className="px-3 py-2 text-sm text-red-700 dark:text-red-300">
              検索データを読み込めませんでした。入力欄を選び直すと再試行します。
            </p>
          )}
          {engine &&
            (results.length > 0 ? (
              <ul className="max-h-96 divide-y divide-black/10 overflow-y-auto dark:divide-white/15">
                {results.map(({ doc, excerpt }) => (
                  <li key={doc.id}>
                    <Link
                      href={`/procedures/${doc.id}`}
                      className="block px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <span className="text-sm font-medium">{doc.title}</span>
                      <span className="block text-xs text-black/50 dark:text-white/50">
                        {doc.majorTitle} › {doc.categoryTitle}
                      </span>
                      {excerpt && (
                        <span className="mt-0.5 block text-xs text-black/70 dark:text-white/70">
                          {excerpt.before}
                          <mark className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-400/30">
                            {excerpt.hit}
                          </mark>
                          {excerpt.after}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-2 text-sm text-black/60 dark:text-white/60">
                該当する手順はありません
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
