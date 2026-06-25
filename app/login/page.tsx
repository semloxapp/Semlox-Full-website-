

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "../context/CompanyContext";

// Company options are loaded from the server via `/api/public/companies`.
// No static/dummy company data is used.

const inputClass =
  "w-full h-[32px] rounded-[7px] border border-white/10 bg-white/[0.04] px-3 text-[12px] text-[#f1f5f9] outline-none placeholder:text-[#334155] focus:border-cyan-400/40";


function IcBuilding() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <rect x="2" y="2" width="14" height="14" rx="1" />
      <path d="M6 18V9h6v9" />
      <path d="M6 6h.01M12 6h.01M6 12h.01M12 12h.01" />
    </svg>
  );
}

function IcUser() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="9" cy="6" r="3" />
      <path d="M2 16c0-3.31 3.13-6 7-6s7 2.69 7 6" />
    </svg>
  );
}

function IcMail() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="2" y="4" width="14" height="10" rx="1.5" />
      <path d="M2 5l7 5 7-5" />
    </svg>
  );
}

function IcLock() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="4" y="8" width="10" height="8" rx="1.5" />
      <path d="M6 8V6a3 3 0 016 0v2" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function IcEye({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      {off ? (
        <>
          <path d="M2 2l14 14M7.5 7.5A3 3 0 0012 12M4 4.5C2.7 5.8 2 7.5 2 9s3.13 5 7 5c1.4 0 2.7-.3 3.8-.8" />
          <path d="M14.5 14.5C15.8 13.2 16 11 16 9c0-1.5-3.13-5-7-5-.9 0-1.7.1-2.5.4" />
        </>
      ) : (
        <>
          <path d="M2 9c0 0 3-5 7-5s7 5 7 5-3 5-7 5-7-5-7-5z" />
          <circle cx="9" cy="9" r="2.5" />
        </>
      )}
    </svg>
  );
}

function IcShield() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" className="h-2.5 w-2.5 text-[#00d4aa]">
      <path d="M7 1L2 3v4c0 3 2.5 5 5 6 2.5-1 5-3 5-6V3L7 1z" />
    </svg>
  );
}

function IcCheck() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11">
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

