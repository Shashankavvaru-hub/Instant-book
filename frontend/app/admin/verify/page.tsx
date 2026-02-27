"use client";

import { useState, useEffect, useRef } from "react";
import { verifyTicket } from "@/lib/queries";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { ScanLine, Keyboard, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

type Result = {
  valid: boolean;
  reason?: string;
  booking?: {
    bookingReference: string;
    status: string;
    holderName?: string;
    holderEmail?: string;
    eventTitle?: string;
    eventStart?: string;
    seats?: string[];
    totalAmount?: number;
  };
} | null;

export default function VerifyPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<"scan" | "manual">("manual");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const scannerRef = useRef<any>(null);
  const scannerStarted = useRef(false);
  const scannerRunning = useRef(false);

  if (user && user.role !== "ADMIN") {
    return (
      <div className="text-center py-24">
        <p className="text-red-400 text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-zinc-400 text-sm">Admin role required to verify tickets.</p>
        <Link href="/" className="text-indigo-400 hover:underline text-sm mt-4 block">← Go home</Link>
      </div>
    );
  }

  const verify = async (raw: string) => {
    setLoading(true);
    try {
      const data = await verifyTicket(raw);
      setResult(data);
      if (data.valid) toast.success("Valid ticket — entry approved!");
      else toast.warning("Ticket is not valid");
    } catch (err: any) {
      setResult({ valid: false, reason: err?.response?.data?.message || "Not found" });
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRunning.current && scannerRef.current) {
      scannerRunning.current = false;
      try { await scannerRef.current.stop(); } catch (_) {}
    }
  };

  useEffect(() => {
    if (tab !== "scan" || scannerStarted.current) return;
    scannerStarted.current = true;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded: string) => {
          await stopScanner();
          setTab("manual");
          setRef(decoded);
          verify(decoded);
        },
        () => {}
      ).then(() => {
        scannerRunning.current = true;
      }).catch(() => toast.error("Camera not available. Use manual input."));
    });

    return () => { stopScanner(); };
  }, [tab]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-violet-400" /> Ticket Verifier
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Scan or enter a booking reference to verify entry</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["scan", "manual"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
              tab === t
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 border-transparent text-white"
                : "border-white/10 text-zinc-400 hover:border-indigo-500/40 hover:text-white"
            }`}
          >
            {t === "scan" ? <><ScanLine className="h-4 w-4" /> Scan QR</> : <><Keyboard className="h-4 w-4" /> Manual</>}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
        {tab === "scan" ? (
          <div>
            <div id="qr-reader" className="rounded-xl overflow-hidden" />
            <p className="text-xs text-zinc-500 text-center mt-3">Point camera at QR code</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Booking Reference</label>
              <input
                type="text"
                value={ref}
                onChange={e => setRef(e.target.value)}
                onKeyDown={e => e.key === "Enter" && verify(ref.trim())}
                placeholder="BOOK-xxxx or INSTANT-BOOK:BOOK-xxxx"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
              />
            </div>
            <button
              onClick={() => verify(ref.trim())}
              disabled={loading || !ref.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</> : "Verify Ticket"}
            </button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-6 ${
          result.valid
            ? "bg-emerald-500/10 border-emerald-500/30"
            : result.booking
              ? "bg-amber-500/10 border-amber-500/30"
              : "bg-red-500/10 border-red-500/30"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.valid
              ? <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
              : result.booking
                ? <AlertCircle className="h-8 w-8 text-amber-400 shrink-0" />
                : <XCircle className="h-8 w-8 text-red-400 shrink-0" />}
            <div>
              <p className={`font-bold text-lg ${result.valid ? "text-emerald-400" : result.booking ? "text-amber-400" : "text-red-400"}`}>
                {result.valid ? "✅ Entry Approved" : result.booking ? "⚠️ Ticket Invalid" : "❌ Not Found"}
              </p>
              {result.reason && <p className="text-sm text-zinc-400">{result.reason}</p>}
            </div>
          </div>

          {result.booking && result.valid && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              {[
                ["Holder", result.booking.holderName],
                ["Email", result.booking.holderEmail],
                ["Event", result.booking.eventTitle],
                ["Date", result.booking.eventStart ? formatDate(result.booking.eventStart) : null],
                ["Amount", result.booking.totalAmount ? `₹${result.booking.totalAmount}` : null],
              ].map(([label, value]) => value && (
                <div key={label as string} className="flex justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
                  <span className="text-sm text-white font-medium">{value}</span>
                </div>
              ))}
              {result.booking.seats && result.booking.seats.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Seats</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {result.booking.seats.map(s => (
                      <span key={s} className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-xs font-semibold text-indigo-300">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => { setResult(null); setRef(""); }}
            className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition"
          >
            ↩ Verify Another
          </button>
        </div>
      )}
    </div>
  );
}
