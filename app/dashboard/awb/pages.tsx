"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type PointerEvent, useEffect, useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import { fetchMemberships } from "../../utils/authClient";
import {
  Activity,
  Bell,
  FileText,
  Filter,
  Home,
  LogOut,
  Maximize,
  RotateCw,
  Search,
  Settings,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type AwbPhase = "upload" | "processing" | "review";

function Sidebar() {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#070B17] px-2 py-3 text-white">
      <div className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
        Menu
      </div>

      <nav className="space-y-1">
        <Link href="/dashboard" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Home className="h-3.5 w-3.5" />
          Overview
        </Link>

        <Link href="/dashboard/awb" className="flex h-[30px] items-center justify-between rounded-[6px] border border-[#1B3B73] bg-[#0D1B35] px-3 text-[11px] font-bold text-white shadow-[inset_3px_0_0_#2F80FF]">
          <span className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            AWB Processing
          </span>
          <span className="flex h-[15px] w-[15px] items-center justify-center rounded-full bg-[#123D8A] text-[8px] font-bold text-[#4F8BFF]">
            3
          </span>
        </Link>

        <Link href="/dashboard/history" className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Activity className="h-3.5 w-3.5" />
          History
        </Link>

        <a className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </a>
      </nav>

      <div className="mt-3 border-t border-white/[0.06] pt-2">
        <div className="rounded-[7px] border border-[#17325F] bg-[#0A1530] p-3">
          <h3 className="text-[10px] font-bold text-white">Enterprise Plan</h3>
          <p className="mt-1 text-[8px] text-[#7D8EA8]">10,000 AWBs/month</p>
          <div className="mt-2 h-[3px] w-full rounded-full bg-[#132746]">
            <div className="h-full w-[48%] rounded-full bg-[#00D9FF]" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[8px]">
            <span className="text-[#2F80FF]">4,823</span>
            <span className="text-[#64748B]">of 10,000 used</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="mb-2 px-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#334155]">
          Support
        </div>

        <a className="flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
          <FileText className="h-3.5 w-3.5" />
          Documentation
        </a>
      </div>

      <Link href="/logout" className="mt-auto mb-3 flex h-[30px] items-center gap-2 rounded-[6px] px-3 text-[11px] font-medium text-[#6F86AA] hover:bg-white/[0.03]">
        <LogOut className="h-3.5 w-3.5" />
        Logout
      </Link>

      <div className="flex items-center justify-between px-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-[9px] font-bold text-white">
            AK
          </div>

          <div className="leading-none">
            <h4 className="text-[10px] font-bold text-white">Anna Keller</h4>
            <p className="mt-1 text-[8px] text-[#64748B]">DB Schenker Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AppHeader() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[200] flex h-[42px] items-center justify-between border-b border-white/[0.08] bg-[#070B17] px-5 text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2F80FF]">
            <span className="text-[11px] font-bold text-white">S</span>
          </div>
          <div className="leading-none">
            <h1 className="text-[12px] font-bold">SemloX</h1>
            <p className="mt-1 text-[8px] tracking-[0.1em] text-[#64748B]">
              AI DOCUMENT ENGINE
            </p>
          </div>
        </div>

        <div className="ml-12 h-10 w-px bg-white/[0.09]" />

        <div className="ml-3 leading-none">
          <h2 className="mb-0.5 text-[11px] font-semibold text-white">AWB Processing</h2>
          <p className="text-[8px] text-[#64748B]">
            DB Schenker Logistics
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#2F80FF] to-[#00C6FF] px-3 py-[5px] text-[10px] font-semibold text-white shadow-md hover:opacity-90">
          <Upload className="h-3 w-3" />
          Upload AWB
        </button>

        <button className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Filter className="h-3.5 w-3.5 text-[#64748B]" />
        </button>

        <button className="relative flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]">
          <Bell className="h-3.5 w-3.5 text-[#64748B]" />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-bold">
          AK
        </div>
      </div>
    </div>
  );
}

function ProcessingView() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_35%_35%,rgba(59,130,246,0.08),transparent_32%),linear-gradient(90deg,#20242d_0%,#20242d_42%,#070b17_52%,#050813_100%)] px-5">
      <div className="relative flex h-[200px] w-full max-w-[305px] flex-col items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.035] px-[26px] py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mb-[18px] h-[46px] w-[46px] animate-spin rounded-full border-2 border-[#334155] border-t-[#2f80ff]" />

        <h2 className="text-[13px] font-extrabold leading-none text-[#f8fafc]">
          Processing AWB-724-12849302.pdf
        </h2>

        <p className="mt-2 max-w-[210px] text-[9px] leading-[1.25] text-[#64748b]">
          Our AI is extracting all 20 standard fields from your document
        </p>

        <div className="mt-[13px] h-[2px] w-full overflow-hidden bg-[#1e293b]">
          <div className="h-full w-[72%] bg-gradient-to-r from-[#2f80ff] to-[#00d9ff]" />
        </div>

        <div className="mt-2 flex w-full items-center justify-between font-mono text-[8px] text-[#64748b]">
          <span>72% complete</span>
          <span>~1s remaining</span>
        </div>

        <div className="mt-[13px] font-mono text-[9px] text-[#00d9ff]">
          * Cross-checking HS codes...
        </div>
      </div>
    </div>
  );
}