function BrandMark({
  small = false,
  className = "",
}: {
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={`${small ? "h-7 w-7 rounded-[7px]" : "h-[38px] w-[38px] rounded-[9px]"} ${className} flex items-center justify-center bg-gradient-to-br from-[#3b82f6] to-[#06b6d4]`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={small ? "h-3.5 w-3.5" : "h-5 w-5"}>
        <path d="M3 6h9L9 11h8" />
      </svg>
    </div>
  );
}

function NetworkViz() {
  const nodes = [
    { x: 200, y: 80, label: "FRA", c: "#3b82f6", size: 14, city: "Frankfurt" },
    { x: 340, y: 140, label: "DXB", c: "#06b6d4", size: 13, city: "Dubai" },
    { x: 100, y: 200, label: "AMS", c: "#3b82f6", size: 12, city: "Amsterdam" },
    { x: 300, y: 240, label: "SIN", c: "#00d4aa", size: 15, city: "Singapore" },
    { x: 180, y: 290, label: "LHR", c: "#06b6d4", size: 12, city: "London" },
    { x: 400, y: 200, label: "HKG", c: "#3b82f6", size: 13, city: "Hong Kong" },
    { x: 240, y: 180, label: "AI", c: "#fff", size: 22, center: true, city: "" },
    { x: 80, y: 310, label: "JFK", c: "#06b6d4", size: 12, city: "New York" },
    { x: 370, y: 310, label: "LAX", c: "#3b82f6", size: 12, city: "Los Angeles" },
  ];

  const edges = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 7], [6, 8],
    [0, 1], [1, 5], [5, 3], [3, 8], [4, 7], [2, 4], [0, 2],
  ];

  return (
    <svg viewBox="40 40 360 310" className="h-full w-full max-w-[560px] opacity-95">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glowStrong"><feGaussianBlur stdDeviation="6" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="coreGrad" cx="40%" cy="35%"><stop offset="0%" stopColor="#60a5fa" /><stop offset="100%" stopColor="#1d4ed8" /></radialGradient>
        <marker id="arr" markerWidth="5" markerHeight="5" refX="3" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="rgba(6,182,212,0.5)" /></marker>
      </defs>

      {edges.map(([a, b], i) => {
        const na = nodes[a];
        const nb = nodes[b];
        return (
          <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={na.center || nb.center ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"} strokeWidth={na.center || nb.center ? 1.5 : 1} strokeDasharray={na.center || nb.center ? "5 4" : "none"} markerEnd={na.center ? "url(#arr)" : undefined} />
        );
      })}

      {[[6, 3], [6, 1], [6, 0], [6, 5], [6, 7]].map(([a, b], i) => {
        const na = nodes[a];
        const nb = nodes[b];
        return (
          <g key={i}>
            <path id={`p${i}`} d={`M${na.x},${na.y} L${nb.x},${nb.y}`} fill="none" />
            <circle r="4" fill={nodes[b].c} filter="url(#glow)" opacity="0.9">
              <animateMotion dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5}s`}>
                <mpath href={`#p${i}`} />
              </animateMotion>
            </circle>
            <circle r="3" fill="white" opacity="0.35">
              <animateMotion dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5 + 1.1}s`} keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                <mpath href={`#p${i}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}

      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.size + 8} fill="none" stroke={n.center ? "#3b82f6" : n.c} strokeWidth="1" opacity="0.15">
            <animate attributeName="r" values={`${n.size + 4};${n.size + 16};${n.size + 4}`} dur={`${3 + i * 0.25}s`} repeatCount="indefinite" begin={`${i * 0.2}s`} />
            <animate attributeName="opacity" values="0.2;0.04;0.2" dur={`${3 + i * 0.25}s`} repeatCount="indefinite" begin={`${i * 0.2}s`} />
          </circle>
          <circle cx={n.x} cy={n.y} r={n.size} fill={n.center ? "url(#coreGrad)" : n.c} opacity={n.center ? 1 : 0.85} filter={n.center ? "url(#glowStrong)" : "url(#glow)"} />
          <circle cx={n.x} cy={n.y} r={n.size} fill="none" stroke={n.center ? "rgba(96,165,250,0.6)" : n.c} strokeWidth="1.5" opacity="0.7" />
          <text x={n.x} y={n.y + (n.center ? 5 : 4)} textAnchor="middle" fontSize={n.center ? 10 : 9} fill="white" fontFamily="Space Mono" fontWeight="700" style={{ letterSpacing: "0.04em" }}>{n.label}</text>
          {!n.center && <text x={n.x} y={n.y + n.size + 13} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="Space Mono">{n.city}</text>}
        </g>
      ))}

      <FloatingLabel x="270" y="58" w="96" color="#06b6d4" text="AWB PARSED ✓" duration="3s" />
      <FloatingLabel x="48" y="152" w="86" color="#00d4aa" text="98.7% ACC." duration="3.5s" delay="1s" />
      <FloatingLabel x="310" y="195" w="92" color="#3b82f6" text="ROUTE OPT." duration="4s" delay="0.5s" />
      <FloatingLabel x="100" y="320" w="100" color="#f97316" text="2.1M DOCS/DAY" duration="3.2s" delay="1.8s" />
    </svg>
  );
}

function FloatingLabel({ x, y, w, color, text, duration, delay = "0s" }: { x: string; y: string; w: string; color: string; text: string; duration: string; delay?: string }) {
  return (
    <g style={{ animation: `floatUp ${duration} ease-in-out infinite`, animationDelay: delay }}>
      <rect x={x} y={y} width={w} height="22" rx="5" fill={`${color}1a`} stroke={`${color}59`} strokeWidth="1" />
      <text x={Number(x) + Number(w) / 2} y={Number(y) + 15} textAnchor="middle" fontSize="9" fill={color} fontFamily="Space Mono" fontWeight="700">{text}</text>
    </g>
  );
}

