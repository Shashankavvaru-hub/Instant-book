"use client";

import { useState, useEffect, useRef } from "react";
import { verifyTicket, resetTicketCheckIn } from "@/lib/queries";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  ScanLine,
  Keyboard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  RotateCcw,
  Clock,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useRequireAuth } from "@/lib/useRequireAuth";
import Link from "next/link";

type Result = {
  valid: boolean;
  alreadyCheckedIn?: boolean;
  reason?: string;
  message?: string;
  booking?: {
    bookingReference: string;
    status: string;
    checkedIn?: boolean;
    checkedInAt?: string;
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
  const { isLoading: authLoading } = useRequireAuth();
  const [tab, setTab] = useState<"scan" | "manual">("manual");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scannerStarted = useRef(false);
  const scannerRunning = useRef(false);

  const verify = async (raw: string) => {
    setLoading(true);
    try {
      const data = await verifyTicket(raw);
      setResult(data);
      if (data.valid) {
        toast.success("Valid ticket — Entry approved & checked in!");
      } else if (data.alreadyCheckedIn) {
        toast.error("DUPLICATE CHECK-IN! Ticket already used.");
      } else {
        toast.warning(data.reason || "Ticket is not valid");
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setResult({ valid: false, reason: msg || "Booking not found" });
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetCheckIn = async (bookingReference: string) => {
    if (!confirm(`Are you sure you want to reset check-in for ${bookingReference}?`)) return;
    setResetting(true);
    try {
      await resetTicketCheckIn(bookingReference);
      toast.success("Check-in reset successfully. Ticket is now eligible for check-in again.");
      setResult(null);
      setRef("");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || "Failed to reset check-in");
    } finally {
      setResetting(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRunning.current && scannerRef.current) {
      scannerRunning.current = false;
      try {
        await scannerRef.current.stop();
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    if (tab !== "scan" || scannerStarted.current) return;
    scannerStarted.current = true;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decoded: string) => {
            await stopScanner();
            setTab("manual");
            setRef(decoded);
            verify(decoded);
          },
          () => {}
        )
        .then(() => {
          scannerRunning.current = true;
        })
        .catch(() => toast.error("Camera not available. Use manual input."));
    });

    return () => {
      stopScanner();
    };
  }, [tab]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user && user.role !== "ADMIN") {
    return (
      <div className="text-center py-24">
        <p className="text-red-400 text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-zinc-400 text-sm">Admin role required to verify tickets.</p>
        <Link href="/" className="text-indigo-400 hover:underline text-sm mt-4 block">
          ← Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-violet-400" /> Ticket Verifier & Check-In
        </h1>
        <p className="text-zinc-400 text-sm mt-1">
          Scan or enter a booking reference to record entry and prevent duplicate check-ins
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["scan", "manual"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
              tab === t
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 border-transparent text-white"
                : "border-white/10 text-zinc-400 hover:border-indigo-500/40 hover:text-white"
            }`}
          >
            {t === "scan" ? (
              <>
                <ScanLine className="h-4 w-4" /> Scan QR
              </>
            ) : (
              <>
                <Keyboard className="h-4 w-4" /> Manual
              </>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
        {tab === "scan" ? (
          <div>
            <div id="qr-reader" className="rounded-xl overflow-hidden" />
            <p className="text-xs text-zinc-500 text-center mt-3">Point camera at ticket QR code</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Booking Reference</label>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verify(ref.trim())}
                placeholder="BOOK-xxxx or INSTANT-BOOK:BOOK-xxxx"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
              />
            </div>
            <button
              onClick={() => verify(ref.trim())}
              disabled={loading || !ref.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                "Verify & Check In"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div
          className={`rounded-2xl border p-6 transition-all ${
            result.valid
              ? "bg-emerald-500/10 border-emerald-500/40"
              : result.alreadyCheckedIn
              ? "bg-amber-500/15 border-amber-500/40"
              : result.booking
              ? "bg-rose-500/10 border-rose-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <div className="flex items-start gap-3 mb-4">
            {result.valid ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0 mt-0.5" />
            ) : result.alreadyCheckedIn ? (
              <ShieldAlert className="h-8 w-8 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            ) : result.booking ? (
              <AlertCircle className="h-8 w-8 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-8 w-8 text-red-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`font-bold text-lg ${
                    result.valid
                      ? "text-emerald-400"
                      : result.alreadyCheckedIn
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {result.valid
                    ? "✅ Entry Approved"
                    : result.alreadyCheckedIn
                    ? "⛔ DUPLICATE SCAN / ALREADY CHECKED IN"
                    : result.booking
                    ? "⚠️ Ticket Invalid"
                    : "❌ Not Found"}
                </p>

                {result.valid && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Checked In
                  </span>
                )}
                {result.alreadyCheckedIn && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Duplicate
                  </span>
                )}
              </div>

              {result.reason && (
                <p
                  className={`text-sm mt-1.5 ${
                    result.alreadyCheckedIn
                      ? "text-amber-200 font-medium bg-amber-500/20 p-2.5 rounded-lg border border-amber-500/30"
                      : "text-zinc-300"
                  }`}
                >
                  {result.reason}
                </p>
              )}

              {result.alreadyCheckedIn && result.booking?.checkedInAt && (
                <p className="text-xs text-amber-300/80 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Initial Check-in:{" "}
                  {formatDate(result.booking.checkedInAt)}
                </p>
              )}
            </div>
          </div>

          {result.booking && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              {[
                ["Holder", result.booking.holderName],
                ["Email", result.booking.holderEmail],
                ["Event", result.booking.eventTitle],
                ["Date", result.booking.eventStart ? formatDate(result.booking.eventStart) : null],
                ["Amount", result.booking.totalAmount ? `₹${result.booking.totalAmount}` : null],
                ["Status", result.booking.status],
              ].map(
                ([label, value]) =>
                  value && (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
                      <span className="text-sm text-white font-medium">{value}</span>
                    </div>
                  )
              )}
              {result.booking.seats && result.booking.seats.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Seats</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {result.booking.seats.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-xs font-semibold text-indigo-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 space-y-2">
            {result.alreadyCheckedIn && result.booking?.bookingReference && (
              <button
                onClick={() => handleResetCheckIn(result.booking!.bookingReference)}
                disabled={resetting}
                className="w-full rounded-xl bg-amber-500/20 border border-amber-500/40 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reset Check-In (Admin Override)
              </button>
            )}

            <button
              onClick={() => {
                setResult(null);
                setRef("");
              }}
              className="w-full rounded-xl border border-white/10 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition"
            >
              ↩ Verify Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
