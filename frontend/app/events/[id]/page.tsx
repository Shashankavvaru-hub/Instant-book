"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchEventById, fetchEventSeats, holdSeats, createPayment } from "@/lib/queries";
import { useParams, useRouter } from "next/navigation";
import { EventSeat } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Calendar, Clock, Loader2, Ticket, Globe } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Image from "next/image";

declare global {
  interface Window { Razorpay: any; }
}

function SeatButton({ seat, selected, onClick }: {
  seat: EventSeat;
  selected: boolean;
  onClick: () => void;
}) {
  const isBooked = seat.status === "BOOKED";
  return (
    <button
      onClick={onClick}
      disabled={isBooked}
      title={`${seat.seat.row}${seat.seat.number}`}
      className={`
        h-9 w-9 rounded-lg text-xs font-bold transition-all border
        ${isBooked
          ? "bg-red-500/20 border-red-500/30 text-red-400/50 cursor-not-allowed"
          : selected
            ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30 scale-110"
            : "bg-white/5 border-white/10 text-zinc-300 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-300"
        }
      `}
    >
      {seat.seat.row}{seat.seat.number}
    </button>
  );
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [paying, setPaying] = useState(false);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEventById(Number(id)),
  });

  const { data: seats = [], isLoading: seatsLoading } = useQuery({
    queryKey: ["event-seats", id],
    queryFn: () => fetchEventSeats(Number(id)),
    enabled: !!user,
  });

  const toggleSeat = (seatId: number) => {
    setSelected(prev =>
      prev.includes(seatId) ? prev.filter(s => s !== seatId) : [...prev, seatId]
    );
  };

  const handleBook = async () => {
    if (!user) { router.push("/login"); return; }
    if (selected.length === 0) { toast.error("Please select at least one seat"); return; }
    setPaying(true);
    try {
      // 1. Hold seats
      await holdSeats(Number(id), selected);
      // Need booking id — re-fetch my bookings to get latest pending
      const bookingsRes = await import("@/lib/queries").then(m => m.fetchMyBookings());
      const pending = bookingsRes.find(b => b.status === "PENDING" && b.event.id === Number(id));
      if (!pending) throw new Error("Could not find pending booking");

      // 2. Create Razorpay order
      const payment = await createPayment(pending.id);

      // 3. Load Razorpay script
      await new Promise<void>((resolve) => {
        if (window.Razorpay) return resolve();
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        document.body.appendChild(s);
      });

      // 4. Open checkout
      const rzp = new window.Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.gatewayOrderId,
        name: "InstantBook",
        description: event?.title ?? "Event Ticket",
        theme: { color: "#6366f1" },
        handler: () => {
          toast.success("Payment successful! Confirming your booking…");
          setTimeout(() => router.push("/bookings"), 1500);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Booking failed");
      setPaying(false);
    }
  };

  const rows = seats.reduce<Record<string, EventSeat[]>>((acc, seat) => {
    const row = seat.seat.row;
    acc[row] = acc[row] ?? [];
    acc[row].push(seat);
    return acc;
  }, {});

  if (eventLoading) {
    return <div className="h-64 rounded-2xl border border-white/10 bg-white/5 animate-pulse mt-4" />;
  }
  if (!event) return <p className="text-center text-zinc-400 mt-20">Event not found.</p>;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Hero banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 h-64 bg-gradient-to-br from-indigo-900/60 to-violet-900/60">
        {event.imageUrl && (
          <Image src={event.imageUrl} alt={event.title} fill unoptimized className="absolute inset-0 object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 p-6">
          {event.category && (
            <span className="rounded-full bg-indigo-500/30 border border-indigo-500/40 px-3 py-0.5 text-xs font-medium text-indigo-300 mb-2 inline-block">
              {event.category}
            </span>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white">{event.title}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-zinc-300">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatDate(event.startTime)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Ends {formatDate(event.endTime)}</span>
            {event.language && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {event.language}</span>}
          </div>
        </div>
      </div>

      {event.description && (
        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{event.description}</p>
      )}

      {/* Seat selection */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Select Seats</h2>
        <p className="text-xs text-zinc-500 mb-6">Each seat is ₹100. Seats are held for 5 minutes after selection.</p>

        {/* Legend */}
        <div className="flex gap-4 mb-6 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white/5 border border-white/10" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-indigo-500 border border-indigo-400" /> Selected</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-500/20 border border-red-500/30" /> Booked</span>
        </div>

        {/* Stage indicator */}
        <div className="w-full text-center text-xs text-zinc-500 border border-white/10 rounded-lg py-2 mb-6 bg-white/[0.02] tracking-widest uppercase">
          🎭 Stage
        </div>

        {seatsLoading ? (
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="h-9 w-9 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : !user ? (
          <p className="text-center text-zinc-400 py-8">
            <a href="/login" className="text-indigo-400 hover:underline">Login</a> to view and select seats.
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(rows).sort(([a], [b]) => a.localeCompare(b)).map(([row, rowSeats]) => (
              <div key={row} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-4 shrink-0 text-center">{row}</span>
                <div className="flex flex-wrap gap-1.5">
                  {rowSeats.sort((a, b) => a.seat.number - b.seat.number).map(seat => (
                    <SeatButton
                      key={seat.id}
                      seat={seat}
                      selected={selected.includes(seat.id)}
                      onClick={() => toggleSeat(seat.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary & Book button */}
        {selected.length > 0 && (
          <div className="mt-6 border-t border-white/10 pt-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">{selected.length} seat{selected.length > 1 ? "s" : ""} selected</p>
              <p className="text-xl font-bold text-white mt-0.5">₹{selected.length * 100}</p>
            </div>
            <button
              onClick={handleBook}
              disabled={paying}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <><Ticket className="h-4 w-4" /> Book Now</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
