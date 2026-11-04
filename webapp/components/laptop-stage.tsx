import { CodeCopyButton } from "./code-copy-button";

/* Layar laptop statis: mockup SVG + editor kode C++ yang bisa scroll.
   Highlight dikerjakan saat SSR (Shiki), overlay murni HTML + CSS var. */

type StageProps = {
  code: string;
  html: string;
  filename: string;
};

export function LaptopStage({ code, html, filename }: StageProps) {
  return (
    <div className="relative h-full w-full" role="img" aria-label={`Laptop menampilkan kode ${filename}`}>
      <img
        src="/macbook-contents.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        draggable={false}
      />
      <div
        className="absolute flex flex-col overflow-hidden border border-[var(--v-border)] bg-[var(--v-surface)]"
        style={{
          left: "10.24%",
          top: "3.15%",
          width: "79.53%",
          height: "85.44%",
          borderRadius: 12,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-10 flex h-[20px] w-[11%] -translate-x-1/2 items-center justify-center rounded-b-[10px] bg-black"
        >
          <span className="inline-block size-[7px] rounded-full bg-[#232c3a]" />
        </div>
        <div className="tnum flex shrink-0 items-center justify-between gap-3 border-b border-[var(--v-border)] px-4 py-2 font-mono2 text-[12px] text-[var(--v-muted)]">
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="inline-block h-2 w-2 bg-[var(--v-accent)]" />
            <span className="truncate" style={{ fontFamily: "var(--font-variant)" }}>{filename}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="border border-[var(--v-border)] px-1.5 py-0.5 text-[11px]">C++</span>
            <CodeCopyButton text={code} />
          </span>
        </div>
        <div
          data-lenis-prevent
          className="screen-code code-block-body min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono2 text-[13px]"
          style={{ fontFamily: "var(--font-variant)" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
