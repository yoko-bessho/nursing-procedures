import Link from "next/link";

// 手順ページ間の移動はパンくずで足りるため、独立したサイドナビ等は持たせていない（別タスク）。
export function Breadcrumbs({ trail }: { trail: { href: string; label: string }[] }) {
  return (
    <nav aria-label="パンくずリスト" className="mb-6 text-sm text-black/55 dark:text-white/55">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {isLast ? (
                <span aria-current="page" className="text-black/80 dark:text-white/80">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground hover:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
