
"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";

/**
 * File: app/page.tsx
 * 
 * Required Tailwind setup:
 * Add these font imports in app/globals.css:
 * @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
 *
 * Add this in tailwind.config.ts extend section:
 * fontFamily: {
 *   grotesk: ["Space Grotesk", "sans-serif"],
 *   mono: ["Space Mono", "monospace"],
 * },
 * keyframes: { 
 *   pulseSoft: {
 *     "0%, 100%": { opacity: "1", transform: "scale(1)" },
 *     "50%": { opacity: "0.5", transform: "scale(0.8)" },
 *   },
 *   spinSlow: {
 *     from: { transform: "rotate(0deg)" },
 *     to: { transform: "rotate(360deg)" },
 *   },
 *   nodeRing: {
 *     "0%": { transform: "scale(1)", opacity: "0.5" },
 *     "100%": { transform: "scale(2.5)", opacity: "0" },
 *   },
 *   ticker: {
 *     from: { transform: "translateX(0)" },
 *     to: { transform: "translateX(-50%)" },
 *   },
 * },
 * animation: {
 *   pulseSoft: "pulseSoft 2s infinite",
 *   spin20: "spinSlow 20s linear infinite",
 *   spin30Reverse: "spinSlow 30s linear infinite reverse",
 *   spin45: "spinSlow 45s linear infinite",
 *   nodeRing: "nodeRing 2s ease-out infinite",
 *   ticker: "ticker 25s linear infinite",
 * },
 */




const modules = [
  "AWB Processing · Live",
  "Route Optimization · Active",
  "Document AI · Online",
  "Fleet Tracking · Connected",
  "Customs Integration · Ready",
  "Warehouse Vision · Beta",
  "Carbon Ledger · Q4 2026",
];

const roadmapItems = [
  { label: "Fleet Intelligence", desc: "Real-time GPS + predictive maintenance", badge: "Q3" },
  { label: "Route Optimizer AI", desc: "Dynamic multi-modal path computation", badge: "Q3" },
  { label: "Warehouse Vision", desc: "Computer vision inventory counting", badge: "Q4" },
  { label: "Carbon Ledger", desc: "Scope 3 emissions tracking & reporting", badge: "Q4" },
  { label: "Customs AutoFill", desc: "AI-powered cross-border documentation", badge: "2027" },
];

const stats = [
  ["98.7%", "Document Accuracy"],
  ["<2s", "Processing Time"],
  ["140+", "Countries Covered"],
  ["SOC 2", "Type II Certified"],
];

const heroNodes = [
  { top: "12%", left: "52%", color: "bg-[#06b6d4]", ring: "after:border-[#06b6d4]", delay: "[animation-delay:0s]" },
  { top: "32%", left: "78%", color: "bg-[#3b82f6]", ring: "after:border-[#3b82f6]", delay: "[animation-delay:0.5s]" },
  { top: "62%", left: "82%", color: "bg-[#f97316]", ring: "after:border-[#f97316]", delay: "[animation-delay:1s]" },
  { top: "78%", left: "55%", color: "bg-[#00d4aa]", ring: "after:border-[#00d4aa]", delay: "[animation-delay:1.5s]" },
  { top: "68%", left: "22%", color: "bg-[#06b6d4]", ring: "after:border-[#06b6d4]", delay: "[animation-delay:0.8s]" },
  { top: "38%", left: "18%", color: "bg-[#3b82f6]", ring: "after:border-[#3b82f6]", delay: "[animation-delay:0.3s]" },
  { top: "18%", left: "35%", color: "bg-[#00d4aa]", ring: "after:border-[#00d4aa]", delay: "[animation-delay:1.2s]" },
];

const engineFeatures = [
  { icon: "⚡", title: "Sub-2s Document Processing", desc: "Upload any AWB, bill of lading, or customs form — our transformer model extracts and validates all fields in under 2 seconds." },
  { icon: "🔮", title: "Predictive Exception Detection", desc: "Pattern recognition across 40M+ historical shipments flags delays, compliance risks, and routing anomalies before they escalate." },
  { icon: "🔗", title: "Universal API Integration", desc: "Connect to any TMS, WMS, or ERP in hours with our pre-built connector library. Zero custom development required." },
  { icon: "📡", title: "Real-time Event Streaming", desc: "Every status change, document update, and route deviation propagates across your stack in milliseconds via our event bus." },
];

const orbitItems = [
  { top: "5%", left: "50%", icon: "📄", label: "AWB OCR" },
  { top: "25%", left: "85%", icon: "🧠", label: "AI Parse" },
  { top: "65%", left: "85%", icon: "🔀", label: "Routing" },
  { top: "85%", left: "50%", icon: "📊", label: "Analytics" },
  { top: "65%", left: "12%", icon: "🔒", label: "Security" },
  { top: "25%", left: "12%", icon: "🌐", label: "Network" },
];

const securityItems = [
  "End-to-end AES-256 encryption for all document uploads and transmissions",
  "SOC 2 Type II certified infrastructure with annual third-party audits",
  "GDPR and CCPA compliant data residency options across 6 global regions",
  "Zero-trust network access with hardware-bound MFA for all admin operations",
  "Immutable audit log for every document action, API call, and user event",
];

const securityBadges = [
  { icon: "🔐", title: "SOC 2 Type II", sub: "Certified Infrastructure" },
  { icon: "🛡️", title: "ISO 27001", sub: "Information Security" },
  { icon: "🌍", title: "GDPR Compliant", sub: "EU Data Residency" },
  { icon: "⚓", title: "Zero Trust", sub: "Network Architecture" },
  { icon: "🔑", title: "AES-256", sub: "Encryption Standard" },
  { icon: "📋", title: "CCPA Ready", sub: "Privacy Compliance" },
];

