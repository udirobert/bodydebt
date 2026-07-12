"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PreviewBanner } from "@/components/PreviewBanner";

/**
 * Redirects legacy ?demo=1 links to /preview.
 * Renders the example-session banner globally when preview mode is active.
 */
export function PreviewShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("demo") === "1" && pathname !== "/preview") {
      router.replace("/preview");
    }
  }, [searchParams, pathname, router]);

  return <PreviewBanner />;
}