function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"company" | "user" | "signup">("company");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    company: "",
    fullName: "",
    phone: "",
  });

  const set = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const { setSelectedCompanyId, selectedCompanyId } = useCompany();

  async function signUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (process.env.NODE_ENV !== "production") console.log("[signup-ui] submitting signup", { email: form.email });
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        companyName: form.company,
        phone: form.phone,
      }),
    });

    const data = await response.json();
    setLoading(false);
    if (!response.ok || data?.ok === false) {
      setMessage(data?.message || data?.msg || data?.error_description || "Sign up failed");
      return;
    }
    // persist created company id to CompanyContext
    try {
      if (data.companyId) {
        setSelectedCompanyId(data.companyId, true);
      }
    } catch (e) {}

    setMode("company");
    setMessage("Sign up complete. Login required.");
  }

  const [companyOptions, setCompanyOptions] = useState<any[] | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);

  // Load public companies for the company select (API-only)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      try {
        const resp = await fetch('/api/public/companies');
        const j = await resp.json().catch(() => ({}));
        if (!mounted) return;
        if (resp.ok && j?.ok !== false && Array.isArray(j?.data)) {
          setCompanyOptions(j.data);
        } else if (resp.ok && Array.isArray(j?.data) && j?.data.length === 0) {
          setCompanyOptions([]);
        } else {
          setCompaniesError('Unable to load companies');
          setCompanyOptions([]);
        }
      } catch (e) {
        if (!mounted) return;
        setCompaniesError('Unable to load companies');
        setCompanyOptions([]);
      } finally {
        if (mounted) setCompaniesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const validateRequestIdRef = React.useRef(0);
  const [validatingCompanyId, setValidatingCompanyId] = useState<string | null>(null);

  const handleSelectResolvedCompany = async (companyId: string) => {
    if (!companyId) return;

    // create a request id to ignore stale responses
    const reqId = ++validateRequestIdRef.current;
    setValidatingCompanyId(companyId);

    try {
      const resp = await fetch("/api/auth/validate-company", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyId }),
      });

      const payload = await resp.json().catch(() => ({}));

      // if a newer request started, ignore this response
      if (reqId !== validateRequestIdRef.current) return;

      if (!resp.ok) {
        setMessage(payload.message || "Not authorized for selected company");
        setValidatingCompanyId(null);
        return;
      }

      // success: set company id and complete login
      try {
        setSelectedCompanyId(companyId, true);
      } catch (e) {}
      router.replace("/dashboard");
    } catch (err) {
      if (reqId !== validateRequestIdRef.current) return;
      setMessage("Company validation failed");
      setValidatingCompanyId(null);
    }
  };

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    // Server-side login: call our server route which sets HttpOnly session cookie
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok || data?.ok === false) {
      if (mode === "user" && data?.code === "INVALID_CREDENTIALS") {
        setMessage("Invalid email or password. If you were invited, please open your invitation email and set your password first.");
        return;
      }
      setMessage(data?.message || "Login required");
      return;
    }

    if (process.env.NODE_ENV !== "production") console.log("[auth-ui] login POST succeeded, proceeding to resolve/company flow");

    // Branch by mode: company vs user
    if (mode === "company") {
      // Company sign-in: resolve company from token server-side
      try {
        // Some browsers may not attach the just-set cookie immediately to subsequent
        // fetches. Retry a few times to allow the cookie to be stored and sent.
        const callResolve = async (attempts = 3, delay = 250) => {
          for (let i = 0; i < attempts; i++) {
            const resp = await fetch("/api/auth/resolve-company-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            }).catch(() => null);
            if (!resp) {
              if (i < attempts - 1) await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            if (resp.ok) return resp;
            // If 401, maybe cookie not set yet; retry
            if (resp.status === 401 && i < attempts - 1) {
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            return resp;
          }
          return null;
        };

        const resolveResp = await callResolve();
        if (process.env.NODE_ENV !== "production") console.log("[auth-ui] resolve-company-login response", resolveResp?.status);
        const r = resolveResp ? await resolveResp.json().catch(() => ({})) : { message: "Company resolution failed" };

        if (!resolveResp || !resolveResp.ok) {
          setMessage(r.message || "No company account found for this email");
          return;
        }

        if (r.ok && r.companyId) {
          if (process.env.NODE_ENV !== "production") console.log("[auth-ui] resolved companyId", r.companyId);
          // single resolved company
          try {
            // attempt to auto-accept pending invite if present
            const accepted = await attemptAcceptInvite(null);
            if (process.env.NODE_ENV !== "production") console.log("[auth-ui] attemptAcceptInvite result", accepted);
            if (accepted === false) {
              // no pending invites; proceed normally
              setSelectedCompanyId(r.companyId, true);
              router.replace("/dashboard");
              return;
            }
            if (accepted === true) {
              // accept succeeded and CompanyContext set inside attemptAcceptInvite
              router.replace("/dashboard");
              return;
            }
            // if accepted is a string message or error, show it
            if (typeof accepted === "string") {
              setMessage(accepted);
              return;
            }
          } catch (e) {
            setMessage("Company resolution failed");
            return;
          }
        }

        if (r.ok && r.requiresCompanySelection && Array.isArray(r.companies)) {
          // Show selection UI
          setResolvedToken(null);
          setCompanyOptions(r.companies);
          // do not set token yet until user selects company
          return;
        }

        setMessage(r.message || "No company account found for this email");
      } catch (err) {
        setMessage("Company resolution failed");
      }
    } else {
      // User mode: require selectedCompanyId and validate membership server-side
      const userCompanyId = selectedCompanyId || form.company;
      if (!userCompanyId) {
        setMessage("Select your company before signing in.");
        return;
      }

      const validateResp = await fetch("/api/auth/validate-company", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: userCompanyId }),
      });

      if (!validateResp.ok) {
        const v = await validateResp.json().catch(() => ({}));
        setMessage(v.message || "Not authorized for selected company");
        return;
      }

      // attempt invite acceptance (server will use cookie session)
      const accepted = await attemptAcceptInvite(null);
      if (accepted === true) {
        setSelectedCompanyId(userCompanyId, true);
        router.replace("/dashboard");
        return;
      }
      if (accepted === false) {
        // no auto-accept needed, proceed
        setSelectedCompanyId(userCompanyId, true);
        router.replace("/dashboard");
        return;
      }
      // accepted contains error message
      setMessage(typeof accepted === "string" ? accepted : "Invite acceptance failed. Please contact your company admin.");
      return;
    }
  }

  // attemptAcceptInvite: returns true if accept performed successfully,
  // false if no pending single invite exists, or string error message on failure.
  async function attemptAcceptInvite(token: string | null): Promise<boolean | string> {
    try {
      // fetch memberships; use credentials so the browser sends the HttpOnly cookie set by login
      const mOptions: RequestInit = { credentials: "include" };
      if (token) mOptions.headers = { Authorization: `Bearer ${token}` } as Record<string, string>;
      if (process.env.NODE_ENV !== "production") console.log("[auth-ui] fetching memberships with credentials", { hasToken: Boolean(token) });
      const mResp = await fetch("/api/auth/memberships", mOptions);
      if (!mResp.ok) return false;
      const j = await mResp.json().catch(() => ({}));
      if (j?.ok === false) return false;
      const memberships = j?.memberships || [];
      const pending = memberships.filter((m: any) => !m.accepted_at);
      if (!Array.isArray(pending) || pending.length === 0) return false;
      if (pending.length > 1) return false;

      const companyId = pending[0].company_id;
      // call accept-invite (reuse headers; do not send `Authorization: Bearer null`)
      const acceptOptions: RequestInit = {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      };
      if (token) (acceptOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      if (process.env.NODE_ENV !== "production") console.log("[auth-ui] calling accept-invite", { companyId, hasToken: Boolean(token) });
      const acceptResp = await fetch("/api/auth/accept-invite", acceptOptions);
      const body = await acceptResp.json().catch(() => ({}));
      if (!acceptResp.ok || body?.ok === false) {
        if (process.env.NODE_ENV !== "production") console.log("[auth-ui] accept-invite failed", { status: acceptResp.status, body });
        return body?.message || "Invite acceptance failed. Please contact your company admin.";
      }
      if (process.env.NODE_ENV !== "production") console.log("[auth-ui] accept-invite succeeded", { companyId });

      // success: set selected company
      try {
        setSelectedCompanyId(companyId, true);
      } catch (e) {}
      return true;
    } catch (err) {
      return "Invite acceptance failed. Please contact your company admin.";
    }
  }

  return (
    <section className="flex h-full min-h-0 items-center justify-center px-6">

      <div className="w-full max-w-[320px]">

        {/* LOGO */}
        <div className="mb-5 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-[5px]  " />
              <BrandMark small />

            <span className="text-[12px] font-bold text-white">
              Semlo<span className="text-cyan-400">X</span>
            </span>
          </div>
        </div>

        {/* CARD */}
        <div className="rounded-[14px] border border-white/10 bg-white/[0.035] p-[18px] shadow-[0_20px_60px_rgba(0,0,0,.45)] backdrop-blur-xl">

          {mode === "signup" ? (
          <form className="w-full" onSubmit={signUp}>
            <h2 className="text-[16px] font-bold text-slate-200">Create Company Account</h2>
            <p className="mb-3 text-[12px] text-slate-500">Set up your SemloX organization portal</p>

            <input
              className={`${inputClass} mb-3`}
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />

            <input
              className={`${inputClass} mb-3`}
              placeholder="Company Name"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              required
            />

            <input
              className={`${inputClass} mb-3`}
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />

            <input
              className={`${inputClass} mb-3`}
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />

            <input
              className={`${inputClass} mb-4`}
              placeholder="Phone Number (optional)"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />

            {message && <p className="mb-3 text-center text-[10px] text-cyan-400">{message}</p>}

            <button
              disabled={loading}
              className="flex h-[36px] w-full items-center justify-center rounded-[7px] bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-[12.5px] font-bold text-white disabled:opacity-70"
            >
              {loading ? <span className="spinner" /> : "Create Company Account →"}
            </button>

            <p className="mt-3 text-center text-[10px] text-slate-500">
              Already have an account?{' '}
              <span
                onClick={() => {
                  setMode("company");
                  setMessage("");
                  try {
                    setSelectedCompanyId(null);
                  } catch (e) {}
                }}
                className="cursor-pointer text-cyan-400"
              >
                Login
              </span>
            </p>

            <div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-[9.5px] text-slate-600">
              <span>SOC 2</span>
              <span>AES-256</span>
              <span>GDPR</span>
            </div>
          </form>
          ) : (
          <form className="w-full" onSubmit={signIn}>

            {/* TITLE */}
            <h2 className="text-[16px] font-bold text-slate-200">
              {mode === "company" ? "Company Sign In" : "User Sign In"}
            </h2>

            <p className="mb-3 text-[12px] text-slate-500">
              {mode === "company"
                ? "Access your SemloX organization portal"
                : "Sign in with your company user credentials"}
            </p>

            {/* SWITCH */}
            <div className="mb-3 grid grid-cols-2 gap-[3px] rounded-[8px] border border-white/10 bg-white/[0.04] p-[3px]">
              <button
                type="button"
                onClick={() => {
                  setMode("company");
                  try {
                    setSelectedCompanyId(null);
                  } catch (e) {}
                }}
                className={`h-[28px] rounded-[6px] text-[12px] font-semibold ${
                  mode === "company"
                    ? "bg-cyan-400/20 border border-cyan-400/30 text-white"
                    : "text-slate-500"
                }`}
              >
                Company
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("user");
                  try {
                    setSelectedCompanyId(null);
                  } catch (e) {}
                }}
                className={`h-[28px] rounded-[6px] text-[12px] font-semibold ${
                  mode === "user"
                    ? "bg-cyan-400/20 border border-cyan-400/30 text-white"
                    : "text-slate-500"
                }`}
              >
                User
              </button>
            </div>

            {/* USER MODE */}
            {mode === "user" && (
              <>
                <label className="mb-1 block">
                  <span className="text-[11px] text-slate-400">Select Company *</span>
                  <div className="relative mt-0.5">
                    <CompanyDropdown
                      value={form.company}
                      onChange={(id: string) => {
                        set("company", id);
                        try {
                          setSelectedCompanyId(id, true);
                        } catch (e) {}
                        if (message) setMessage("");
                      }}
                      options={companyOptions}
                      loading={companiesLoading}
                      error={companiesError}
                    />
                  </div>
                </label>

                <label className="mb-1.5 block">
                  <span className="text-[11px] text-slate-400">
                    Email Address *
                  </span>
                  <input
                    className={`${inputClass} mt-0.5`}
                    placeholder="Enter email address"
                    value={form.email}
                    onChange={(e) => {
                      set("email", e.target.value);
                      if (message) setMessage("");
                    }}
                  />
                </label>
              </>
            )}

            {/* COMPANY MODE */}
            {mode === "company" && (
              <label className="mb-2 block">
                <span className="text-[11.5px] text-slate-400">
                  Company Email *
                </span>
                <input
                  className={`${inputClass} mt-1`}
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => {
                    set("email", e.target.value);
                    if (message) setMessage("");
                  }}
                  required
                />
              </label>
            )}

            {/* PASSWORD */}
            <label className="mb-1.5 block">
              <span className="text-[11px] text-slate-400">
                Password *
              </span>
              <input
                className={`${inputClass} mt-0.5`}
                type="password"
                placeholder="••••••••••"
                value={form.password}
                onChange={(e) => {
                  set("password", e.target.value);
                  if (message) setMessage("");
                }}
                required
              />
            </label>

            {/* FORGOT */}
            <div className="mb-3 text-right">
              <button className="text-[10.5px] text-blue-400">
                Forgot password?
              </button>
            </div>

            {/* BUTTON */}
            <button disabled={loading} className="flex h-[36px] w-full items-center justify-center rounded-[7px] bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-[12.5px] font-bold text-white disabled:opacity-70">
              {loading ? <span className="spinner" /> : mode === "company"
                ? "Sign in to Company Portal →"
                : "Sign in to Workspace →"}
            </button>

            {message && <p className="mt-3 text-center text-[10px] text-red-400">{message}</p>}

            {/* Company selection list intentionally removed from Company sign-in UI */}

            {/* GOOGLE */}
            {mode === "company" && (
              <>
                <div className="my-3 flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10.5px] text-slate-600">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* <button className="h-[28px] w-full rounded-[7px] border border-white/10 text-[10px] text-slate-500">
                  Continue with Google Workspace
                </button> */}
              </>
            )}

            {/* FOOT */}
            {mode === "company" && (
              <p className="mt-3 text-center text-[10.5px] text-slate-500">
                New to SemloX? {" "}
                <span
                  onClick={() => {
                    setMode("signup");
                    try {
                      setSelectedCompanyId(null);
                    } catch (e) {}
                  }}
                  className="text-cyan-400 cursor-pointer"
                >
                  Sign up as company
                </span>
              </p>
            )}

            {/* SECURITY */}
            <div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-[9.5px] text-slate-600">
              <span>SOC 2</span>
              <span>AES-256</span>
              <span>GDPR</span>
            </div>

          </form>
          )}
        </div>

        {/* COPYRIGHT */}
        <p className="mt-4 text-center text-[9px] text-slate-700">
          © 2026 SemloX GmbH
        </p>

      </div>
    </section>
  );
}

