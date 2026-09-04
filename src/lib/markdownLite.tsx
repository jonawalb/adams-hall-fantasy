import { Fragment, ReactNode } from "react";

/** Renders the recap body: "## " headings, blank-line paragraphs, **bold**, *italic*. */
export function renderLite(body: string): ReactNode[] {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const text = block.trim();
    if (!text) return null;
    if (text.startsWith("## "))
      return (
        <h2 key={i} className="font-display mt-8 text-2xl leading-tight text-gold-bright first:mt-0">
          {inline(text.slice(3))}
        </h2>
      );
    if (text.startsWith("# "))
      return (
        <h2 key={i} className="font-display mt-8 text-2xl leading-tight text-gold-bright first:mt-0">
          {inline(text.slice(2))}
        </h2>
      );
    return (
      <p key={i} className="text-lg leading-relaxed">
        {inline(text)}
      </p>
    );
  });
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}
