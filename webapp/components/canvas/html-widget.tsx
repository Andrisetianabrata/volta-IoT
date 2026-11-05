"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MicroLabel } from "../widgets/pebble";
import { validateConfig } from "@/lib/widget-registry";

export interface HtmlWidgetDef {
  html: string;
  css?: string;
  js?: string;
}

const DEMO: HtmlWidgetDef = {
  html: `<div class="denah">
  <p class="cap">DENAH · RUANG A</p>
  <p class="big"><span id="t">--.-</span>°C</p>
  <div class="room"><span id="dot" class="dot"></span><span>Pompa</span></div>
  <button id="btn">Nyalakan pompa</button>
  <p id="ack" class="ack"></p>
</div>`,
  css: `.denah{font-family:system-ui,sans-serif;background:#fff;border-radius:22px;padding:18px;color:#111}
.cap{font-size:10px;letter-spacing:.16em;color:#777;margin:0 0 6px}
.big{font-size:44px;font-weight:650;margin:0;font-variant-numeric:tabular-nums}
.room{display:flex;align-items:center;gap:8px;margin:10px 0;font-size:14px}
.dot{width:12px;height:12px;border-radius:99px;background:#ccc}
.dot.on{background:#C07A24;box-shadow:0 0 12px 2px rgba(192,122,36,.6)}
#btn{background:#111;color:#fff;border:0;border-radius:99px;padding:10px 16px;font-weight:700;cursor:pointer}
.ack{font-size:12px;color:#247B50;min-height:16px}`,
  js: `let pump=false;
window.addEventListener("message",(e)=>{
  if(typeof e.data!=="object"||!e.data||e.data.type!=="pin")return;
  if(e.data.pin==="temp")document.getElementById("t").textContent=Number(e.data.value).toFixed(1);
});
document.getElementById("btn").onclick=()=>{
  pump=!pump;
  document.getElementById("dot").classList.toggle("on",pump);
  document.getElementById("ack").textContent=pump?"perintah terkirim":"pompa dimatikan";
  parent.postMessage({type:"cmd",pin:"pump",value:pump?"1":"0"},"*");
};`,
};

function buildSrcDoc(def: HtmlWidgetDef) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${def.css ?? ""}</style></head><body style="margin:0">${def.html}<script>${def.js ?? ""}<\/script></body></html>`;
}

export interface CmdEvent {
  at: string;
  pin: string;
  value: string;
}

// Widget HTML kustom (kind "html", protokol W11): iframe sandbox
// tanpa allow-same-origin; induk↔widget hanya via postMessage
// {type:"pin"} / {type:"cmd"}.
export function HtmlWidget({
  def = DEMO,
  live,
  onCmd,
}: {
  def?: HtmlWidgetDef;
  live: { pin: string; value: string } | null;
  onCmd: (e: CmdEvent) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => buildSrcDoc(def), [def]);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const d = e.data as { type?: string; pin?: string; value?: string };
      if (!d || typeof d !== "object") return;
      if (d.type === "cmd" && typeof d.pin === "string" && typeof d.value === "string") {
        if (d.pin.length > 32 || d.value.length > 96) {
          setBlocked(`cmd ditolak: pin/value melebihi batas (${d.pin})`);
          return;
        }
        onCmd({
          at: new Date().toLocaleTimeString("en-GB"),
          pin: d.pin,
          value: d.value,
        });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onCmd]);

  useEffect(() => {
    if (live) {
      ref.current?.contentWindow?.postMessage(
        { type: "pin", pin: live.pin, value: live.value },
        "*",
      );
    }
  }, [live]);

  const cfg = JSON.stringify({ html: def.html, css: def.css ?? "", js: def.js ?? "" });
  const check = validateConfig("html", cfg);
  const kb = (new Blob([cfg]).size / 1024).toFixed(1);

  return (
    <div className="flex h-full flex-col">
      <iframe
        ref={ref}
        title="Widget HTML kustom"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
        className="min-h-0 w-full flex-1 rounded-2xl border border-black/10 bg-white dark:border-white/10"
      />
      <div className="flex items-center justify-between pt-2">
        <MicroLabel>
          html · {kb} KB / 64 KB · {check.ok ? "valid" : check.errors.join("; ")}
        </MicroLabel>
        {blocked && <span className="text-[11px] text-red-600">{blocked}</span>}
      </div>
    </div>
  );
}

export { DEMO as DEMO_HTML_WIDGET };