function ReviewField({
  label,
  value,
  confidence,
  active = false,
}: {
  label: string;
  value: string;
  confidence: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[7px] border bg-white/[0.025] px-3 py-2.5 ${
        active
          ? "border-[#2f80ff] shadow-[0_0_0_1px_rgba(47,128,255,0.25)]"
          : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[#64748b]">
            {label}
          </div>
          <div className="mt-2 text-[11px] font-extrabold text-[#f8fafc]">
            {value}
          </div>
          <div className="mt-1 font-mono text-[8px] text-[#64748b]">
            <span className="text-[#ef4444]">!</span> p.1 - box 1
          </div>
        </div>
        <div className="rounded-full bg-[#00d4aa]/15 px-2 py-1 font-mono text-[8px] font-bold text-[#00d4aa]">
          {confidence}
        </div>
      </div>
    </div>
  );
}

function AwbPaperContent({ boxes }: { boxes: string[][] }) {
  return (
    <>
      <div className="mb-4 flex items-start justify-between border-b border-[#0f172a] pb-2">
        <div>
          <div className="text-[14px] font-extrabold tracking-[0.12em]">Lufthansa Cargo</div>
          <div className="text-[6px]">Air Waybill - Original 3 (For Shipper)</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-extrabold">724-12849302</div>
          <div className="text-[5px]">AWB No.</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {boxes.slice(0, 2).map(([label, value]) => (
          <div key={label} className="min-h-[54px] border border-[#94a3b8] p-1.5">
            <div className="text-[5px] font-bold text-[#334155]">{label}</div>
            <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.4]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {boxes.slice(2, 5).map(([label, value]) => (
          <div key={label} className="min-h-[38px] border border-[#94a3b8] p-1.5">
            <div className="text-[5px] font-bold text-[#334155]">{label}</div>
            <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.35]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {boxes.slice(5, 9).map(([label, value]) => (
          <div key={label} className="min-h-[38px] border border-[#94a3b8] p-1.5">
            <div className="text-[5px] font-bold text-[#334155]">{label}</div>
            <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.35]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {boxes.slice(9).map(([label, value]) => (
          <div key={label} className="min-h-[38px] border border-[#94a3b8] p-1.5">
            <div className="text-[5px] font-bold text-[#334155]">{label}</div>
            <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.35]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 border border-[#94a3b8] p-1.5">
        <div className="text-[5px] font-bold text-[#334155]">HANDLING INFORMATION</div>
        <div className="mt-1 text-[7px] font-bold">SHC: CAO - EL1 - Notify upon acceptance</div>
      </div>

      <div className="mt-2 grid grid-cols-[0.7fr_1fr_0.8fr_2fr_1fr_1fr] border border-[#94a3b8] text-[5px]">
        {["Pcs", "Gross Wt", "Rate Class", "Nature & Quantity of Goods", "Chgbl Wt", "Total"].map((item) => (
          <div key={item} className="border-r border-[#94a3b8] p-1 font-bold last:border-r-0">
            {item}
          </div>
        ))}
        {["14", "1,240.000 KG", "Q", "Industrial Automation Components", "1,240.000 K", "EUR 4,464.80"].map((item) => (
          <div key={item} className="border-r border-t border-[#94a3b8] p-1 last:border-r-0">
            {item}
          </div>
        ))}
      </div>
    </>
  );
}

function AwbDocumentPreview() {
  const [page, setPage] = useState(2);
  const [zoom, setZoom] = useState(100);
  const [fitPreview, setFitPreview] = useState(false);
  const [magnifierActive, setMagnifierActive] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [enhanced, setEnhanced] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 58, y: 26 });
  const boxes = [
    ["SHIPPER'S NAME AND ADDRESS", "DB Schenker GmbH\nAcct: SCHENKER-DE-9821\nEdmund-Rumpler-Str. 3\n60549 Frankfurt am Main, DE"],
    ["CONSIGNEE'S NAME AND ADDRESS", "Siemens AG - Singapore\nAcct: SIEM-SG-44210\n8 MacPherson Road\nSingapore 348615"],
    ["ISSUING CARRIER'S AGENT NAME & CITY", "DB Schenker - FRA"],
    ["AGENT'S IATA CODE", "80-1 2345/0001"],
    ["ACCOUNT NUMBER", "9821-DE"],
    ["AIRPORT OF DEPARTURE", "FRA\nFrankfurt"],
    ["ROUTING", "FRA - SIN"],
    ["BY FIRST CARRIER", "LH"],
    ["CURRENCY / CHARGES", "EUR / PP"],
    ["AIRPORT OF DESTINATION", "SIN - Singapore Changi"],
    ["FLIGHT / DATE (REQUESTED)", "LH9012 / 28 APR 2026"],
    ["DECLARED VALUE FOR CUSTOMS", "EUR 245,800"],
  ];
  const zoomScale = zoom / 100;

  const moveLens = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setLensPosition({
      x: Math.min(88, Math.max(12, x)),
      y: Math.min(82, Math.max(18, y)),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-[#0a0e1a]">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#111726] px-3">
        <FileText className="h-3.5 w-3.5 text-[#ff4d5d]" />
        <span className="font-mono text-[10px] font-bold text-white line-through decoration-white/70">
          AWB-724-12849302.pdf
        </span>
        <span className="font-mono text-[9px] text-[#64748b]">- 312 KB - 2 pages</span>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] text-white">
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-6 w-6 rounded border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">&lsaquo;</button>
          <span className="rounded border border-white/10 bg-white/[0.05] px-3 py-1">{page}</span>
          <span className="text-[#64748b]">/ 2</span>
          <button onClick={() => setPage((current) => Math.min(2, current + 1))} className="h-6 w-6 rounded border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">&rsaquo;</button>
          <button onClick={() => setZoom((current) => Math.max(75, current - 10))} className="ml-3 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">
            <ZoomOut className="h-3 w-3" />
          </button>
          <span className="min-w-9 text-center font-extrabold">{zoom}%</span>
          <button onClick={() => setZoom((current) => Math.min(140, current + 10))} className="flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] text-[#64748b] hover:text-white">
            <ZoomIn className="h-3 w-3" />
          </button>
          <button onClick={() => setFitPreview((current) => !current)} className={`flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border text-[#64748b] hover:text-white ${fitPreview ? "border-[#2f80ff]/50 bg-[#2f80ff]/15" : "border-white/10 bg-white/[0.04]"}`}>
            <Maximize className="h-3 w-3" />
          </button>
          <button onClick={() => setMagnifierActive((current) => !current)} className={`ml-1 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border ${magnifierActive ? "border-[#2f80ff]/50 bg-[#2f80ff]/15 text-[#60a5fa]" : "border-white/10 bg-white/[0.04] text-[#64748b]"}`}>
            <Search className="h-3 w-3" />
          </button>
          <button onClick={() => setRotation((current) => (current + 90) % 360)} className={`flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border text-[#64748b] hover:text-white ${rotation ? "border-[#2f80ff]/50 bg-[#2f80ff]/15" : "border-white/10 bg-white/[0.04]"}`}>
            <RotateCw className="h-3 w-3" />
          </button>
          <button onClick={() => setEnhanced((current) => !current)} className={`ml-1 flex h-[25px] w-[25px] items-center justify-center rounded-[5px] border text-[#64748b] hover:text-white ${enhanced ? "border-[#2f80ff]/50 bg-[#2f80ff]/15" : "border-white/10 bg-white/[0.04]"}`}>
            <Filter className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div onPointerMove={moveLens} className={`relative min-h-0 flex-1 overflow-hidden bg-[#171d2d] py-4 ${fitPreview ? "px-4" : "px-[70px]"}`}>
        <div className={`mx-auto h-full overflow-hidden bg-white px-5 py-5 font-mono text-[#0f172a] shadow-[0_10px_35px_rgba(0,0,0,0.55)] transition-transform duration-200 ${fitPreview ? "max-w-[560px]" : "max-w-[450px]"} ${enhanced ? "contrast-125 saturate-125" : ""}`} style={{ transform: `scale(${zoomScale}) rotate(${rotation}deg)`, transformOrigin: "center center" }}>
          <div className="mb-4 flex items-start justify-between border-b border-[#0f172a] pb-2">
            <div>
              <div className="text-[14px] font-extrabold tracking-[0.12em]">Lufthansa Cargo</div>
              <div className="text-[6px]">Air Waybill - Original 3 (For Shipper)</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-extrabold">724-12849302</div>
              <div className="text-[5px]">AWB No.</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {boxes.slice(0, 2).map(([label, value]) => (
              <div key={label} className="min-h-[54px] border border-[#94a3b8] p-1.5">
                <div className="text-[5px] font-bold text-[#334155]">{label}</div>
                <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.4]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {boxes.slice(2, 5).map(([label, value]) => (
              <div key={label} className="min-h-[38px] border border-[#94a3b8] p-1.5">
                <div className="text-[5px] font-bold text-[#334155]">{label}</div>
                <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.35]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {boxes.slice(5, 9).map(([label, value]) => (
              <div key={label} className="min-h-[38px] border border-[#94a3b8] p-1.5">
                <div className="text-[5px] font-bold text-[#334155]">{label}</div>
                <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.35]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {boxes.slice(9).map(([label, value]) => (
              <div key={label} className="min-h-[38px] border border-[#94a3b8] p-1.5">
                <div className="text-[5px] font-bold text-[#334155]">{label}</div>
                <div className="mt-1 whitespace-pre-line text-[7px] font-bold leading-[1.35]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 border border-[#94a3b8] p-1.5">
            <div className="text-[5px] font-bold text-[#334155]">HANDLING INFORMATION</div>
            <div className="mt-1 text-[7px] font-bold">SHC: CAO - EL1 - Notify upon acceptance</div>
          </div>

          <div className="mt-2 grid grid-cols-[0.7fr_1fr_0.8fr_2fr_1fr_1fr] border border-[#94a3b8] text-[5px]">
            {["Pcs", "Gross Wt", "Rate Class", "Nature & Quantity of Goods", "Chgbl Wt", "Total"].map((item) => (
              <div key={item} className="border-r border-[#94a3b8] p-1 font-bold last:border-r-0">
                {item}
              </div>
            ))}
            {["14", "1,240.000 KG", "Q", "Industrial Automation Components", "1,240.000 K", "EUR 4,464.80"].map((item) => (
              <div key={item} className="border-r border-t border-[#94a3b8] p-1 last:border-r-0">
                {item}
              </div>
            ))}
          </div>
        </div>
        {magnifierActive && (
          <div
            className="pointer-events-none absolute z-20 flex h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-[#3b82f6] bg-white text-[#0f172a] shadow-[0_18px_45px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(59,130,246,0.18)]"
            style={{ left: `${lensPosition.x}%`, top: `${lensPosition.y}%` }}
          >
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#3b82f6]/60" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-[#3b82f6]/30" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3b82f6]/70" />
            <div
              className="absolute h-[320px] w-[450px] bg-white px-5 py-5 font-mono text-[#0f172a]"
              style={{
                left: `calc(50% - ${lensPosition.x * 4.5}px)`,
                top: `calc(50% - ${lensPosition.y * 3.2}px)`,
                transform: "scale(2)",
                transformOrigin: "top left",
              }}
            >
              <AwbPaperContent boxes={boxes} />
            </div>
          </div>
        )}
      </div>

      <div className="flex h-6 shrink-0 items-center gap-2 border-t border-white/[0.08] bg-[#0c1220] px-3 font-mono text-[9px] text-[#60a5fa]">
        {magnifierActive
          ? "Magnifier active - Hover anywhere on the document to zoom in 2x - Click toolbar icon to disable"
          : "Magnifier ready - Click search icon to inspect document details"}
      </div>
    </div>
  );
}

function ReviewView() {
  const fields = [
    ["AWB Number", "724-12849302", "99%"],
    ["Shipper Name", "DB Schenker GmbH", "99%"],
    ["Shipper Account #", "SCHENKER-DE-9821", "98%"],
    ["Shipper Address", "Edmund-Rumpler-Str. 3, Frankfurt", "97%"],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#050813] text-white">
      <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#070b17] px-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="text-[#64748b]">Overview</span>
            <span className="text-[#334155]">›</span>
            <span>AWB Processing</span>
          </div>
          <div className="mt-1 text-[9px] text-[#64748b]">
            DB Schenker - Document #724-12849302
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-white/10 bg-white/[0.03] p-0.5 text-[10px]">
            <button className="px-2 py-1 text-[#64748b]">Light</button>
            <button className="rounded bg-[#2f80ff] px-2 py-1 font-bold">Dark</button>
          </div>
          <button className="relative flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03]">
            <Bell className="h-3.5 w-3.5 text-[#64748b]" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5865f2] text-[10px] font-bold">
            AK
          </div>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
        <div className="flex shrink-0 items-start justify-between">
          <div>
            <h1 className="text-[18px] font-extrabold tracking-[-0.03em]">AWB Processing</h1>
            <p className="mt-0.5 text-[11px] text-[#64748b]">
              Review extracted fields - 20 of 20 captured - 3 need attention
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-[#64748b]">
              New Document
            </button>
            <button className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-[#64748b]">
              Save Draft
            </button>
            <button className="rounded-full bg-[#0ea5e9] px-4 py-2 text-[11px] font-bold">
              Issue AWB
            </button>
          </div>
        </div>

        <div className="flex h-[42px] shrink-0 items-center rounded-[9px] border border-white/[0.08] bg-white/[0.025] px-4 text-[11px] font-bold">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#20c997] text-[10px]">✓</span>
            Upload
          </div>
          <div className="mx-4 h-px flex-1 bg-[#20c997]" />
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#20c997] text-[10px]">✓</span>
            AI Extract
          </div>
          <div className="mx-4 h-px flex-1 bg-[#2f80ff]" />
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#2f80ff] text-[9px] shadow-[0_0_0_4px_rgba(47,128,255,0.18)]">03</span>
            Review Fields
          </div>
          <div className="mx-4 h-px flex-1 bg-white/[0.08]" />
          <div className="flex items-center gap-2 text-[#64748b]">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/10 text-[9px]">04</span>
            Issue / Export
          </div>
        </div>

        <div className="flex h-[52px] shrink-0 items-center rounded-[9px] border border-[#00d4aa]/30 bg-[#00d4aa]/[0.07] px-4">
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#00d4aa]/20 text-[#00d4aa]">✓</div>
          <div>
            <div className="text-[12px] font-extrabold">Extraction Complete - 20 fields captured in 1.9s</div>
            <div className="mt-0.5 text-[9px] text-[#64748b]">
              3 fields flagged below for review - Verify highlighted entries before issuing
            </div>
          </div>
          <div className="ml-auto grid grid-cols-4 gap-7 text-center font-mono">
            {[["20 / 20", "FIELDS"], ["96%", "AVG CONFIDENCE"], ["5", "REVIEW"], ["1.9s", "PROCESS TIME"]].map(([value, label]) => (
              <div key={label}>
                <div className={`text-[12px] font-extrabold ${label === "REVIEW" ? "text-[#f59e0b]" : "text-[#00d4aa]"}`}>
                  {value}
                </div>
                <div className="mt-1 text-[7px] text-[#64748b]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[1.08fr_0.98fr] gap-3">
          <AwbDocumentPreview />

          <div className="flex min-h-0 flex-col overflow-hidden rounded-[9px] border border-white/[0.08] bg-white/[0.03]">
            <div className="flex h-10 shrink-0 items-center border-b border-white/[0.08] px-3">
              <div className="text-[12px] font-extrabold">Extracted Fields</div>
              <span className="ml-2 rounded bg-[#00d4aa]/15 px-2 py-1 font-mono text-[9px] text-[#00d4aa]">20/20</span>
              <div className="ml-auto text-[9px] text-[#64748b]">
                Avg. confidence <span className="font-mono font-bold text-[#00d4aa]">96%</span>
              </div>
            </div>

            <div className="flex h-9 shrink-0 items-center gap-6 overflow-hidden border-b border-white/[0.08] px-6 text-[10px] text-[#64748b]">
              {["All 20", "Review 5", "Parties 7", "Route & Flight 6", "Cargo Details 8", "Handling & Charges"].map((tab, index) => (
                <span key={tab} className={index === 0 ? "font-bold text-[#2f80ff]" : ""}>{tab}</span>
              ))}
            </div>

            <div className="h-2 shrink-0 bg-white px-2">
              <div className="mt-[3px] h-1 rounded-full bg-[#7a7f87]" />
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              <div className="flex justify-between border-b border-dashed border-white/10 pb-2 font-mono text-[9px] uppercase tracking-[0.08em] text-[#64748b]">
                <span>Parties</span>
                <span>7 fields</span>
              </div>
              {fields.map(([label, value, confidence], index) => (
                <ReviewField
                  key={label}
                  label={label}
                  value={value}
                  confidence={confidence}
                  active={index === 1}
                />
              ))}
            </div>

            <div className="flex h-14 shrink-0 items-center border-t border-white/[0.08] px-3">
              <div className="font-mono text-[11px]">
                <span className="font-extrabold text-[#00d4aa]">20/20</span>
                <span className="ml-4 font-extrabold text-[#f59e0b]">5</span>
                <div className="mt-1 text-[8px] text-[#64748b]">Captured To Review</div>
              </div>
              <button className="ml-auto rounded-[8px] bg-[#14b8a6] px-4 py-2 text-[11px] font-extrabold">
                Approve & Issue
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


export default function AwbProcessingPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [phase, setPhase] = useState<AwbPhase>("upload");

  const startProcessing = () => setPhase("processing");

  const { selectedCompanyId, setSelectedCompanyId } = useCompany();

  useEffect(() => {
    let mounted = true;
    async function checkSession() {
      if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] checking memberships");
      const res = await fetchMemberships();
      if (!mounted) return;

      if (!res.ok) {
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", res.status);
        if (res.status === 401 || res.status === 403) {
          if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] redirect reason: unauthorized");
          router.replace("/login");
          return;
        }
        setAllowed(true);
        return;
      }

      const memberships = res.memberships || [];
      if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] memberships status", 200, memberships.length);

      if (!selectedCompanyId && memberships.length === 1) {
        const cid = memberships[0].company_id;
        setSelectedCompanyId(cid, true);
        if (process.env.NODE_ENV !== "production") console.log("[dashboard-auth] selectedCompanyId", cid);
      }

      setAllowed(true);
    }

    checkSession();
    window.addEventListener("pageshow", checkSession);
    return () => {
      mounted = false;
      window.removeEventListener("pageshow", checkSession);
    };
  }, [router, selectedCompanyId, setSelectedCompanyId]);

  useEffect(() => {
    if (phase !== "processing") return;

    const timer = window.setTimeout(() => setPhase("review"), 1800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070B17]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#2F80FF]" />
      </main>
    );
  }

  if (phase === "processing") {
    return <ProcessingView />;
  }

  if (phase === "review") {
    return (
      <div className="flex h-screen flex-col bg-[#EEF1F6]">
        <AppHeader />

        <div className="mt-[42px] flex h-[calc(100vh-42px)] overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-hidden bg-[#050813]">
            <ReviewView />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#EEF1F6]">
      <AppHeader />

      <div className="mt-[42px] flex h-[calc(100vh-42px)] overflow-hidden">
        <Sidebar />
        {/* <main className="min-w-0 flex-1 bg-[#EEF1F6]" /> */}

         <main className="flex-1 overflow-hidden bg-[#04060f]">
               {/* PAGE CONTENT */}
<div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-5 py-4">

  {/* HEADER */}
  <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="mb-0.5 text-xl font-bold tracking-[-0.03em] text-white">
        AWB Processing
      </h1>

      <p className="text-xs text-[#64748b]">
        Upload an AWB to extract structured data with AI
      </p>
    </div>

    <button onClick={startProcessing} className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-3.5 py-2 text-xs font-semibold text-white">
      <svg
  width="28"
  height="28"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.6"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
</svg>
      Browse Files
    </button>
  </div>

  {/* STEPS */}
  <div className="flex shrink-0 items-center overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">

    {/* STEP 1 */}
    <div className="flex shrink-0 items-center gap-2 py-1 text-xs font-semibold text-white">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#3b82f6] bg-[#3b82f6] text-[11px] font-bold text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)]">
        01
      </div>

      <span>Upload</span>
    </div>

    <div className="mx-3 h-px min-w-6 flex-1 bg-white/[0.06]" />

    {/* STEP 2 */}
    <div className="flex shrink-0 items-center gap-2 py-1 text-xs text-[#64748b]">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold">
        02
      </div>

      <span>AI Extract</span>
    </div>

    <div className="mx-3 h-px min-w-6 flex-1 bg-white/[0.06]" />

    {/* STEP 3 */}
    <div className="flex shrink-0 items-center gap-2 py-1 text-xs text-[#64748b]">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold">
        03
      </div>

      <span>Review Fields</span>
    </div>

    <div className="mx-3 h-px min-w-6 flex-1 bg-white/[0.06]" />

    {/* STEP 4 */}
    <div className="flex shrink-0 items-center gap-2 py-1 text-xs text-[#64748b]">
      <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-bold">
        04
      </div>

      <span>Issue / Export</span>
    </div>
  </div>

  {/* MAIN GRID */}
  <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-3.5 overflow-hidden">

    {/* LEFT PANEL */}
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.03]">

      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#1a1f2e]">

        <div onClick={startProcessing} className="flex h-[340px] w-4/5 max-w-[520px] cursor-pointer flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed border-[#3b82f6]/40 bg-[#3b82f6]/[0.05] transition-all duration-200 hover:scale-[1.005] hover:border-[#3b82f6] hover:bg-[#3b82f6]/[0.08]">

          {/* ICON */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#3b82f6]/30 bg-gradient-to-br from-[#3b82f6]/15 to-[#06b6d4]/15 text-[#3b82f6]">
            <svg
  width="28"
  height="28"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.6"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
</svg>
          </div>

          {/* TEXT */}
          <div>
            <div className="text-center text-lg font-bold tracking-[-0.02em] text-white">
              Drop AWB here
            </div>

            <div className="mt-1 max-w-[340px] text-center text-[13px] text-[#94a3b8]">
              Drag & drop your PDF, or click to browse. AI will extract
              all 20 standard AWB fields automatically.
            </div>
          </div>

          {/* OR */}
          <div className="flex items-center gap-2 text-[11px] text-[#64748b] before:h-px before:w-[30px] before:bg-white/10 after:h-px after:w-[30px] after:bg-white/10">
            OR
          </div>

          {/* BUTTON */}
          <button onClick={startProcessing} className="rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-[22px] py-[9px] text-xs font-semibold text-white">
            Browse Files
          </button>

          {/* FILE TYPES */}
          <div className="flex flex-wrap justify-center gap-1.5">

            {[".PDF", ".JPG", ".PNG", ".TIFF"].map((item) => (
              <span
                key={item}
                className="rounded border border-white/[0.08] bg-white/[0.05] px-2 py-1 font-mono text-[10px] text-[#94a3b8]"
              >
                {item}
              </span>
            ))}

            <span className="rounded border border-[#3b82f6]/30 bg-white/[0.05] px-2 py-1 font-mono text-[10px] text-[#3b82f6]">
              Max 25 MB
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* RIGHT PANEL */}
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-white/[0.03]">

      {/* HEADER */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4 py-3">
        <span className="text-[13px] font-semibold text-white">
          Awaiting Document
        </span>
      </div>

      {/* BODY */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-10 text-center">

        <div>

          {/* ICON */}
          <div className="mx-auto mb-3.5 flex h-[60px] w-[60px] items-center justify-center rounded-[14px] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.08] text-[#3b82f6]">
            <svg
  width="28"
  height="28"
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.6"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
</svg>
          </div>

          {/* TITLE */}
          <div className="mb-1 text-sm font-bold text-white">
            20 fields ready to extract
          </div>

          {/* SUBTITLE */}
          <div className="mb-[18px] text-[11px] leading-[1.6] text-[#64748b]">
            Once you upload an AWB, our AI will automatically detect and extract:
          </div>

          {/* FIELD GRID */}
          <div className="grid grid-cols-2 gap-1.5 text-left text-[10px] text-[#cbd5e1]">

            {[
              "AWB Number",
              "Shipper Name",
              "Shipper Account #",
              "Shipper Address",
              "Consignee",
              "Consignee Account #",
              "Consignee Address",
              "Origin Airport",
              "Destination Airport",
              "Flight Number",
              "Flight Date",
              "Issuing Carrier",
            ].map((field) => (
              <div
                key={field}
                className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5"
              >
                <div className="h-[5px] w-[5px] rounded-full bg-[#3b82f6]" />

                {field}
              </div>
            ))}

            <div className="col-span-2 mt-1 text-center text-[10px] text-[#64748b]">
              + 8 more fields
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
         </main>
      </div>
    </div>
  );
}
