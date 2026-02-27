"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMyBookings } from "@/lib/queries";
import { Booking } from "@/types";
import Link from "next/link";
import { Ticket, Calendar, ArrowRight } from "lucide-react";
import { formatDate, formatCurrency, statusColor } from "@/lib/utils";

function BookingCard({ booking }: { booking: Booking }) {
  const seats = booking.bookingSeats
    .map(bs => `${bs.eventSeat.seat.row}${bs.eventSeat.seat.number}`)
    .join(", ");

  return (
    <Link href={`/bookings/${booking.id}`}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all group cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {booking.event.imageUrl ? (
              <img
                src={booking.event.imageUrl}
                alt={booking.event.title}
                className="h-14 w-14 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-900/60 to-violet-900/60 flex items-center justify-center shrink-0">
                <Ticket className="h-6 w-6 text-indigo-400/50" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                {booking.event.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(booking.event.startTime)}
              </p>
              {seats && <p className="text-xs text-zinc-500 mt-0.5">Seats: {seats}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColor[booking.status]}`}>
              {booking.status}
            </span>
            <span className="text-sm font-bold text-white">{formatCurrency(booking.totalAmount)}</span>
            <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: fetchMyBookings,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Bookings</h1>
          <p className="text-zinc-400 text-sm mt-1">All your event tickets in one place</p>
        </div>
        <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          Browse events →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 h-24 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-24">
          <Ticket className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400 mb-4">You have no bookings yet.</p>
          <Link href="/" className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  );
}
