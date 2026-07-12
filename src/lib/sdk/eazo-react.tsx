"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";

/**
 * Wraps the app in NextAuth's SessionProvider so `useSession()`
 * works in any client component. Replaces the old EazoProvider stub.
 */
export function EazoProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

type EazoState = {
  auth: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    } | null;
    authenticated: boolean;
    loading: boolean;
  };
  device: {
    platform: string;
  };
};

/**
 * Bridge hook that maps NextAuth's `useSession()` to the old Eazo
 * selector shape. Existing components that call `useEazo(s => s.auth.user)`
 * keep working without changes. NextAuth's `image` is mapped to
 * `avatarUrl` for interface compatibility.
 */
export function useEazo<T>(selector: (state: EazoState) => T): T {
  const { data: session, status } = useSession();

  const state: EazoState = {
    auth: {
      user: session?.user
        ? {
            id: (session.user as { id?: string }).id ?? session.user.email ?? "",
            name: session.user.name,
            email: session.user.email,
            avatarUrl: session.user.image,
          }
        : null,
      authenticated: status === "authenticated",
      loading: status === "loading",
    },
    device: {
      platform: typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "web",
    },
  };

  return selector(state);
}