export default function SemloxLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("opacity-100", "translate-y-0");
        });
      },
      { threshold: 0.1 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // return (
  //   <main className="min-h-screen overflow-x-hidden scroll-smooth bg-[#04060f] bg-[linear-gradient(rgba(59,130,246,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.06)_1px,transparent_1px)] bg-[length:60px_60px] font-grotesk text-[#e2e8f0]">
  //     <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
  //     <Hero />
  //     <Ticker />
  //     <EngineSection />
  //     <ModulesSection />
  //     <SecuritySection />
  //     <CTASection />
  //     <Footer />
  //   </main>
  // );


  return (
    <main className="min-h-screen overflow-x-hidden scroll-smooth bg-[#04060f] bg-[linear-gradient(rgba(59,130,246,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.06)_1px,transparent_1px)] bg-[length:60px_60px] text-[#e2e8f0]">
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero />
      <Ticker />
      <EngineSection />
      <ModulesSection />
      <SecuritySection />
      <CTASection />
      <Footer />
    

      <style jsx global>{`
        @keyframes ticker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-80%);
          }
        }

        @keyframes spin20 {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin30Reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes spin45 {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes nodeRing {
          from {
            opacity: 0.5;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(2.5);
          }
        }

        @keyframes pulseSoft {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.04);
          }
        }

        .animate-ticker {
          animation: ticker 28s linear infinite;
        }

        .animate-spin20 {
          animation: spin20 20s linear infinite;
        }

        .animate-spin30Reverse {
          animation: spin30Reverse 30s linear infinite;
        }

        .animate-spin45 {
          animation: spin45 45s linear infinite;
        }

        .animate-nodeRing::after {
          animation: nodeRing 2s ease-out infinite;
        }

        .animate-pulseSoft {
          animation: pulseSoft 2s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-ticker,
          .animate-spin20,
          .animate-spin30Reverse,
          .animate-spin45,
          .animate-pulseSoft,
          .animate-nodeRing::after {
            animation-play-state: paused !important;
          }

          .fade-up {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}

 



function Navbar({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    // <nav className="fixed inset-x-0 top-0 z-[100] border-b border-white/[0.07] bg-[#04060f]/80 backdrop-blur-2xl">
    //   <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
    //     <a href="#" className="flex items-center gap-2.5 no-underline">
    //       <LogoMark size="h-8 w-8" />
    //       <div>
    //         <div className="text-xl font-bold tracking-[-0.02em] text-[#e2e8f0]">
    //           Semlo<span className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">X</span>
    //         </div>
    //         <div className="-mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[#64748b]">AI Engine for Modern Logistics</div>
    //       </div>
    //     </a>

    //     <div className="flex items-center gap-8 max-md:hidden">
    //       <a href="#engine" className="text-sm font-medium tracking-[0.01em] text-[#64748b] no-underline transition hover:text-[#e2e8f0]">Platform</a>
    //       <a href="#modules" className="text-sm font-medium tracking-[0.01em] text-[#64748b] no-underline transition hover:text-[#e2e8f0]">Modules</a>
    //       <a href="#security" className="text-sm font-medium tracking-[0.01em] text-[#64748b] no-underline transition hover:text-[#e2e8f0]">Security</a>

    //       <div className="relative">
    //         <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-1.5 border-0 bg-transparent font-grotesk text-sm font-medium tracking-[0.01em] text-[#64748b] transition hover:text-[#e2e8f0]">
    //           Upcoming AI Modules <span className={`text-[10px] transition ${menuOpen ? "rotate-180" : ""}`}>▾</span>
    //         </button>

    //         {menuOpen && (
    //           <div className="absolute left-1/2 top-[calc(100%+16px)] w-60 -translate-x-1/2 rounded-xl border border-white/[0.07] bg-[#070a17]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl before:absolute before:left-1/2 before:top-[-1px] before:h-px before:w-20 before:-translate-x-1/2 before:bg-gradient-to-r before:from-transparent before:via-[#06b6d4] before:to-transparent">
    //             <div className="mb-1 border-b border-white/[0.07] px-3 pb-1.5 pt-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[#64748b]">Roadmap · Q3 2026</div>
    //             {roadmapItems.map((item) => (
    //               <div key={item.label} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-[0.8rem] text-[#64748b] transition hover:bg-white/[0.05] hover:text-[#e2e8f0]">
    //                 <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00d4aa]" />
    //                 <div className="flex-1">
    //                   <div className="text-[0.8rem] font-medium text-[#e2e8f0]">{item.label}</div>
    //                   <div className="mt-px text-[0.7rem] text-[#64748b]">{item.desc}</div>
    //                 </div>
    //                 <span className="rounded-full bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.05em] text-white">{item.badge}</span>
    //               </div>
    //             ))}
    //           </div>
    //         )}
    //       </div>
    //     </div>

    //     <a href="#" className="rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-5 py-2 font-grotesk text-sm font-semibold text-white no-underline transition hover:opacity-85">Request Access →</a>
    //   </div>
    // </nav>
    <>
      <nav className="fixed inset-x-0 top-0 z-[100] border-b border-white/[0.07] bg-[#04060f]/80 backdrop-blur-2xl">
  
  <div className="mx-auto flex h-[58px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">

    {/* LOGO */}
    <a href="#" className="flex items-center gap-2 no-underline">
      <LogoMark size="h-7 w-7" />

      <div>
        <div className="text-[15px] font-bold tracking-[-0.02em] text-[#e2e8f0]">
          Semlo
          <span className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">
            X
          </span>
        </div>

        <div className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[#64748b]">
          AI Engine for Modern Logistics
        </div>
      </div>
    </a>

    {/* MENU */}
    <div className="flex items-center gap-6 max-md:hidden">
      <a href="#engine" className="text-[13px] font-medium text-[#64748b] transition hover:text-[#e2e8f0]">
        Platform
      </a>

      <a href="#modules" className="text-[13px] font-medium text-[#64748b] transition hover:text-[#e2e8f0]">
        Modules
      </a>

      <a href="#security" className="text-[13px] font-medium text-[#64748b] transition hover:text-[#e2e8f0]">
        Security
      </a>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1 text-[13px] font-medium text-[#64748b] transition hover:text-[#e2e8f0]"
        >
          Upcoming AI Modules
          <span className={`text-[9px] transition ${menuOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>

        {menuOpen && (
          <div className="absolute left-1/2 top-[calc(100%+14px)] w-56 -translate-x-1/2 rounded-xl border border-white/[0.07] bg-[#070a17]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">

            <div className="mb-1 border-b border-white/[0.07] px-3 pb-1.5 pt-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[#64748b]">
              Roadmap · Q3 2026
            </div>

            {roadmapItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] text-[#64748b] transition hover:bg-white/[0.05] hover:text-[#e2e8f0]"
              >
                <div className="h-1 w-1 rounded-full bg-[#00d4aa]" />

                <div className="flex-1">
                  <div className="text-[12px] font-medium text-[#e2e8f0]">
                    {item.label}
                  </div>

                  <div className="text-[11px] text-[#64748b]">
                    {item.desc}
                  </div>
                </div>

                <span className="rounded-full bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-1.5 py-[2px] font-mono text-[10px] text-white">
                  {item.badge}
                </span>
              </div>
            ))}

          </div>
        )}
      </div>
    </div>

    {/* BUTTON */}
   <Link
  href="/login"
  className="rounded-md bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-85"
>
  Login / Sign Up →
</Link>

  </div>
</nav>
    </>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative flex min-h-[calc(100svh-58px)] items-center px-4 pb-10 pt-[82px] sm:px-6 lg:px-10 lg:pb-8 before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_80%_60%_at_70%_40%,rgba(6,182,212,0.08)_0%,transparent_60%)] after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_60%_50%_at_20%_60%,rgba(59,130,246,0.07)_0%,transparent_60%)]">
      <div className="relative z-[1] mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 xl:gap-16">
        {/* <div>
          <div className="fade-up visible inline-flex translate-y-0 items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/[0.05] px-3.5 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.15em] text-[#06b6d4] opacity-100">
            <span className="h-1 w-1 animate-pulseSoft rounded-full bg-[#06b6d4]" /> Now in Enterprise Beta
          </div>

          <h1 className="fade-up visible mt-6 translate-y-0 text-[clamp(2.5rem,5vw,4rem)] font-bold leading-[1.1] tracking-[-0.03em] opacity-100">
            <span className="bg-gradient-to-br from-white from-[30%] to-[#06b6d4] bg-clip-text text-transparent">The Intelligence Layer</span><br />
            for Global Logistics.
          </h1>

          <p className="fade-up visible mt-6 max-w-[480px] translate-y-0 text-[1.1rem] leading-[1.7] text-[#64748b] opacity-100 [transition-delay:0.1s]">
            SemloX fuses AI document processing, predictive routing, and real-time supply chain visibility into a single operational command layer — built for enterprises moving at the speed of trade.
          </p>

          <div className="fade-up visible mt-10 flex translate-y-0 flex-wrap items-center gap-4 opacity-100 [transition-delay:0.2s]">
            <a href="#" className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-7 py-3.5 font-grotesk text-[0.95rem] font-semibold text-white no-underline transition hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)]">Start Free Trial →</a>
            <a href="#engine" className="inline-flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-transparent px-7 py-3.5 font-grotesk text-[0.95rem] font-medium text-[#e2e8f0] no-underline transition hover:border-white/20 hover:bg-white/[0.04]">▶ See the Engine</a>
          </div>

          <div className="fade-up visible mt-12 flex translate-y-0 gap-8 border-t border-white/[0.07] pt-8 opacity-100 [transition-delay:0.3s]">
            {stats.map(([num, label]) => (
              <div key={label}>
                <div className="bg-gradient-to-br from-[#e2e8f0] to-[#06b6d4] bg-clip-text text-[1.75rem] font-bold text-transparent">{num}</div>
                <div className="mt-0.5 text-xs tracking-[0.05em] text-[#64748b]">{label}</div>
              </div>
            ))}
          </div>
        </div> */}
        <div className="w-full max-w-[640px] lg:justify-self-end">

  <div className="fade-up visible inline-flex translate-y-0 items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/[0.05] px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-[#06b6d4] opacity-100">
    <span className="h-1 w-1 animate-pulseSoft rounded-full bg-[#06b6d4]" />
    Now in Enterprise Beta
  </div>

  <h1 className="fade-up visible mt-5 translate-y-0 text-[34px] font-bold leading-[1.08] tracking-[-0.03em] opacity-100 sm:text-[40px] lg:text-[46px] xl:text-[52px]">
    <span className="bg-gradient-to-br from-white from-[30%] to-[#06b6d4] bg-clip-text text-transparent">
      The Intelligence Layer
    </span>
    <br />
    for Global Logistics.
  </h1>

  <p className="fade-up visible mt-5 max-w-[600px] translate-y-0 text-[15px] leading-[1.65] text-[#64748b] opacity-100 [transition-delay:0.1s] xl:text-[16px]">
    SemloX fuses AI document processing, predictive routing, and real-time supply chain visibility into a single operational command layer — built for enterprises moving at the speed of trade.
  </p>

  <div className="fade-up visible mt-8 flex translate-y-0 flex-wrap items-center gap-3 opacity-100 [transition-delay:0.2s]">
    <a
      href="#"
      className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-5 font-grotesk text-[14px] font-semibold text-white no-underline transition hover:-translate-y-px hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      Start Free Trial →
    </a>

    <a
      href="#engine"
      className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/[0.07] bg-transparent px-5 font-grotesk text-[14px] font-medium text-[#e2e8f0] no-underline transition hover:border-white/20 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
    >
      ▶ See the Engine
    </a>
  </div>

  <div className="fade-up visible mt-10 grid translate-y-0 grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.07] pt-6 opacity-100 [transition-delay:0.3s] sm:grid-cols-4">
    {stats.map(([num, label]) => (
      <div key={label}>
        <div className="bg-gradient-to-br from-[#e2e8f0] to-[#06b6d4] bg-clip-text text-[1.35rem] font-bold text-transparent">
          {num}
        </div>
        <div className="mt-0.5 text-[0.75rem] tracking-[0.05em] text-[#64748b]">
          {label}
        </div>
      </div>
    ))}
  </div>

</div>

        <HeroGlobe />
      </div>
    </section>
  );
}

