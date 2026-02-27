"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { logoutApi } from "@/lib/queries";
import { toast } from "sonner";
import { Ticket, Calendar, User, LogOut, ShieldCheck, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi();
      setUser(null);
      router.push("/login");
      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0f14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 p-1.5 shadow-lg shadow-indigo-500/20">
            <Ticket className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            InstantBook
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Events
          </Link>
          {user && (
            <Link href="/bookings" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Ticket className="h-3.5 w-3.5" /> My Bookings
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <>
              <Link href="/admin/events/create" className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Create Event
              </Link>
              <Link href="/admin/verify" className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Verify Ticket
              </Link>
            </>
          )}
        </div>

        {/* Auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> {user.firstName}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:border-red-500/30 hover:text-red-400 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-zinc-400" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0f0f14] px-4 py-4 flex flex-col gap-4">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-300">Events</Link>
          {user && <Link href="/bookings" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-300">My Bookings</Link>}
          {user?.role === "ADMIN" && (
            <>
              <Link href="/admin/events/create" onClick={() => setMenuOpen(false)} className="text-sm text-violet-400">Create Event</Link>
              <Link href="/admin/verify" onClick={() => setMenuOpen(false)} className="text-sm text-violet-400">Verify Ticket</Link>
            </>
          )}
          {user ? (
            <button onClick={handleLogout} className="text-sm text-red-400 text-left">Logout</button>
          ) : (
            <div className="flex gap-3">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-300">Login</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className="text-sm text-indigo-400">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
