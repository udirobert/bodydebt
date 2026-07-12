"use client";

import { useEffect } from "react";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
import { useBodyDebtStore } from "@/stores/useBodyDebtStore";

/**
 * Full example dashboard — day 2 with memory, isolated from the user's data.
 */
export function PreviewScreen() {
  const enterPreview = useBodyDebtStore((s) => s.enterPreview);

  useEffect(() => {
    enterPreview();
  }, [enterPreview]);

  return <DashboardScreen />;
}