function HeroGlobe() {
  return (
    <div className="flex min-w-0 items-center justify-center overflow-visible max-md:hidden lg:justify-self-stretch">
      <div className="relative aspect-square w-full max-w-[620px] overflow-visible lg:max-w-[560px] xl:max-w-[620px]">
        <div className="absolute inset-0 animate-spin20 rounded-full border border-dashed border-cyan-500/20" />
        <div className="absolute inset-[30px] animate-spin30Reverse rounded-full border border-blue-500/15" />
        <div className="absolute inset-[60px] animate-spin45 rounded-full border border-orange-500/10" />
        <div className="absolute inset-[100px] rounded-full border border-cyan-500/30 bg-[radial-gradient(circle_at_35%_35%,rgba(6,182,212,0.3),rgba(59,130,246,0.15)_50%,rgba(4,6,15,0.8))] shadow-[0_0_60px_rgba(6,182,212,0.15),inset_0_0_40px_rgba(59,130,246,0.1)]" />

        {heroNodes.map((node, i) => (
          <div
            key={i}
            className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${node.color} after:absolute after:inset-[-4px] after:animate-nodeRing after:rounded-full after:border after:opacity-50 after:content-[''] ${node.ring} ${node.delay}`}
            style={{ top: node.top, left: node.left }}
          />
        ))}

        <svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 520 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <line x1="270" y1="62" x2="406" y2="166" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="406" y1="166" x2="426" y2="322" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="426" y1="322" x2="286" y2="406" stroke="#00d4aa" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="286" y1="406" x2="114" y2="354" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="114" y1="354" x2="94" y2="198" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="94" y1="198" x2="182" y2="94" stroke="#00d4aa" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="182" y1="94" x2="270" y2="62" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="270" y1="62" x2="286" y2="406" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
          <line x1="406" y1="166" x2="114" y2="354" stroke="#06b6d4" strokeWidth="0.5" opacity="0.4" />
          <line x1="426" y1="322" x2="94" y2="198" stroke="#00d4aa" strokeWidth="0.5" opacity="0.4" />
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.15em] text-[#06b6d4]">Semlox</div>
          <div className="mt-0.5 font-mono text-[0.65rem] text-[#64748b]">Engine Core</div>
        </div>

        <GlobeLabel top="8%" left="54%" color="text-[#06b6d4]" text="FRA → SIN" />
        <GlobeLabel top="30%" left="76%" color="text-[#3b82f6]" text="AWB #724" />
        <GlobeLabel top="60%" left="80%" color="text-[#f97316]" text="DXB HUB" />
        <GlobeLabel top="76%" left="53%" color="text-[#00d4aa]" text="JFK → LHR" />
      </div>
    </div>
  );
}

function GlobeLabel({ top, left, color, text }: { top: string; left: string; color: string; text: string }) {
  return <div className={`absolute whitespace-nowrap font-mono text-[0.65rem] tracking-[0.05em] ${color}`} style={{ top, left }}>{text}</div>;
}

function Ticker() {
  return (
    <div className="overflow-hidden border-y border-white/[0.07] bg-white/[0.01] py-3">
      <div className="flex animate-ticker gap-16 whitespace-nowrap">
        {[...modules, ...modules].map((item, i) => (
          <div key={`${item}-${i}`} className="flex items-center gap-2 font-mono text-[0.78rem] tracking-[0.05em] text-[#64748b]">
            <div className="h-1 w-1 rounded-full bg-[#00d4aa]" /> {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// function Ticker() {
//   return (
//     <div className="overflow-hidden border-y border-white/[0.07] bg-white/[0.01] py-3">
//       <div className="flex w-max animate-ticker gap-16 whitespace-nowrap">
//         {[...modules, ...modules, ...modules].map((item, i) => (
//           <div
//             key={${item}-${i}}
//             className="flex items-center gap-2 font-mono text-[10px] tracking-[0.05em] text-[#64748b]"
//           >
//             <div className="h-1 w-1 rounded-full bg-[#00d4aa]" />
//             {item}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

function EngineSection() {
  return (
    // <section id="engine" className="relative bg-[#070a17] px-8 py-24">
    //   <div className="mx-auto max-w-7xl">
    //     <SectionHeader tag="// The Semlox Engine" title={<>One AI core.<br />Every logistics operation.</>} sub="The Semlox Engine is a real-time intelligence layer that ingests, classifies, and routes logistics data across your entire operation — from first-mile pickup to last-mile delivery." />

    //     <div className="mt-16 grid grid-cols-2 items-center gap-16 max-md:grid-cols-1">
    //       <div className="fade-up relative flex h-[400px] items-center justify-center opacity-0 translate-y-[30px] transition duration-700">
    //         <div className="relative flex h-[200px] w-[200px] items-center justify-center">
    //           <div className="h-[180px] w-[180px] animate-pulse rounded-[20px] bg-gradient-to-br from-blue-500/20 to-cyan-500/10 [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]" />
    //           <div className="absolute flex flex-col items-center justify-center gap-1">
    //             <div className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[#06b6d4]">Processing</div>
    //             <div className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-[2rem] font-bold text-transparent">2.1M</div>
    //             <div className="font-mono text-[0.6rem] text-[#64748b]">docs/day</div>
    //           </div>
    //         </div>

    //         {orbitItems.map((item) => (
    //           <div key={item.label} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center font-mono text-[0.65rem] tracking-[0.05em] text-[#64748b]" style={{ top: item.top, left: item.left }}>
    //             <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.05] text-base">{item.icon}</div>
    //             {item.label}
    //           </div>
    //         ))}
    //       </div>

    //       <div className="flex flex-col gap-6">
    //         {engineFeatures.map((feature, i) => (
    //           <div key={feature.title} className="fade-up flex translate-y-[30px] gap-4 rounded-xl border border-white/[0.07] bg-white/[0.035] p-5 opacity-0 transition duration-700 hover:border-cyan-500/30 hover:bg-cyan-500/[0.04]" style={{ transitionDelay: `${(i + 1) * 100}ms` }}>
    //             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-[1.1rem]">{feature.icon}</div>
    //             <div>
    //               <div className="mb-1 text-[0.9rem] font-semibold">{feature.title}</div>
    //               <div className="text-[0.8rem] leading-[1.5] text-[#64748b]">{feature.desc}</div>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>
    //   </div>
    // </section>

    <>
      <section id="engine" className="relative bg-[#070a17] px-4 py-20 sm:px-6 lg:px-10">
  <div className="mx-auto max-w-[1440px]">

    <SectionHeader
      tag="// The Semlox Engine"
      title={
        <>
          One AI core.
          <br />
          Every logistics operation.
        </>
      }
      sub="The Semlox Engine is a real-time intelligence layer that ingests, classifies, and routes logistics data across your entire operation — from first-mile pickup to last-mile delivery."
    />

    <div className="mt-12 grid grid-cols-2 items-center gap-10 max-md:grid-cols-1 lg:gap-16">

      {/* LEFT VISUAL */}
      <div className="fade-up relative flex h-[min(36vw,420px)] min-h-[340px] items-center justify-center opacity-0 translate-y-[30px] transition duration-700">

        <div className="relative flex h-[170px] w-[170px] items-center justify-center">
          <div className="h-[150px] w-[150px] animate-pulse rounded-[18px] bg-gradient-to-br from-blue-500/20 to-cyan-500/10 [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)]" />

          <div className="absolute flex flex-col items-center justify-center gap-1">
            <div className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-[#06b6d4]">
              Processing
            </div>

            <div className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-[1.6rem] font-bold text-transparent">
              2.1M
            </div>

            <div className="font-mono text-[0.65rem] text-[#64748b]">
              docs/day
            </div>
          </div>
        </div>

        {orbitItems.map((item) => (
          <div
            key={item.label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center font-mono text-[0.65rem] tracking-[0.05em] text-[#64748b]"
            style={{ top: item.top, left: item.left }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.05] text-[12px]">
              {item.icon}
            </div>
            {item.label}
          </div>
        ))}

      </div>

      {/* RIGHT FEATURES */}
      <div className="flex flex-col gap-4">

        {engineFeatures.map((feature, i) => (
          <div
            key={feature.title}
            className="fade-up flex translate-y-[30px] gap-3 rounded-lg border border-white/[0.07] bg-white/[0.035] p-4 opacity-0 transition duration-700 hover:border-cyan-500/30 hover:bg-cyan-500/[0.04]"
            style={{ transitionDelay: `${(i + 1) * 100}ms` }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-[13px]">
              {feature.icon}
            </div>

            <div>
              <div className="mb-1 text-[14px] font-semibold">
                {feature.title}
              </div>

              <div className="text-[12.5px] leading-[1.55] text-[#64748b]">
                {feature.desc}
              </div>
            </div>
          </div>
        ))}

      </div>

    </div>
  </div>
</section>
    </>
  );
}

function ModulesSection() {
  return (
    // <section id="modules" className="relative px-8 py-24">
    //   <div className="mx-auto max-w-7xl">
    //     <SectionHeader tag="// Operational Modules" title={<>Plug in what you need.<br />Scale what you build.</>} />

    //     <div className="mt-12 grid grid-cols-3 gap-6 max-md:grid-cols-1">
    //       <BentoWideAWB />
    //       <BentoCard accent="blue" icon="🗺️" tag="Module 02" title="Predictive Routing" desc="AI evaluates 200+ variables — weather, port congestion, carrier reliability, fuel costs — to compute the optimal route in real time. Reduce transit time by up to 18%." chip="Beta" chipType="beta" delay={100} />
    //       <BentoCard accent="teal" icon="📡" tag="Module 03" title="Real-time Visibility" desc="Single pane of glass across all carriers, modes, and geographies. Live ETAs, exception alerts, and milestone tracking for every shipment in your portfolio." chip="Live" chipType="live" delay={200} />
    //       <BentoCard accent="orange" icon="🏭" tag="Module 04" title="Warehouse Analytics" desc="Inbound forecasting, dock scheduling, and pick-pack optimization powered by historical flow data and real-time inventory signals." chip="Q4 2026" chipType="coming" delay={300} />
    //       <BentoWideCustoms />
    //     </div>
    //   </div>
    // </section> 
    <>
    <section id="modules" className="relative px-4 py-20 sm:px-6 lg:px-10">
  <div className="mx-auto max-w-[1440px]">

    <SectionHeader
      tag="// Operational Modules"
      title={
        <>
          Plug in what you need.
          <br />
          Scale what you build.
        </>
      }
    />

    <div className="mt-10 grid grid-cols-3 gap-5 max-md:grid-cols-1 lg:gap-6">

      <BentoWideAWB />

      <BentoCard
        accent="blue"
        icon="🗺️"
        tag="Module 02"
        title="Predictive Routing"
        desc="AI evaluates 200+ variables — weather, port congestion, carrier reliability, fuel costs — to compute the optimal route in real time. Reduce transit time by up to 18%."
        chip="Beta"
        chipType="beta"
        delay={100}
      />

      <BentoCard
        accent="teal"
        icon="📡"
        tag="Module 03"
        title="Real-time Visibility"
        desc="Single pane of glass across all carriers, modes, and geographies. Live ETAs, exception alerts, and milestone tracking for every shipment in your portfolio."
        chip="Live"
        chipType="live"
        delay={200}
      />

      <BentoCard
        accent="orange"
        icon="🏭"
        tag="Module 04"
        title="Warehouse Analytics"
        desc="Inbound forecasting, dock scheduling, and pick-pack optimization powered by historical flow data and real-time inventory signals."
        chip="Q4 2026"
        chipType="coming"
        delay={300}
      />

      <BentoCard
        accent="blue"
        icon="BOX"
        tag="Module 05"
        title="Smart Load Planning"
        desc="AI groups shipments by priority, volume, lane, and carrier capacity to reduce empty space, prevent missed handoffs, and keep freight moving on schedule."
        chip="Beta"
        chipType="beta"
        delay={350}
      />

      <BentoWideCustoms />

      <BentoCard
        accent="cyan"
        icon="BI"
        tag="Module 07"
        title="Executive Insights"
        desc="Live performance dashboards summarize exceptions, processing speed, carrier reliability, and document accuracy for leadership teams in one clear view."
        chip="Q2 2027"
        chipType="coming"
        delay={500}
      />

    </div>
  </div>
</section>
     </>
  );
}

function BentoWideAWB() {
  return (
    <div className="fade-up group relative col-span-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] p-8 opacity-0 translate-y-[30px] transition duration-700 before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/[0.04] before:to-transparent before:opacity-0 before:transition before:content-[''] hover:-translate-y-0.5 hover:border-cyan-500/25 hover:before:opacity-100 max-md:col-span-1">
      <AccentLine color="cyan" />
      <div className="relative grid grid-cols-2 items-center gap-8 max-md:grid-cols-1">
        <div>
          <BentoIcon color="cyan">🛩️</BentoIcon>
          <BentoText tag="Module 01" title="Automated AWB Processing" desc="Upload PDFs, images, or EDI files. The engine extracts shipper, consignee, weight, dimensions, and HS codes with 98.7% accuracy — then auto-generates compliant Air Waybills ready for airline submission." />
          <Chip type="live" text="Live" />
        </div>
        <div>
          <div className="mb-3 flex h-20 items-center justify-center gap-4 rounded-lg border border-cyan-500/15 bg-cyan-500/[0.05] p-4">
            {["FRA", "DXB", "SIN", "JFK", "LHR"].map((c, i) => (
              <div key={c} className="text-center">
                <div className="mx-auto mb-1 h-2 w-2 rounded-full bg-[#06b6d4]" style={{ opacity: 0.4 + i * 0.15 }} />
                <div className="font-mono text-[0.65rem] text-[#64748b]">{c}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-10 items-end gap-[3px]">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
              <div key={i} className="min-h-1 flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500/50 to-blue-500/20" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-1 font-mono text-[0.75rem] text-[#64748b]">AWB throughput · last 12h</div>
        </div>
      </div>
    </div>
  );
}

function BentoWideCustoms() {
  return (
    <div className="fade-up group relative col-span-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] p-8 opacity-0 translate-y-[30px] transition duration-700 before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/[0.04] before:to-transparent before:opacity-0 before:transition before:content-[''] hover:-translate-y-0.5 hover:border-cyan-500/25 hover:before:opacity-100 max-md:col-span-1" style={{ transitionDelay: "400ms" }}>
      <AccentLine color="blue" />
      <div className="relative grid grid-cols-2 items-center gap-8 max-md:grid-cols-1">
        <div>
          <BentoIcon color="blue">🤖</BentoIcon>
          <BentoText tag="Module 06" title="Customs AutoFill" desc="AI reads source documents, maps to destination country requirements, and pre-fills import/export declarations. Supports 140+ country rule sets. Cuts customs preparation time by 75%." />
          <Chip type="coming" text="Q1 2027" />
        </div>
        <div className="flex flex-col gap-2">
          {[["HS Code Validation", "99.1%"], ["Duty Calculation", "Automated"], ["Compliance Check", "Real-time"], ["Document Generation", "Sub-5s"]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-md border border-blue-500/10 bg-blue-500/[0.05] px-3 py-2">
              <span className="text-[13px] text-[#64748b]">{k}</span>
              <span className="font-mono text-[13px] text-[#3b82f6]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BentoCard({ accent, icon, tag, title, desc, chip, chipType, delay }: { accent: "blue" | "cyan" | "orange" | "teal"; icon: string; tag: string; title: string; desc: string; chip: string; chipType: "live" | "beta" | "coming"; delay: number }) {
  return (
    <div className="fade-up group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.035] p-8 opacity-0 translate-y-[30px] transition duration-700 before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/[0.04] before:to-transparent before:opacity-0 before:transition before:content-[''] hover:-translate-y-0.5 hover:border-cyan-500/25 hover:before:opacity-100" style={{ transitionDelay: `${delay}ms` }}>
      <AccentLine color={accent} />
      <div className="relative">
        <BentoIcon color={accent}>{icon}</BentoIcon>
        <BentoText tag={tag} title={title} desc={desc} />
        <Chip type={chipType} text={chip} />
      </div>
    </div>
  );
}

function AccentLine({ color }: { color: "blue" | "cyan" | "orange" | "teal" }) {
  const colors = {
    blue: "via-[#3b82f6]",
    cyan: "via-[#06b6d4]",
    orange: "via-[#f97316]",
    teal: "via-[#00d4aa]",
  };
  return <div className={`absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent ${colors[color]} to-transparent`} />;
}

function BentoIcon({ color, children }: { color: "blue" | "cyan" | "orange" | "teal"; children: React.ReactNode }) {
  const styles = {
    blue: "border-blue-500/20 bg-blue-500/15",
    cyan: "border-cyan-500/20 bg-cyan-500/15",
    orange: "border-orange-500/20 bg-orange-500/15",
    teal: "border-[#00d4aa]/20 bg-[#00d4aa]/15",
  };
  return <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border text-xl ${styles[color]}`}>{children}</div>;
}

function BentoText({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <>
      <div className="mb-2 font-mono text-[0.68rem] uppercase tracking-[0.1em] text-[#64748b]">{tag}</div>
      <div className="mb-2 text-[1.1rem] font-bold tracking-[-0.01em]">{title}</div>
      <div className="text-[0.9rem] leading-[1.6] text-[#64748b]">{desc}</div>
    </>
  );
}

function Chip({ type, text }: { type: "live" | "beta" | "coming"; text: string }) {
  const styles = {
    live: "border-[#00d4aa]/20 bg-[#00d4aa]/10 text-[#00d4aa]",
    beta: "border-blue-500/20 bg-blue-500/10 text-[#3b82f6]",
    coming: "border-orange-500/20 bg-orange-500/10 text-[#f97316]",
  };
  return <span className={`mt-4 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[0.68rem] uppercase tracking-[0.08em] ${styles[type]}`}><span className="h-1 w-1 rounded-full bg-current" />{text}</span>;
}

function SecuritySection() {
  return (
    // <section id="security" className="relative overflow-hidden bg-[#070a17] px-8 py-24 before:absolute before:right-[-200px] before:top-1/2 before:h-[600px] before:w-[600px] before:-translate-y-1/2 before:rounded-full before:bg-[radial-gradient(circle,rgba(249,115,22,0.04),transparent_70%)] before:content-['']">
    //   <div className="mx-auto max-w-7xl">
    //     <div className="grid grid-cols-2 items-center gap-16 max-md:grid-cols-1">
    //       <div>
    //         <SectionHeader tag="// Enterprise Security" title={<>Your supply chain data.<br />Locked down. Always.</>} sub="SemloX is built for enterprises where data integrity isn't optional. Every byte in motion and at rest is protected by military-grade encryption and zero-trust architecture." />
    //         <div className="mt-8 flex flex-col gap-4">
    //           {securityItems.map((item, i) => (
    //             <div key={item} className="fade-up flex translate-y-[30px] items-start gap-2.5 text-sm leading-[1.5] text-[#64748b] opacity-0 transition duration-700" style={{ transitionDelay: `${((i % 4) + 1) * 100}ms` }}>
    //               <div className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/15 text-[0.6rem] text-[#f97316]">✓</div>
    //               <span>{item}</span>
    //             </div>
    //           ))}
    //         </div>
    //       </div>

    //       <div className="fade-up grid translate-y-[30px] grid-cols-2 gap-4 opacity-0 transition duration-700 [transition-delay:0.2s] max-md:grid-cols-1">
    //         {securityBadges.map((badge) => (
    //           <div key={badge.title} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] p-5 transition hover:border-orange-500/20 hover:bg-orange-500/[0.03]">
    //             <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-sm">{badge.icon}</div>
    //             <div>
    //               <div className="mb-0.5 text-[0.8rem] font-semibold">{badge.title}</div>
    //               <div className="text-[0.7rem] text-[#64748b]">{badge.sub}</div>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>
    //   </div>
    // </section>
    <>
      <section
  id="security"
  className="relative overflow-hidden bg-[#070a17] px-4 py-18 sm:px-6 lg:px-10 before:absolute before:right-[-200px] before:top-1/2 before:h-[520px] before:w-[520px] before:-translate-y-1/2 before:rounded-full before:bg-[radial-gradient(circle,rgba(249,115,22,0.04),transparent_70%)] before:content-['']"
>
  <div className="mx-auto max-w-[1440px]">
    <div className="grid font-latin grid-cols-2 items-center gap-10 max-md:grid-cols-1 lg:gap-16">
      <div>
        <SectionHeader
          tag="// Enterprise Security"
          title={
            <>
              Your supply chain data.
              <br />
              Locked down. Always.
            </>
          }
          sub="SemloX is built for enterprises where data integrity isn't optional. Every byte in motion and at rest is protected by military-grade encryption and zero-trust architecture."
        />

        <div className="mt-6 flex flex-col gap-3">
          {securityItems.map((item, i) => (
            <div
              key={item}
              className="fade-up flex translate-y-[30px] items-start gap-2 text-[13px] leading-[1.55] text-[#64748b] opacity-0 transition duration-700"
              style={{ transitionDelay: `${((i % 4) + 1) * 100}ms` }}
            >
              <div className="mt-px flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/15 text-[0.55rem] text-[#f97316]">
                ✓
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-up grid translate-y-[30px] grid-cols-2 gap-3 opacity-0 transition duration-700 [transition-delay:0.2s] max-md:grid-cols-1">
        {securityBadges.map((badge) => (
          <div
            key={badge.title}
            className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.035] p-4 transition hover:border-orange-500/20 hover:bg-orange-500/[0.03]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-orange-500/20 bg-orange-500/10 text-[13px]">
              {badge.icon}
            </div>

            <div>
              <div className="mb-0.5 text-[13px] font-semibold">
                {badge.title}
              </div>
              <div className="text-[11px] text-[#64748b]">
                {badge.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
    </>
  );
}

function CTASection() {
  return (

    <>
    <section className="relative overflow-hidden px-4 py-20 text-center sm:px-6 lg:px-10 before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(59,130,246,0.06),transparent)]">
  
  {/* glow */}
  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.07),transparent_70%)]" />

  <div className="relative z-[1]">

    <div className=" inline-block font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[#06b6d4]">
      Get Started
    </div>

    {/* heading */}
    <div className="fade-up translate-y-[30px] text-[clamp(2rem,3vw,3rem)] font-bold leading-[1.25] tracking-[-0.03em] opacity-0 transition duration-700">
      Ready to run logistics<br />at machine speed?
    </div>

    {/* paragraph */}
    <p className="fade-up mx-auto mt-4 max-w-[480px] translate-y-[30px] text-[14px] leading-[1.7] text-[#64748b] opacity-0 transition duration-700 [transition-delay:0.1s]">
      Join 200+ freight operators and 3PLs who have replaced manual document workflows with SemloX&apos;s AI engine. Implementation in under 48 hours.
    </p>

    {/* buttons */}
    <div className="fade-up mt-8 flex translate-y-[30px] flex-wrap justify-center gap-3 opacity-0 transition duration-700 [transition-delay:0.2s] mb-14">

      <a
        href="#"
        className="inline-flex items-center gap-2 rounded-[8px] bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] px-6 py-3 text-[14px] font-semibold text-white transition hover:-translate-y-px hover:shadow-[0_6px_25px_rgba(59,130,246,0.3)]"
      >
        Start Free Trial →
      </a>

      <a
        href="#"
        className="inline-flex items-center gap-2 rounded-[8px] border border-white/[0.07] px-6 py-3 text-[14px] font-medium text-[#e2e8f0] transition hover:border-white/20 hover:bg-white/[0.04]"
      >
        Talk to Sales
      </a>

    </div>

    {/* footer line */}
    <div className="mt-6 font-mono text-[11px] tracking-[0.05em] text-[#64748b]">
      No credit card required · Enterprise SLA available · GDPR compliant
    </div>

  </div>
</section>
    </>
  );
}

function Footer() {
  return (
    // <footer className="border-t border-white/[0.07] px-8 py-12">
    //   <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
    //     <div className="flex items-center gap-2.5">
    //       <LogoMark size="h-6 w-6" />
    //       <span className="text-[0.9rem] font-semibold">SemloX</span>
    //       <span className="font-mono text-xs text-[#64748b]">© 2026</span>
    //     </div>
    //     <div className="flex gap-8">
    //       {["Platform", "Modules", "Security", "Pricing", "Docs", "Blog", "Careers"].map((link) => (
    //         <a key={link} href="#" className="text-[0.8rem] text-[#64748b] no-underline transition hover:text-[#e2e8f0]">{link}</a>
    //       ))}
    //     </div>
    //     <div className="font-mono text-xs text-[#64748b]">semlox.de · Frankfurt, DE</div>
    //   </div>
    // </footer> 
    <>
      <footer className="border-t border-white/[0.07] px-6 py-8">
  
  <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">

    {/* LEFT */}
    <div className="flex items-center gap-2">
      <LogoMark size="h-5 w-5" />

      <span className="text-[14px] font-semibold text-[#e2e8f0]">
        SemloX
      </span>

      <span className="font-mono text-[11px] text-[#64748b]">
        © 2026
      </span>
    </div>

    {/* CENTER LINKS */}
    <div className="flex flex-wrap gap-6">
      {["Platform", "Modules", "Security", "Pricing", "Docs", "Blog", "Careers"].map((link) => (
        <a
          key={link}
          href="#"
          className="text-[12px] text-[#64748b] no-underline transition hover:text-[#e2e8f0]"
        >
          {link}
        </a>
      ))}
    </div>

    {/* RIGHT */}
    <div className="font-mono text-[11px] text-[#64748b]">
      semlox.de · Frankfurt, DE
    </div>

  </div>
</footer>
    </>
  );
}

function SectionHeader({ tag, title, sub }: { tag: string; title: React.ReactNode; sub?: string }) {
  return (
    <>
      <div className="fade-up mb-4 translate-y-[30px] font-mono text-[0.78rem] uppercase tracking-[0.15em] text-[#06b6d4] opacity-0 transition duration-700">{tag}</div>
      <h2 className="fade-up mb-4 translate-y-[30px] text-[clamp(1.8rem,3vw,2.75rem)] font-bold leading-[1.2] tracking-[-0.03em] opacity-0 transition duration-700 [transition-delay:0.1s]">{title}</h2>
      {sub && <p className="fade-up max-w-[540px] translate-y-[30px] text-base leading-[1.7] text-[#64748b] opacity-0 transition duration-700 [transition-delay:0.2s]">{sub}</p>}
    </>
  );
}

function LogoMark({ size }: { size: string }) {
  return (
    <svg className={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="url(#semloxLogoGradient)" />
      <path d="M8 10h10l-4 6h10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="semloxLogoGradient" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}



// "use client";

// import React, { useEffect, useMemo, useRef, useState } from "react";

// type Theme = "dark" | "light";
// type DocStatus = "ok" | "pdf" | "issued" | "draft" | "partial" | "fail";

// type DocRow = {
//   id: number;
//   date: string;
//   time: string;
//   awb: string;
//   action: string;
//   type: string;
//   status: DocStatus;
//   fields: number;
//   extracted: number;
//   user: string;
//   size: string;
//   pages: number;
// };

// const iconPaths = {
//   home: "M2 6L8 1l6 5v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6zM6 15V9h4v6",
//   doc: "M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5L9 1zM9 1v4h4M5 9h6M5 12h4",
//   history: "M8 1a7 7 0 100 14A7 7 0 008 1zM8 4v4l2.5 1.5",
//   gear: "M8 5.5A2.5 2.5 0 118 10.5A2.5 2.5 0 018 5.5zM8 1v2M8 13v2M1 8h2M13 8h2",
//   bell: "M8 1a4 4 0 014 4v4l1.5 2H.5L2 9V5a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0",
//   search: "M7 12A5 5 0 107 2a5 5 0 000 10zM14 14l-3-3",
//   upload: "M8 2v9M5 5l3-3 3 3M2 13h12",
//   refresh: "M13 8a5 5 0 11-1.4-3.5M14 2v4h-4",
//   x: "M3 3l10 10M13 3L3 13",
//   open: "M10 3h4v4M14 3L9 8M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9",
//   dl: "M8 2v9M5 11l3 3 3-3M2 15h12",
//   more: "M4 8h.01M8 8h.01M12 8h.01",
//   cal: "M1 5h14M3 1v3M13 1v3M1 3h14v11a1 1 0 01-1 1H2a1 1 0 01-1-1V3z",
//   sun: "M8 11A3 3 0 108 5a3 3 0 000 6zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3",
//   moon: "M9 2a7 7 0 00-7 7 7 7 0 007 7 7 0 004.9-2.1A5 5 0 019 2z",
//   check: "M2 8l4 4 8-6",
//   col: "M2 2h4v12H2zM10 2h4v12h-4z",
//   chevR: "M6 3l5 5-5 5",
// } as const;

// function Icon({ name, size = 15, className = "" }: { name: keyof typeof iconPaths; size?: number; className?: string }) {
//   return (
//     <svg
//       width={size}
//       height={size}
//       viewBox="0 0 16 16"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="1.6"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       className={className}
//     >
//       <path d={iconPaths[name]} />
//     </svg>
//   );
// }

// const docs: DocRow[] = [
//   { id: 1, date: "27/04/2026", time: "10:42:15 am", awb: "724-12849302", action: "Initial Extraction", type: "AWB", status: "ok", fields: 14, extracted: 14, user: "Anna K.", size: "248 KB", pages: 2 },
//   { id: 2, date: "27/04/2026", time: "10:41:52 am", awb: "724-12849302", action: "Generated PDF", type: "AWB", status: "pdf", fields: 14, extracted: 14, user: "Anna K.", size: "312 KB", pages: 2 },
//   { id: 3, date: "27/04/2026", time: "10:41:55 am", awb: "724-12849302", action: "Issued AWB", type: "AWB", status: "issued", fields: 14, extracted: 14, user: "Anna K.", size: "312 KB", pages: 2 },
//   { id: 4, date: "27/04/2026", time: "09:18:03 am", awb: "180-00293817", action: "Initial Extraction", type: "AWB", status: "partial", fields: 14, extracted: 11, user: "M. Schulz", size: "184 KB", pages: 1 },
//   { id: 5, date: "27/04/2026", time: "09:18:40 am", awb: "180-00293817", action: "Draft Saved", type: "AWB", status: "draft", fields: 14, extracted: 11, user: "M. Schulz", size: "184 KB", pages: 1 },
//   { id: 6, date: "26/04/2026", time: "04:55:22 pm", awb: "618-44192003", action: "Initial Extraction", type: "AWB", status: "fail", fields: 14, extracted: 0, user: "T. Bauer", size: "512 KB", pages: 3 },
//   { id: 7, date: "26/04/2026", time: "02:30:10 pm", awb: "020-91843001", action: "Initial Extraction", type: "AWB", status: "ok", fields: 14, extracted: 14, user: "Anna K.", size: "196 KB", pages: 1 },
//   { id: 8, date: "26/04/2026", time: "02:30:55 pm", awb: "020-91843001", action: "Generated PDF", type: "AWB", status: "pdf", fields: 14, extracted: 14, user: "Anna K.", size: "206 KB", pages: 1 },
//   { id: 9, date: "26/04/2026", time: "02:31:12 pm", awb: "020-91843001", action: "Issued AWB", type: "AWB", status: "issued", fields: 14, extracted: 14, user: "Anna K.", size: "206 KB", pages: 1 },
//   { id: 10, date: "25/04/2026", time: "11:12:34 am", awb: "083-22019847", action: "Initial Extraction", type: "AWB", status: "partial", fields: 14, extracted: 13, user: "K. Weber", size: "302 KB", pages: 2 },
//   { id: 11, date: "25/04/2026", time: "11:13:01 am", awb: "083-22019847", action: "Generated PDF", type: "AWB", status: "pdf", fields: 14, extracted: 13, user: "K. Weber", size: "318 KB", pages: 2 },
//   { id: 12, date: "24/04/2026", time: "03:45:00 pm", awb: "083-11234567", action: "Initial Extraction", type: "AWB", status: "ok", fields: 14, extracted: 14, user: "M. Schulz", size: "178 KB", pages: 1 },
//   { id: 13, date: "24/04/2026", time: "03:45:30 pm", awb: "083-11234567", action: "Generated PDF", type: "AWB", status: "pdf", fields: 14, extracted: 14, user: "M. Schulz", size: "192 KB", pages: 1 },
//   { id: 14, date: "24/04/2026", time: "03:46:00 pm", awb: "083-11234567", action: "Issued AWB", type: "AWB", status: "issued", fields: 14, extracted: 14, user: "M. Schulz", size: "192 KB", pages: 1 },
//   { id: 15, date: "23/04/2026", time: "09:00:00 am", awb: "999-00112233", action: "Initial Extraction", type: "AWB", status: "fail", fields: 14, extracted: 0, user: "T. Bauer", size: "88 KB", pages: 1 },
//   { id: 16, date: "22/04/2026", time: "02:14:55 pm", awb: "447-83920011", action: "Initial Extraction", type: "AWB", status: "ok", fields: 14, extracted: 14, user: "Anna K.", size: "224 KB", pages: 2 },
//   { id: 17, date: "22/04/2026", time: "02:15:30 pm", awb: "447-83920011", action: "Issued AWB", type: "AWB", status: "issued", fields: 14, extracted: 14, user: "Anna K.", size: "224 KB", pages: 2 },
//   { id: 18, date: "21/04/2026", time: "10:05:10 am", awb: "339-00488271", action: "Initial Extraction", type: "AWB", status: "partial", fields: 14, extracted: 12, user: "K. Weber", size: "155 KB", pages: 1 },
// ];

// const statusConfig: Record<DocStatus, { label: string; className: string; colorClass: string }> = {
//   ok: { label: "Success", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400", colorClass: "bg-emerald-400" },
//   pdf: { label: "PDF Generated", className: "border-violet-500/20 bg-violet-500/10 text-violet-400", colorClass: "bg-violet-400" },
//   issued: { label: "AWB Issued", className: "border-blue-500/20 bg-blue-500/10 text-blue-400", colorClass: "bg-blue-400" },
//   draft: { label: "Draft Saved", className: "border-amber-500/20 bg-amber-500/10 text-amber-400", colorClass: "bg-amber-400" },
//   partial: { label: "Partial", className: "border-orange-500/20 bg-orange-500/10 text-orange-400", colorClass: "bg-orange-400" },
//   fail: { label: "Failed", className: "border-red-500/20 bg-red-500/10 text-red-400", colorClass: "bg-red-400" },
// };

// const actionColor: Record<string, string> = {
//   "Initial Extraction": "text-cyan-400",
//   "Generated PDF": "text-violet-400",
//   "Issued AWB": "text-blue-400",
//   "Draft Saved": "text-amber-400",
// };

// const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// function formatDate(date: Date | null) {
//   if (!date) return null;
//   return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
// }

// function Calendar({ value, onChange, onClose }: { value: Date | null; onChange: (date: Date | null) => void; onClose: () => void }) {
//   const today = new Date(2026, 3, 27);
//   const [current, setCurrent] = useState({ month: value ? value.getMonth() : today.getMonth(), year: value ? value.getFullYear() : today.getFullYear() });

//   const firstDay = new Date(current.year, current.month, 1);
//   const startOffset = firstDay.getDay();
//   const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
//   const daysInPreviousMonth = new Date(current.year, current.month, 0).getDate();

//   const cells: { day: number; currentMonth: boolean }[] = [];
//   for (let i = 0; i < startOffset; i += 1) cells.push({ day: daysInPreviousMonth - startOffset + i + 1, currentMonth: false });
//   for (let i = 1; i <= daysInMonth; i += 1) cells.push({ day: i, currentMonth: true });
//   while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, currentMonth: false });

//   return (
//     <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[300px] animate-[fadeUp_0.15s_ease] rounded-[14px] border border-white/10 bg-[#0d1323] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] dark:bg-[#0d1323]" onClick={(event) => event.stopPropagation()}>
//       <div className="mb-3.5 flex items-center justify-between">
//         <div className="flex gap-1">
//           <button className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-500 transition hover:border-blue-500/30 hover:text-blue-400" onClick={() => setCurrent((c) => (c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year }))}>‹</button>
//           <button className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-500 transition hover:border-blue-500/30 hover:text-blue-400" onClick={() => setCurrent((c) => (c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year }))}>›</button>
//         </div>
//         <div className="text-[13px] font-bold text-slate-100">{months[current.month]} {current.year}</div>
//       </div>

//       <div className="grid grid-cols-7 gap-0.5">
//         {days.map((day) => <div key={day} className="py-1 text-center font-mono text-[10px] tracking-wider text-slate-500">{day}</div>)}
//         {cells.map((cell, index) => {
//           const isToday = cell.currentMonth && cell.day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();
//           const isSelected = value && cell.currentMonth && cell.day === value.getDate() && current.month === value.getMonth() && current.year === value.getFullYear();
//           return (
//             <button
//               key={`${cell.day}-${index}`}
//               className={`flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-xs transition ${cell.currentMonth ? "text-slate-300 hover:bg-blue-500/10 hover:text-blue-400" : "text-slate-500/40"} ${isToday ? "border-blue-500/30 font-bold text-blue-400" : ""} ${isSelected ? "bg-blue-500 font-bold text-white hover:bg-blue-500 hover:text-white" : ""}`}
//               onClick={() => cell.currentMonth && onChange(new Date(current.year, current.month, cell.day))}
//             >
//               {cell.day}
//             </button>
//           );
//         })}
//       </div>

//       <div className="mt-3.5 flex gap-2 border-t border-white/10 pt-3.5">
//         <button className="flex-1 rounded-lg border border-white/10 bg-transparent p-2 text-xs font-semibold text-slate-500 transition hover:text-slate-200" onClick={() => onChange(null)}>Clear</button>
//         <button className="flex-1 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2 text-xs font-semibold text-white" onClick={onClose}>Apply</button>
//       </div>
//     </div>
//   );
// }

// function DateRangePicker({ from, to, onChange }: { from: Date | null; to: Date | null; onChange: (from: Date | null, to: Date | null) => void }) {
//   const [open, setOpen] = useState<"from" | "to" | null>(null);
//   const pickerRef = useRef<HTMLDivElement | null>(null);

//   useEffect(() => {
//     const handleClick = (event: MouseEvent) => {
//       if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setOpen(null);
//     };
//     document.addEventListener("mousedown", handleClick);
//     return () => document.removeEventListener("mousedown", handleClick);
//   }, []);

//   return (
//     <div ref={pickerRef} className="relative flex items-center gap-1.5">
//       <button className={`flex items-center gap-2 rounded-lg border px-3 py-[7px] text-xs transition ${from ? "border-blue-500/30 text-blue-400" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-500/30"}`} onClick={() => setOpen(open === "from" ? null : "from")}>
//         <Icon name="cal" size={12} />
//         {formatDate(from) ?? "From date"}
//       </button>
//       <span className="text-[11px] text-slate-500">→</span>
//       <button className={`flex items-center gap-2 rounded-lg border px-3 py-[7px] text-xs transition ${to ? "border-blue-500/30 text-blue-400" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-blue-500/30"}`} onClick={() => setOpen(open === "to" ? null : "to")}>
//         <Icon name="cal" size={12} />
//         {formatDate(to) ?? "To date"}
//       </button>
//       {open === "from" && <Calendar value={from} onChange={(date) => { onChange(date, to); if (date) setOpen("to"); }} onClose={() => setOpen(null)} />}
//       {open === "to" && <Calendar value={to} onChange={(date) => { onChange(from, date); setOpen(null); }} onClose={() => setOpen(null)} />}
//     </div>
//   );
// }

// function Badge({ status }: { status: DocStatus }) {
//   const config = statusConfig[status];
//   return (
//     <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${config.className}`}>
//       <span className="h-1 w-1 rounded-full bg-current" />
//       {config.label}
//     </span>
//   );
// }

// function CheckboxBox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
//   return (
//     <button onClick={onClick} className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border-[1.5px] transition ${checked ? "border-blue-500 bg-blue-500 text-white" : "border-white/10 bg-white/[0.04]"}`}>
//       {checked && <Icon name="check" size={9} />}
//     </button>
//   );
// }

// function DetailPanel({ doc, onClose }: { doc: DocRow | null; onClose: () => void }) {
//   if (!doc) return null;

//   const fieldColor = (value: number) => {
//     if (value >= 95) return "bg-emerald-400 text-emerald-400";
//     if (value >= 85) return "bg-amber-400 text-amber-400";
//     if (value > 0) return "bg-orange-400 text-orange-400";
//     return "bg-red-400 text-red-400";
//   };

//   const fields = [
//     { label: "AWB Number", value: doc.awb, confidence: 99 },
//     { label: "Shipper Name", value: "DB Schenker GmbH", confidence: 99 },
//     { label: "Consignee", value: "Siemens AG — SIN", confidence: 98 },
//     { label: "Origin Airport", value: "FRA — Frankfurt", confidence: 99 },
//     { label: "Dest. Airport", value: "SIN — Singapore", confidence: 99 },
//     { label: "Gross Weight", value: "1,240 kg", confidence: 98 },
//     { label: "Pieces", value: "14 pcs", confidence: 97 },
//     { label: "HS Code", value: doc.extracted >= 13 ? "8471.30.0000" : "Not extracted", confidence: doc.extracted >= 13 ? 94 : 0 },
//     { label: "Flight No.", value: doc.extracted >= 13 ? "LH9012" : "Not extracted", confidence: doc.extracted >= 13 ? 91 : 0 },
//     { label: "Special Handling", value: doc.extracted >= 12 ? "CAO" : "Not extracted", confidence: doc.extracted >= 12 ? 87 : 0 },
//   ];

//   const timeline = [
//     { label: "File Uploaded", time: "10:41:50 am", color: "bg-blue-400" },
//     { label: "AI Extraction Run", time: "10:41:51 am", color: "bg-cyan-400" },
//     { label: "Fields Extracted", time: "10:41:52 am", color: "bg-emerald-400" },
//     { label: "PDF Generated", time: "10:41:53 am", color: "bg-violet-400" },
//     ...(doc.status === "issued" ? [{ label: "AWB Issued", time: "10:41:55 am", color: "bg-blue-400" }] : []),
//   ];

//   return (
//     <>
//       <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-white/10 px-[18px]">
//         <div className="min-w-0 flex-1">
//           <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs font-bold text-slate-100">{doc.awb}</div>
//           <div className="mt-0.5 text-[10px] text-slate-500">{doc.action} · {doc.date}</div>
//         </div>
//         <button onClick={onClose} className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-slate-500 transition hover:border-red-500/30 hover:text-red-400"><Icon name="x" size={11} /></button>
//       </div>

//       <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
//         <div className="mb-4 flex flex-wrap items-center gap-2">
//           <Badge status={doc.status} />
//           <span className="inline-flex items-center rounded border border-blue-500/15 bg-blue-500/10 px-2 py-1 font-mono text-[10px] font-bold text-blue-400">AWB</span>
//           <span className="ml-auto text-[11px] text-slate-500">{doc.size} · {doc.pages}p</span>
//         </div>

//         <section className="mb-[18px]">
//           <h3 className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500/80">Extraction Summary</h3>
//           <div className="flex overflow-hidden rounded-[10px] border border-white/10">
//             <div className="flex-1 border-r border-white/10 p-3 text-center">
//               <div className="mb-0.5 font-mono text-lg font-bold text-emerald-400">{doc.extracted}/{doc.fields}</div>
//               <div className="text-[9px] tracking-wide text-slate-500">Fields</div>
//             </div>
//             <div className="flex-1 border-r border-white/10 p-3 text-center">
//               <div className="mb-0.5 font-mono text-lg font-bold text-blue-400">{doc.pages}</div>
//               <div className="text-[9px] tracking-wide text-slate-500">Pages</div>
//             </div>
//             <div className="flex-1 p-3 text-center">
//               <div className="mb-0.5 font-mono text-lg font-bold text-cyan-400">{doc.extracted === 0 ? "0" : Math.round((doc.extracted / doc.fields) * 100)}%</div>
//               <div className="text-[9px] tracking-wide text-slate-500">Accuracy</div>
//             </div>
//           </div>
//         </section>

//         <section className="mb-[18px]">
//           <h3 className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500/80">Extracted Fields · AI Confidence</h3>
//           {fields.slice(0, doc.extracted === 0 ? 2 : fields.length).map((field) => {
//             const color = fieldColor(field.confidence);
//             return (
//               <div key={field.label} className="mb-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-blue-500/20">
//                 <div className="text-[9px] uppercase tracking-wide text-slate-500">{field.label}</div>
//                 <div className={`mt-0.5 font-mono text-[11px] font-semibold ${field.confidence === 0 ? "text-red-400" : "text-slate-100"}`}>{field.value}</div>
//                 {field.confidence > 0 && (
//                   <div className="mt-1 flex items-center gap-1.5">
//                     <div className="h-0.5 flex-1 overflow-hidden rounded bg-slate-800"><div className={`h-full rounded ${color.split(" ")[0]}`} style={{ width: `${field.confidence}%` }} /></div>
//                     <span className={`w-7 text-right font-mono text-[9px] ${color.split(" ")[1]}`}>{field.confidence}%</span>
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </section>

//         <section className="mb-[18px]">
//           <h3 className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500/80">Document Timeline</h3>
//           {timeline.map((item, index) => (
//             <div key={item.label} className="mb-2 flex items-start gap-2.5">
//               <div className={`relative mt-1 h-2 w-2 shrink-0 rounded-full ${item.color} ${index !== timeline.length - 1 ? "after:absolute after:left-[3px] after:top-2 after:h-5 after:w-px after:bg-white/10" : ""}`} />
//               <div>
//                 <div className="text-[11px] font-semibold text-slate-300">{item.label}</div>
//                 <div className="mt-0.5 font-mono text-[9px] text-slate-500">{doc.date} · {item.time}</div>
//               </div>
//             </div>
//           ))}
//         </section>
//       </div>

//       <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 py-3.5">
//         <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(59,130,246,0.3)]"><Icon name="open" size={12} />Open Document</button>
//         <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-transparent p-2.5 text-xs font-semibold text-slate-500 transition hover:border-blue-500/30 hover:text-slate-200"><Icon name="dl" size={12} />Download</button>
//       </div>
//     </>
//   );
// }

// function StatCard({ label, value, footer, variant }: { label: string; value: number; footer: string; variant: "blue" | "green" | "red" | "amber" }) {
//   const variantClasses = {
//     blue: "before:from-blue-500 before:to-cyan-500 text-blue-400",
//     green: "before:from-emerald-500 before:to-cyan-500 text-emerald-400",
//     red: "before:from-red-500 before:to-orange-500 text-red-400",
//     amber: "before:from-amber-500 before:to-orange-500 text-amber-400",
//   }[variant];

//   return (
//     <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-[18px] py-4 transition before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:bg-gradient-to-r hover:-translate-y-0.5 hover:border-blue-500/25 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${variantClasses}`}>
//       <div className="mb-2 flex justify-between text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
//       <div className="mb-1.5 font-mono text-[30px] font-bold leading-none tracking-[-0.04em]">{value}</div>
//       <div className={`text-[10px] ${variant === "red" ? "cursor-pointer text-blue-400 hover:underline" : "text-slate-500"}`}>{footer}</div>
//     </div>
//   );
// }

// export default function SemloxDocumentManagerPage() {
//   const [theme, setTheme] = useState<Theme>("dark");
//   const [search, setSearch] = useState("");
//   const [dateQuick, setDateQuick] = useState("all");
//   const [fromDate, setFromDate] = useState<Date | null>(null);
//   const [toDate, setToDate] = useState<Date | null>(null);
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [actionFilter, setActionFilter] = useState("all");
//   const [selected, setSelected] = useState<DocRow | null>(null);
//   const [page, setPage] = useState(1);
//   const [checked, setChecked] = useState<number[]>([]);
//   const [sortCol, setSortCol] = useState("date");
//   const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
//   const perPage = 10;

//   useEffect(() => {
//     document.documentElement.classList.toggle("dark", theme === "dark");
//   }, [theme]);

//   const filtered = useMemo(() => {
//     return docs.filter((doc) => {
//       if (search) {
//         const query = search.toLowerCase();
//         const matched = doc.awb.toLowerCase().includes(query) || doc.action.toLowerCase().includes(query) || doc.user.toLowerCase().includes(query) || doc.date.includes(query);
//         if (!matched) return false;
//       }
//       if (statusFilter !== "all" && doc.status !== statusFilter) return false;
//       if (actionFilter !== "all" && doc.action !== actionFilter) return false;
//       return true;
//     });
//   }, [search, statusFilter, actionFilter]);

//   const sorted = useMemo(() => {
//     return [...filtered].sort((a, b) => {
//       const av = String(a[sortCol as keyof DocRow] ?? "");
//       const bv = String(b[sortCol as keyof DocRow] ?? "");
//       return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
//     });
//   }, [filtered, sortCol, sortDir]);

//   const paginated = sorted.slice((page - 1) * perPage, page * perPage);
//   const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

//   const stats = {
//     total: docs.length,
//     success: docs.filter((doc) => ["ok", "issued", "pdf"].includes(doc.status)).length,
//     failed: docs.filter((doc) => doc.status === "fail").length,
//     draft: docs.filter((doc) => doc.status === "draft").length,
//   };

//   const toggleCheck = (id: number) => setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
//   const toggleAll = () => setChecked(checked.length === paginated.length ? [] : paginated.map((doc) => doc.id));
//   const handleSort = (column: string) => {
//     if (sortCol === column) setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
//     else {
//       setSortCol(column);
//       setSortDir("asc");
//     }
//   };

//   return (
//     <main className={`h-screen overflow-hidden font-[Inter] ${theme === "dark" ? "bg-[#04060f] text-slate-100" : "bg-slate-100 text-slate-900"}`}>
//       <style jsx global>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
//         * { box-sizing: border-box; }
//         body { margin: 0; overflow: hidden; }
//         @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
//       `}</style>

//       {theme === "dark" && (
//         <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[length:52px_52px]" />
//       )}

//       <div className="relative z-10 flex h-screen overflow-hidden">
//         {/* <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#080c1a]">
//           <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-white/10 px-[18px]">
//             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
//               <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M3 6h9L9 11h8" /></svg>
//             </div>
//             <div>
//               <div className="text-[15px] font-bold tracking-[-0.02em] text-slate-100">Semlo<span className="bg-gradient-to-br from-blue-500 to-cyan-500 bg-clip-text text-transparent">X</span></div>
//               <div className="mt-px font-mono text-[9px] uppercase tracking-[0.08em] text-slate-500">AI Document Engine</div>
//             </div>
//           </div>

//           <div className="flex-1 overflow-y-auto py-2.5">
//             <div className="px-[18px] pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500/60">Menu</div>
//             {[
//               { href: "#", icon: "home" as const, label: "Overview" },
//               { href: "#", icon: "doc" as const, label: "AWB Processing", badge: "3" },
//               { href: "#", icon: "history" as const, label: "Document Manager", active: true },
//               { href: "#", icon: "gear" as const, label: "Settings" },
//             ].map((item) => (
//               <a key={item.label} href={item.href} className={`relative mx-2 my-px flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-medium no-underline transition ${item.active ? "border-blue-500/20 bg-blue-500/10 text-slate-100 before:absolute before:-left-1 before:bottom-1/4 before:top-1/4 before:w-0.5 before:rounded before:bg-gradient-to-b before:from-blue-500 before:to-cyan-500" : "border-transparent text-slate-500 hover:bg-white/[0.055] hover:text-slate-300"}`}>
//                 <Icon name={item.icon} className={`shrink-0 ${item.active ? "text-blue-400" : "opacity-60"}`} />
//                 <span className="flex-1">{item.label}</span>
//                 {item.badge && <span className="rounded-lg bg-blue-500/15 px-1.5 py-0.5 font-mono text-[9px] text-blue-400">{item.badge}</span>}
//               </a>
//             ))}

//             <div className="mx-2.5 my-1.5 h-px bg-white/10" />
//             <div className="mx-2 my-1.5 rounded-[10px] border border-blue-500/15 bg-blue-500/[0.06] p-3">
//               <div className="mb-0.5 text-[11px] font-semibold text-slate-100">Enterprise Plan</div>
//               <div className="mb-2 text-[10px] text-slate-500">10,000 AWBs / month</div>
//               <div className="mb-1 h-1 overflow-hidden rounded bg-slate-800"><div className="h-full w-[48%] rounded bg-gradient-to-r from-blue-500 to-cyan-500" /></div>
//               <div className="flex justify-between font-mono text-[9px] text-slate-500"><span className="text-blue-400">4,823 used</span><span>5,177 left</span></div>
//             </div>
//           </div>

//           <div className="shrink-0 border-t border-white/10 p-3.5 px-[18px]">
//             <div className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1 transition hover:bg-white/[0.055]">
//               <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[11px] font-bold text-white">AK</div>
//               <div>
//                 <div className="text-xs font-semibold text-slate-300">Anna Keller</div>
//                 <div className="text-[10px] text-slate-500">DB Schenker · Admin</div>
//               </div>
//               <Icon name="more" className="ml-auto text-slate-500" />
//             </div>
//           </div>
//         </aside> */}

//         <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
//           {/* <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-white/10 bg-[#080c1a]/85 px-6 backdrop-blur-xl">
//             <div>
//               <div className="flex items-center gap-1.5 text-xs text-slate-500">
//                 <a href="#" className="text-slate-500 no-underline transition hover:text-blue-400">Overview</a>
//                 <Icon name="chevR" size={10} className="text-slate-700" />
//                 <span className="text-sm font-bold tracking-[-0.02em] text-slate-100">Document Manager</span>
//               </div>
//               <div className="mt-0.5 text-[11px] text-slate-500">DB Schenker Logistics · 27 Apr 2026</div>
//             </div>

//             <div className="ml-auto flex items-center gap-2">
//               <div className="flex overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
//                 <button className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${theme === "light" ? "bg-blue-500 text-white" : "text-slate-500"}`} onClick={() => setTheme("light")}><Icon name="sun" size={12} />Light</button>
//                 <button className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${theme === "dark" ? "bg-blue-500 text-white" : "text-slate-500"}`} onClick={() => setTheme("dark")}><Icon name="moon" size={12} />Dark</button>
//               </div>
//               <button className="flex items-center gap-2 whitespace-nowrap rounded-[9px] bg-gradient-to-br from-blue-500 to-cyan-500 px-[18px] py-2 text-[13px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(59,130,246,0.4)]"><Icon name="upload" size={13} />Upload AWB</button>
//               <button className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500 transition hover:border-blue-500/30 hover:text-slate-300"><Icon name="bell" size={14} /><span className="absolute right-[7px] top-1.5 h-1.5 w-1.5 rounded-full border border-[#080c1a] bg-red-500" /></button>
//               <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[11px] font-bold text-white">AK</div>
//             </div>
//           </header> */}

//           <div className="flex min-h-0 flex-1 overflow-hidden">
//             <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
//               <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 px-6">
//                 <div className="flex animate-[fadeUp_0.3s_ease_both] flex-wrap items-start justify-between gap-3">
//                   <div>
//                     <h1 className="mb-1 text-[22px] font-bold tracking-[-0.03em] text-slate-100">Activity History</h1>
//                     <p className="text-xs text-slate-500">Track generated, updated, and finalized AWBs · All document actions</p>
//                   </div>
//                   <div className="flex flex-wrap items-center gap-2">
//                     <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-[7px] font-mono text-xs font-bold text-slate-300">Total: {filtered.length}</div>
//                     <button className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-[7px] text-xs text-slate-500 transition hover:border-blue-500/30 hover:bg-white/[0.055] hover:text-slate-300"><Icon name="refresh" size={12} />Refresh</button>
//                     {checked.length > 0 && <button className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-[7px] text-xs text-blue-400"><Icon name="check" size={12} />{checked.length} selected</button>}
//                     <button onClick={() => setChecked([])} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-[7px] text-xs text-slate-500 transition hover:border-red-500/30 hover:text-red-400"><Icon name="x" size={12} />Clear</button>
//                     <button className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-[7px] text-xs text-slate-500 transition hover:border-blue-500/30 hover:text-slate-300"><Icon name="dl" size={12} />Export CSV</button>
//                   </div>
//                 </div>

//                 <div className="grid animate-[fadeUp_0.3s_ease_0.05s_both] grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
//                   <StatCard label="Total Documents" value={stats.total} footer="All time · all actions" variant="blue" />
//                   <StatCard label="Successful" value={stats.success} footer="Issued + PDF + Extracted" variant="green" />
//                   <StatCard label="Failed" value={stats.failed} footer="↗ View & re-process" variant="red" />
//                   <StatCard label="Draft Saves" value={stats.draft} footer="Pending completion" variant="amber" />
//                 </div>

//                 <div className="flex animate-[fadeUp_0.3s_ease_0.08s_both] flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
//                   <div className="flex min-w-[220px] max-w-[280px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-[7px] transition focus-within:border-blue-500/40">
//                     <Icon name="search" size={13} className="text-slate-500" />
//                     <input className="w-full border-none bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500" placeholder="Search by AWB #, action, user…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
//                   </div>
//                   <div className="h-[26px] w-px bg-white/10" />
//                   <DateRangePicker from={fromDate} to={toDate} onChange={(from, to) => { setFromDate(from); setToDate(to); }} />
//                   <div className="h-[26px] w-px bg-white/10" />
//                   <div className="flex flex-wrap gap-2">
//                     {[["all", "All time"], ["today", "Today"], ["7d", "Last 7 days"], ["30d", "Last 30 days"]].map(([key, label]) => (
//                       <button key={key} className={`rounded-md border px-3 py-1.5 text-xs transition ${dateQuick === key ? "border-blue-500/35 bg-blue-500/10 font-semibold text-blue-400" : "border-white/10 text-slate-500 hover:border-blue-500/30 hover:text-slate-300"}`} onClick={() => setDateQuick(key)}>{label}</button>
//                     ))}
//                   </div>
//                   <div className="h-[26px] w-px bg-white/10" />
//                   <select className="rounded-lg border border-white/10 bg-[#0d1323] px-2.5 py-[7px] text-xs text-slate-300 outline-none transition hover:border-blue-500/30" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
//                     <option value="all">All Status</option><option value="ok">Success</option><option value="pdf">PDF Generated</option><option value="issued">AWB Issued</option><option value="partial">Partial</option><option value="draft">Draft</option><option value="fail">Failed</option>
//                   </select>
//                   <select className="rounded-lg border border-white/10 bg-[#0d1323] px-2.5 py-[7px] text-xs text-slate-300 outline-none transition hover:border-blue-500/30" value={actionFilter} onChange={(event) => { setActionFilter(event.target.value); setPage(1); }}>
//                     <option value="all">All Actions</option><option value="Initial Extraction">Initial Extraction</option><option value="Generated PDF">Generated PDF</option><option value="Issued AWB">Issued AWB</option><option value="Draft Saved">Draft Saved</option>
//                   </select>
//                 </div>

//                 <div className="animate-[fadeUp_0.3s_ease_0.11s_both] overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.03]">
//                   <div className="flex flex-wrap items-center gap-2.5 border-b border-white/10 px-[18px] py-3.5">
//                     <span className="text-[13px] font-semibold text-slate-100">Documents</span>
//                     <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] text-blue-400">{filtered.length} records</span>
//                     {checked.length > 0 && <span className="ml-1 font-mono text-[11px] text-blue-400">{checked.length} selected</span>}
//                     <div className="ml-auto flex gap-1.5">
//                       {checked.length > 0 ? (
//                         <>
//                           <button className="rounded-md border border-blue-500/30 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-blue-400">Re-process</button>
//                           <button className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-400">Download</button>
//                           <button onClick={() => setChecked([])} className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:border-red-500/30 hover:text-red-400">Deselect</button>
//                         </>
//                       ) : (
//                         <>
//                           <button className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-blue-500/30 hover:text-blue-400"><Icon name="col" size={11} />Columns</button>
//                           <button className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-blue-500/30 hover:text-blue-400"><Icon name="dl" size={11} />Export</button>
//                         </>
//                       )}
//                     </div>
//                   </div>

//                   <div className="overflow-x-auto">
//                     <table className="w-full min-w-[900px] border-collapse">
//                       <thead>
//                         <tr>
//                           <th className="w-9 border-b border-white/10 bg-white/[0.02] py-2.5 pl-4 pr-2 text-left"><CheckboxBox checked={checked.length === paginated.length && paginated.length > 0} onClick={toggleAll} /></th>
//                           {[["date", "Date"], ["awb", "AWB Number"], ["action", "Action"], ["type", "Type"], ["fields", "Fields"], ["user", "Processed By"], ["status", "Status"]].map(([key, label]) => (
//                             <th key={key} onClick={() => handleSort(key)} className="cursor-pointer select-none whitespace-nowrap border-b border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition hover:text-slate-300">
//                               {label} <span className="ml-1 text-[9px] opacity-40">{sortCol === key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
//                             </th>
//                           ))}
//                           <th className="whitespace-nowrap border-b border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">View</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {paginated.map((row) => {
//                           const isSelected = selected?.id === row.id;
//                           const isChecked = checked.includes(row.id);
//                           const fieldColor = row.extracted === row.fields ? "bg-emerald-400 text-emerald-400" : row.extracted === 0 ? "bg-red-400 text-red-400" : "bg-amber-400 text-amber-400";
//                           return (
//                             <tr key={row.id} onClick={() => setSelected(isSelected ? null : row)} className={`cursor-pointer transition ${isSelected ? "bg-blue-500/[0.07]" : "hover:bg-white/[0.025]"}`}>
//                               <td className="border-b border-white/[0.03] py-3 pl-4 pr-2" onClick={(event) => { event.stopPropagation(); toggleCheck(row.id); }}><CheckboxBox checked={isChecked} onClick={() => toggleCheck(row.id)} /></td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3 text-xs text-slate-300"><div className="whitespace-nowrap font-mono text-[10px] font-semibold text-slate-100">{row.date}</div><div className="mt-px font-mono text-[9px] text-slate-500">{row.time}</div></td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3"><span className="font-mono text-[11px] font-bold text-slate-100">{row.awb}</span></td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3"><span className={`text-xs font-medium ${actionColor[row.action] ?? "text-slate-300"}`}>{row.action}</span></td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3"><span className="inline-flex items-center rounded border border-blue-500/15 bg-blue-500/10 px-2 py-1 font-mono text-[10px] font-bold text-blue-400">{row.type}</span></td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3">
//                                 <div className="flex items-center gap-2">
//                                   <span className={`font-mono text-[11px] font-bold ${fieldColor.split(" ")[1]}`}>{row.extracted}/{row.fields}</span>
//                                   <div className="h-[3px] w-[52px] overflow-hidden rounded bg-slate-800"><div className={`h-full rounded ${fieldColor.split(" ")[0]}`} style={{ width: `${(row.extracted / row.fields) * 100}%` }} /></div>
//                                 </div>
//                               </td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3">
//                                 <div className="flex items-center gap-2">
//                                   <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-[8px] font-bold text-white">{row.user.split(" ").map((name) => name[0]).join("")}</div>
//                                   <span className="text-xs text-slate-300">{row.user}</span>
//                                 </div>
//                               </td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3"><Badge status={row.status} /></td>
//                               <td className="border-b border-white/[0.03] px-3.5 py-3" onClick={(event) => event.stopPropagation()}>
//                                 <button onClick={() => setSelected(isSelected ? null : row)} className="flex items-center gap-1 rounded-md border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-400 transition hover:border-blue-500/40 hover:bg-blue-500/20"><Icon name="open" size={11} />Open</button>
//                               </td>
//                             </tr>
//                           );
//                         })}
//                       </tbody>
//                     </table>
//                   </div>

//                   <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-[18px] py-3">
//                     <div className="font-mono text-[11px] text-slate-500">Showing {filtered.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</div>
//                     <div className="flex gap-1">
//                       <button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-xs text-slate-500 transition hover:border-blue-500/30 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30">‹</button>
//                       {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((item) => <button key={item} onClick={() => setPage(item)} className={`flex h-[30px] w-[30px] items-center justify-center rounded-md border text-xs transition ${page === item ? "border-blue-500/35 bg-blue-500/10 font-bold text-blue-400" : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-blue-500/30 hover:text-slate-300"}`}>{item}</button>)}
//                       <button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)} className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-xs text-slate-500 transition hover:border-blue-500/30 hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30">›</button>
//                     </div>
//                     <div className="flex items-center gap-2 text-[11px] text-slate-500">Rows per page:<select className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300 outline-none"><option>10</option><option>25</option><option>50</option></select></div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <aside className={`flex shrink-0 flex-col overflow-hidden border-l border-white/10 bg-[#0d1323] transition-[width] duration-300 ${selected ? "w-[380px]" : "w-0"}`}>
//               <DetailPanel doc={selected} onClose={() => setSelected(null)} />
//             </aside>
//           </div>
//         </section>
//       </div>
//     </main>
//   );
// }