function FieldWrap({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 max-[750px]:mb-3">
      <label className="mb-1.5 block text-[11.5px] font-medium tracking-[0.02em] text-[#cbd5e1]">{label} {required && <span className="ml-0.5 text-[#3b82f6]">*</span>}</label>
      {children}
    </div>
  );
}

function IconInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { icon: React.ReactNode }
) {
  const { icon, className = "", ...rest } = props;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-[11px] top-1/2 flex -translate-y-1/2 items-center text-[#334155]">
        {icon}
      </div>

      <input
        {...rest}
        className={`field-input h-[34px] pl-[34px] pr-[10px] py-0 text-[12px] placeholder:text-[11px] placeholder:text-[#475569] ${className}`}
      />
    </div>
  );
}

function CompanyDropdown({ value, onChange, options, loading, error }: { value: string; onChange: (id: string) => void; options: any[] | null; loading: boolean; error: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState<number>(-1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const selected = Array.isArray(options) ? options.find((c) => c.id === value) : null;

  const selectCompany = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  React.useEffect(() => {
    if (!open) setHighlight(-1);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    const opts = options || [];
    if (e.key === "ArrowDown") {
      setHighlight((h) => Math.min(h + 1, opts.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlight((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (highlight >= 0 && opts[highlight]) {
        selectCompany(opts[highlight].id);
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={onKeyDown}
        className={`${inputClass} h-[40px] flex items-center justify-between pr-3 pl-4 text-[13px] ${open ? 'ring-1 ring-cyan-400/30 border-cyan-400/30' : ''}`}
      >
        <span className={`truncate ${selected ? "text-white font-medium" : "text-[#94a3b8]"}`}>
          {loading ? "Loading companies..." : error ? "Unable to load companies" : selected ? selected.name : "Choose company"}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`ml-2 text-[#94a3b8]`}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul role="listbox" tabIndex={-1} className="absolute top-full left-0 right-0 mt-2 z-50 max-h-40 overflow-y-auto rounded-[7px] border border-white/10 bg-[#101824] py-1 text-sm shadow-[0_14px_35px_rgba(0,0,0,0.45)]">
            {loading ? (
              <li className="flex min-h-[36px] items-center px-4 py-2 text-[13px] text-[#94a3b8]">Loading companies...</li>
            ) : error ? (
              <li className="flex min-h-[36px] items-center px-4 py-2 text-[13px] text-red-400">Unable to load companies</li>
            ) : Array.isArray(options) && options.length === 0 ? (
              <li className="flex min-h-[36px] items-center px-4 py-2 text-[13px] text-[#94a3b8]">No companies found</li>
            ) : (
              (options || []).map((c, idx) => {
                const isHighlighted = idx === highlight;
                const isSelected = c.id === value;
                return (
                  <li
                    key={c.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseLeave={() => setHighlight(-1)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCompany(c.id);
                    }}
                    onClick={() => {
                      selectCompany(c.id);
                    }}
                    className={`flex min-h-[36px] cursor-pointer items-center px-4 py-2 text-[13px] font-medium ${isHighlighted ? "bg-[#073955] text-white" : isSelected ? "bg-[#0b567d] text-white" : "text-[#cbd5e1]"}`}
                  >
                    <span className="truncate">{c.name}</span>
                  </li>
                );
              })
            )}
          </ul>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
  );
}

export default function SemloxAuthPage() {
  return ( 
    <>
    <main className="relative h-screen overflow-hidden bg-[#04060f] font-[Inter] text-[#f1f5f9]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        html, body { height: 100%; overflow: hidden; }
        .field-input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          padding-top: 10px;
          padding-bottom: 10px;
          padding-left: 14px;
          padding-right: 14px;
          font-family: Inter, sans-serif;
          font-size: 14px;
          color: #f1f5f9;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .field-input::placeholder { color: #334155; }
        .field-input:focus {
          border-color: rgba(59,130,246,0.5);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
          background: rgba(59,130,246,0.04);
        }
        .field-input option { background: #0d1117; color: #f1f5f9; }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 9999px;
          animation: spin .7s linear infinite;
          vertical-align: middle;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatUp { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[length:52px_52px]" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_50%,rgba(6,182,212,0.07)_0%,transparent_60%),radial-gradient(ellipse_60%_80%_at_20%_50%,rgba(59,130,246,0.07)_0%,transparent_60%)]" />

      <div className="relative z-10 grid h-screen grid-cols-2 max-[900px]:grid-cols-1">
        <section className="relative flex min-h-0 flex-col overflow-hidden border-r border-white/[0.05] px-10 py-8 before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/[0.06] before:via-cyan-500/[0.04] before:to-transparent max-[900px]:hidden">
          {/* <div className="relative z-10 flex shrink-0 items-center gap-3">
            <BrandMark />
            <div>
              <div className="text-lg font-bold tracking-[-0.02em]">Semlo<span className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">X</span></div>
              <div className="mt-px font-mono text-[10px] uppercase tracking-[0.1em] text-[#64748b]">AI Logistics Engine</div>
            </div>
          </div> */}

          <div className="relative z-10 flex shrink-0 items-center gap-2">
              <BrandMark className="w-4 h-4" />
              <div>
                <div className="text-[12.5px] font-bold tracking-[-0.02em]">
                  Semlo
                  <span className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">X</span>
                </div>
                <div className="mt-px font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#64748b]">
                  AI Logistics Engine
                </div>
              </div>
            </div>

          <div className="network-wrap relative z-10 my-4 flex min-h-[330px] flex-1 items-center justify-center overflow-hidden">
            <NetworkViz />
          </div>
 

          {/* <div className="relative z-10 mt-auto shrink-0 ">
            <h1 className="mb-2.5 text-[clamp(18px,2vw,26px)] font-bold leading-[1.2] tracking-[-0.03em] max-[750px]:mb-2.5 max-[750px]:text-lg">
              Enhancing Logistics<br />with <span className="bg-gradient-to-br from-[#3b82f6] via-[#06b6d4] to-[#00d4aa] bg-clip-text text-transparent">Artificial Intelligence.</span>
            </h1>
            <p className="mb-[18px] max-w-[400px] text-[13px] leading-[1.6] text-[#64748b] max-[750px]:mb-4 max-[750px]:text-xs">
              SemloX extracts, validates, and processes Air Waybill data in real time — giving your operations team instant clarity across every shipment in your network.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <TrustChip color="#00d4aa" text="98.7% extraction accuracy" />
              <TrustChip color="#3b82f6" text="Sub-2s processing" />
              <TrustChip color="#06b6d4" text="140+ countries" />
            </div>
          </div> */}
            

            {/* I updated the code there and it iss bottom text last 3 buttons   */}

          <div className="relative z-10 mt-auto shrink-0">
              <h1 className="mb-1.5 text-[clamp(16px,1.8vw,20px)] font-semibold leading-[1.15] tracking-[-0.025em]">
                Enhancing Logistics<br />with{" "}
                <span className="bg-gradient-to-br from-[#3b82f6] via-[#06b6d4] to-[#00d4aa] bg-clip-text text-transparent">
                  Artificial Intelligence.
                </span>
              </h1>

              <p className="mb-3 max-w-[360px] text-[13px] leading-[1.45] text-[#64748b]">
                SemloX extracts, validates, and processes Air Waybill data in real time — giving your operations team instant clarity.
              </p>

              <div className="flex flex-wrap gap-1.5">
                <TrustChip color="#00d4aa" text="98.7% accuracy" />
                <TrustChip color="#3b82f6" text="Sub-2s" />
                <TrustChip color="#06b6d4" text="140+ countries" />
              </div>
            </div>
        </section>

        <section className="flex min-h-0 items-center justify-center overflow-y-auto px-10 py-6 max-[900px]:px-6">
          <div className="w-full max-w-[420px]">
            {/* <div className="mb-7 text-center">
              <div className="mb-1.5 inline-flex items-center gap-2">
                <BrandMark small />
                <span className="text-[15px] font-bold tracking-[-0.02em]">Semlo<span className="bg-gradient-to-br from-[#3b82f6] to-[#06b6d4] bg-clip-text text-transparent">X</span></span>
              </div>
            </div> */}

            {/* <div className="mx-10 w-96 h-full rounded-[20px] border border-white/[0.08] bg-white/[0.03]  shadow-[0_32px_80px_rgba(0,0,0,0.4),0_0_0_1px_rgba(59,130,246,0.08)] backdrop-blur-[20px] before:mb-6 before:-ml-7 before:-mr-7 before:-mt-7 before:block before:h-px before:rounded-t-[20px] before:bg-gradient-to-r before:from-transparent before:via-blue-500/50 before:to-transparent max-[750px]:p-6">
              <AuthForm /> 
            </div> */}

            <div className=""> 
              <AuthForm /> 
            </div> 



            {/* <div className="mt-5 text-center font-mono text-[11px] tracking-[0.05em] text-[#334155]">© 2026 SemloX GmbH · Frankfurt, Germany</div> */}
          </div>
        </section>
      </div>
    </main>

   </>
  );
}

function TrustChip({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-[#64748b]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {text}
    </div>
  );
}
