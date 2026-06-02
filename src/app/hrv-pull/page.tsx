import { Suspense } from "react";
import { HRVPullScreen } from "@/components/screens/HRVPullScreen";

export default function Page() {
  return (
    <Suspense>
      <HRVPullScreen />
    </Suspense>
  );
}
