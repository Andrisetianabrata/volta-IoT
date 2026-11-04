import type { CSSProperties } from "react";
import { codeToHtml } from "shiki";
import { cn } from "cn";
import { CodeCopyButton } from "./code-copy-button";

/* CodeBlock library: Shiki `codeToHtml` di Server Component + tombol salin.
   Dual theme github-light/github-dark, diganti via [data-theme] di globals.css.
   Lihat: https://shiki.style/packages/next#react-server-component-codeblock */

type CodeBlockProps = {
  code: string;
  lang?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export async function CodeBlock({ code, lang = "bash", label, className, style }: CodeBlockProps) {
  const html = await codeToHtml(code.replace(/\n$/, ""), {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });

  return (
    <div
      data-slot="code-block"
      className={cn(
        "tnum overflow-hidden border border-[var(--color-border)] bg-[var(--color-ground)]",
        className
      )}
      style={{ borderRadius: "var(--radius)", ...style }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-2.5">
        <span className="font-mono2 text-[13px] text-[var(--color-muted)]">{label ?? lang}</span>
        <CodeCopyButton text={code.replace(/\n$/, "")} />
      </div>
      <div
        data-slot="code-block-body"
        className="code-block-body overflow-x-auto p-5 font-mono2 text-[14px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
