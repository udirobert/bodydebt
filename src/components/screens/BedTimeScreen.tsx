"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /bed-time route — sleep is now one screen at /wake-time. */
export function BedTimeScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/wake-time");
  }, [router]);
  return null;
}
