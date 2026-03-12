"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

/**
 * Redirects unauthenticated users to /login.
 * Must be called inside a client component that is wrapped by Providers.
 *
 * Usage:
 *   const { user, isLoading } = useRequireAuth();
 *   if (isLoading) return <LoadingSpinner />;
 */
export function useRequireAuth() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  return { user, isLoading };
}
