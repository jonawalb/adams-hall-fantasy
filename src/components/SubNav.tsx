import Link from "next/link";

interface Item {
  href: string;
  label: string;
}

/** Sub-page tabs shown at the top of a section that has a dropdown in the main nav. */
export default function SubNav({ items, current }: { items: Item[]; current: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`font-head rounded-sm px-3 py-1 text-sm font-semibold uppercase tracking-wider ${
            it.href === current ? "bg-gold text-felt-deep" : "border border-line text-cream-dim hover:text-cream"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
