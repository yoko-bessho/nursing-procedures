import Link from "next/link";

export default function Page() {
  return (
    <main className="max-w-3xl">
      <h1 className="text-2xl font-bold">手順の申請（開発中）</h1>
      <p className="mt-2">認証はまだありません。自分の端末（127.0.0.1）でのみ起動してください。</p>
      <p className="mt-2">
        修正申請は、閲覧サイトの手順ページの「修正を申請」から開きます（例:{" "}
        <Link className="underline" href="/edit/endoscopy/upper/egd-assist">
          上部消化管内視鏡 検査介助
        </Link>
        ）。
      </p>
    </main>
  );
}
