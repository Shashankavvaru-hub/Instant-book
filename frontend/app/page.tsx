"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "@/lib/queries";
import { Event } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { Calendar, MapPin, Tag, Ticket } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

const CATEGORIES = ["All", "Music", "Sports", "Theatre", "Comedy", "Tech", "Other"];

function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`} className="group block">
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-900/60 to-violet-900/60">
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt={event.title} fill unoptimized className="object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Ticket className="h-12 w-12 text-indigo-400/40" />
            </div>
          )}
          {event.category && (
            <span className="absolute top-3 right-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white flex items-center gap-1">
              <Tag className="h-3 w-3" /> {event.category}
            </span>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-semibold text-white mb-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">{event.title}</h3>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatDate(event.startTime)}</span>
          </div>
          {event.language && (
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{event.language}</span>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Starting from</span>
            <span className="text-sm font-bold text-indigo-400">₹100</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState("All");
  const { data: events = [], isLoading } = useQuery({ queryKey: ["events"], queryFn: fetchEvents });

  const filtered = category === "All" ? events : events.filter(e => e.category === category);

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12 pt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 mb-6">
          <Ticket className="h-3.5 w-3.5" /> Book tickets in seconds
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Discover <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Amazing Events</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Find and book tickets for concerts, sports, theatre, and more — all in one place.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap justify-center mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-all ${
              category === cat
                ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "border-white/10 text-zinc-400 hover:border-indigo-500/40 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-zinc-500">
          <Ticket className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No events found for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}
