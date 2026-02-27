"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, PlusCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

export default function CreateEventPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", startTime: "", endTime: "", language: "", category: "",
  });

  if (user && user.role !== "ADMIN") {
    return (
      <div className="text-center py-24">
        <p className="text-red-400 text-lg font-semibold mb-2">Access Denied</p>
        <p className="text-zinc-400 text-sm">Admin role required.</p>
        <Link href="/" className="text-indigo-400 hover:underline text-sm mt-4 block">← Go home</Link>
      </div>
    );
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime) {
      toast.error("Title, start time and end time are required");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (imageFile) fd.append("image", imageFile);

      await api.post("/events/create", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Event created successfully!");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><PlusCircle className="h-6 w-6 text-violet-400" /> Create Event</h1>
        <p className="text-zinc-400 text-sm mt-1">Fill in the details to publish a new event</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
        {/* Image upload */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Event Image</label>
          <div
            className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center cursor-pointer hover:border-indigo-500/40 transition"
            onClick={() => document.getElementById("img-input")?.click()}
          >
            {preview ? (
              <img src={preview} alt="preview" className="mx-auto h-40 object-cover rounded-lg" />
            ) : (
              <div className="text-zinc-500 text-sm">
                <p className="text-2xl mb-2">🖼️</p>
                <p>Click to upload event image</p>
                <p className="text-xs mt-1 text-zinc-600">JPG, PNG — recommended 1200×600</p>
              </div>
            )}
            <input id="img-input" type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Title *</label>
          <input className={inputCls} placeholder="Concert at Phoenix Mall" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
          <textarea rows={3} className={inputCls} placeholder="Tell attendees what to expect…" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Start Time *</label>
            <input type="datetime-local" className={inputCls} value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">End Time *</label>
            <input type="datetime-local" className={inputCls} value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Category</label>
            <select className={inputCls} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="" className="bg-zinc-900">Select category</option>
              {["Music","Sports","Theatre","Comedy","Tech","Other"].map(c => (
                <option key={c} value={c} className="bg-zinc-900">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Language</label>
            <input className={inputCls} placeholder="English, Hindi…" value={form.language} onChange={e => setForm({...form, language: e.target.value})} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Publish Event
        </button>
      </form>
    </div>
  );
}
