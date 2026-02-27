"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBookingById, cancelBooking } from "@/lib/queries";
import { useParams, useRouter } from "next/navigation";
import { formatDate, formatCurrency, statusColor } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Ticket, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchBookingById(Number(id)),
  });

  const { mutate: cancel, isPending } = useMutation({
    mutationFn: () => cancelBooking(Number(id)),
    onSuccess: (data) => {
      toast.success(data.refunded ? "Booking cancelled & refund initiated!" : "Booking cancelled.");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setOpen(false);
      router.push("/bookings");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to cancel booking"),
  });

  const seats = booking?.bookingSeats.map(
    bs => `${bs.eventSeat.seat.row}${bs.eventSeat.seat.number}`
  ) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 mt-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/5 h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!booking) return <p className="text-center text-zinc-400 mt-20">Booking not found.</p>;

  const isConfirmed = booking.status === "CONFIRMED";
  const isCancellable = booking.status === "PENDING" || booking.status === "CONFIRMED";

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/bookings" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to bookings
      </Link>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{booking.event.title}</h1>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(booking.expiresAt)}
            </p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor[booking.status]}`}>
            {booking.status}
          </span>
        </div>

        {/* QR Code */}
        {isConfirmed && booking.qrCodeUrl && (
          <div className="flex flex-col items-center py-4 border border-white/10 rounded-2xl bg-white/[0.03]">
            <p className="text-xs text-zinc-400 mb-3 uppercase tracking-widest font-medium">Your Entry QR Code</p>
            <img
              src={booking.qrCodeUrl}
              alt="QR Code"
              className="h-44 w-44 rounded-xl border border-white/10"
            />
            <p className="text-xs text-zinc-500 mt-3">Show this at the venue entrance</p>
          </div>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reference</p>
            <p className="text-xs font-mono text-zinc-300 break-all">{booking.bookingReference ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Amount Paid</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(booking.totalAmount)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Seats</p>
            <div className="flex flex-wrap gap-2">
              {seats.map(s => (
                <span key={s} className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Cancel button */}
        {isCancellable && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="w-full rounded-xl border border-red-500/30 text-red-400 py-2.5 text-sm hover:bg-red-500/10 transition flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4" /> Cancel Booking
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a24] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Cancel this booking?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {isConfirmed
                    ? "This is a confirmed booking. Cancelling will trigger a Razorpay refund (5–7 business days) and release your seats."
                    : "This will cancel your pending booking and release the held seats."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <button onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white transition">
                  Keep booking
                </button>
                <button
                  onClick={() => cancel()}
                  disabled={isPending}
                  className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Yes, cancel
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
