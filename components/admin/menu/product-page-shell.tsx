import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ProductPageShell({
  title,
  backLabel,
  children,
}: {
  title: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex max-w-2xl flex-col md:px-6">
      <header className="flex items-center gap-2 border-b px-2 py-2 md:px-0">
        <Link
          href="/admin/menu"
          aria-label={backLabel}
          className="hover:bg-muted flex size-10 items-center justify-center rounded-lg"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      {children}
    </div>
  );
}
