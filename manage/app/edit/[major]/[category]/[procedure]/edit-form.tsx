"use client";

import { useEffect, useState } from "react";
import { ProcedureMarkdown } from "@/app/procedures/_components/procedure-markdown";
import { MANAGE_BASE_PATH } from "@/manage/lib/base-path";
import type { PullRequestRef } from "@/manage/lib/git-provider";
import { buildPullRequest, defaultPrTitle, formatRequestedAt, LIMITS } from "@/manage/lib/pr-body";

type Loaded = {
  filePath: string;
  version: string;
  title: string;
  summary: string;
  tags: string[];
  body: string;
  updated?: string;
  pendingPullRequests: PullRequestRef[];
};

type Result =
  | { kind: "created"; pullRequest: PullRequestRef; warnings: string[] }
  | { kind: "error"; message: string; messages?: string[]; conflict?: boolean };

const inputClass =
  "mt-1 w-full rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/25";

export function EditForm(props: { major: string; category: string; procedure: string }) {
  const routePath = `${props.major}/${props.category}/${props.procedure}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [requester, setRequester] = useState("");
  const [reason, setReason] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [prTitle, setPrTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${MANAGE_BASE_PATH}/api/procedures/${routePath}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(json.error ?? "読み込みに失敗しました");
          return;
        }
        const data = json as Loaded;
        setLoaded(data);
        setTitle(data.title);
        setSummary(data.summary);
        setTags(data.tags.join(", "));
        setBody(data.body);
        setPrTitle(defaultPrTitle(data.title));
      })
      .catch(() => !cancelled && setLoadError("読み込みに失敗しました"));
    return () => {
      cancelled = true;
    };
  }, [routePath]);

  if (loadError) return <p className="text-red-700 dark:text-red-400">{loadError}</p>;
  if (!loaded) return <p>Git から最新の内容を読み込んでいます…</p>;

  const tagList = tags
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean);
  // 申請者が確認する PR の文面。サーバーも同じ関数で作り直すので、ここで見たものがそのまま PR になる
  // （申請日時だけは送信時刻になる）。
  const prPreview = buildPullRequest(
    { requester, reason, changeNote, prTitle },
    {
      filePath: loaded.filePath,
      procedureTitle: title,
      baseVersion: loaded.version,
      requestedAt: formatRequestedAt(),
    },
  );

  async function submit() {
    if (!loaded) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`${MANAGE_BASE_PATH}/api/change-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          major: props.major,
          category: props.category,
          procedure: props.procedure,
          version: loaded.version,
          title,
          summary,
          tags: tagList,
          body,
          requester,
          reason,
          changeNote,
          prTitle,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult({ kind: "created", pullRequest: json.pullRequest, warnings: json.warnings ?? [] });
      } else {
        setResult({ kind: "error", message: json.error, messages: json.messages, conflict: res.status === 409 });
      }
    } catch {
      setResult({ kind: "error", message: "送信に失敗しました" });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.kind === "created") {
    return (
      <main className="max-w-3xl">
        <h1 className="text-2xl font-bold">申請しました</h1>
        <p className="mt-4">
          PR を作成しました:{" "}
          <a className="underline" href={result.pullRequest.url} target="_blank" rel="noreferrer">
            #{result.pullRequest.number} {result.pullRequest.title}
          </a>
        </p>
        <p className="mt-2 text-sm">承認者が Git 上で内容を確認し、承認・マージされると公開対象になります。</p>
        {result.warnings.length > 0 && <Messages title="警告（申請は受け付けました）" items={result.warnings} />}
      </main>
    );
  }

  return (
    <main>
      <h1 className="text-2xl font-bold">手順の修正申請</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        対象: <code>{loaded.filePath}</code>（Git の最新から読み込み）
      </p>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        認証はまだありません。申請者名は自己申告として PR に記録されます。
      </p>

      {loaded.pendingPullRequests.length > 0 && (
        <div className="mt-4 rounded border border-amber-500 p-3 text-sm">
          この手順には、まだ承認されていない修正の申請があります。重複や衝突に注意してください。
          <ul className="mt-1 list-disc pl-5">
            {loaded.pendingPullRequests.map((pr) => (
              <li key={pr.number}>
                <a className="underline" href={pr.url} target="_blank" rel="noreferrer">
                  #{pr.number} {pr.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold">手順の内容</h2>
          <Field label="タイトル">
            <input className={inputClass} value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="概要">
            <input className={inputClass} value={summary} maxLength={LIMITS.summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <Field label="タグ（カンマ区切り）">
            <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <Field label="本文（Markdown）">
            <textarea className={`${inputClass} font-mono text-sm`} rows={24} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>

          <h2 className="mt-8 text-lg font-bold">申請の内容</h2>
          <Field label="申請者名（自己申告）">
            <input className={inputClass} value={requester} maxLength={LIMITS.requester} onChange={(e) => setRequester(e.target.value)} />
          </Field>
          <Field label="修正理由（必須）">
            <textarea className={inputClass} rows={3} value={reason} maxLength={LIMITS.reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Field label="変更内容の説明（任意）">
            <textarea className={inputClass} rows={3} value={changeNote} maxLength={LIMITS.changeNote} onChange={(e) => setChangeNote(e.target.value)} />
          </Field>
          <Field label="PR タイトル">
            <input className={inputClass} value={prTitle} maxLength={LIMITS.prTitle} onChange={(e) => setPrTitle(e.target.value)} />
          </Field>

          {result?.kind === "error" && (
            <div className="mt-4 text-red-700 dark:text-red-400">
              <p>{result.message}</p>
              {result.messages && result.messages.length > 0 && <Messages title="検査結果" items={result.messages} />}
              {result.conflict && (
                <button type="button" className="mt-2 underline" onClick={() => location.reload()}>
                  最新の内容を読み込み直す（入力中の内容は消えます）
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            className="mt-6 rounded bg-black px-4 py-2 text-white disabled:opacity-40 dark:bg-white dark:text-black"
            disabled={submitting || !requester.trim() || !reason.trim() || !title.trim()}
            onClick={submit}
          >
            {submitting ? "申請しています…" : "申請する（PR を作成）"}
          </button>
        </section>

        <section>
          <h2 className="text-lg font-bold">プレビュー（公開時の表示）</h2>
          <div className="mt-2 rounded border border-black/10 p-4 dark:border-white/15">
            <h1 className="text-2xl font-bold">{title}</h1>
            {summary && <p className="mt-2 text-sm text-black/60 dark:text-white/60">{summary}</p>}
            {tagList.length > 0 && <p className="mt-1 text-xs text-black/50 dark:text-white/50">タグ: {tagList.join(" / ")}</p>}
            <hr className="my-4 border-black/10 dark:border-white/15" />
            <ProcedureMarkdown markdown={body} routePath={routePath} />
          </div>

          <h2 className="mt-8 text-lg font-bold">作成される PR</h2>
          <div className="mt-2 rounded border border-black/10 p-4 dark:border-white/15">
            <p className="font-bold">{prPreview.title}</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{prPreview.body}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block text-sm">
      {props.label}
      {props.children}
    </label>
  );
}

function Messages(props: { title: string; items: string[] }) {
  return (
    <div className="mt-2 text-sm">
      <p className="font-bold">{props.title}</p>
      <ul className="list-disc pl-5">
        {props.items.map((m, i) => (
          <li key={i} className="whitespace-pre-wrap">
            {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
