import { Suspense } from "react";
import { ClinicAdminPage } from "@/products/care-companion/ClinicAdminPage";

export default function ClinicAdminRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <ClinicAdminPage />
    </Suspense>
  );
}
