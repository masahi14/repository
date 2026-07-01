import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">
          アライナー矯正ワークフロー管理ボード
        </h1>
        <nav className="flex gap-6 text-sm font-medium text-zinc-600">
          <Link href="/" className="hover:text-zinc-900">
            ボード
          </Link>
          <Link href="/archive" className="hover:text-zinc-900">
            アーカイブ
          </Link>
          <Link href="/staff" className="hover:text-zinc-900">
            担当者管理
          </Link>
        </nav>
      </div>
    </header>
  );
}
