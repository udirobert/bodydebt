import { Suspense } from "react";
import { ClinicianPage } from "@/products/care-companion/ClinicianPage";

export default function ClinicianRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <ClinicianPage />
    </Suspense>
  );
}
