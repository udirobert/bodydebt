import { Suspense } from "react";
import { ClinicianPatientPage } from "@/products/care-companion/ClinicianPatientPage";

export default function ClinicianPatientRoute() {
  return <Suspense fallback={<div className="min-h-svh" />}><ClinicianPatientPage /></Suspense>;
}
