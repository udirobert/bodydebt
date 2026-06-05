import dynamic from "next/dynamic";

const FaceScanScreen = dynamic(
  () => import("@/components/screens/FaceScanScreen").then((m) => ({ default: m.FaceScanScreen })),
  {
    loading: () => (
      <div
        className="min-h-svh flex items-center justify-center"
        style={{ backgroundColor: "#0A0A0B" }}
      >
        <div
          className="w-12 h-12 rounded-full animate-pulse"
          style={{
            background: "radial-gradient(circle at 35% 35%, rgba(234,88,12,0.3), transparent 70%)",
          }}
        />
      </div>
    ),
  }
);

export default function Page() {
  return <FaceScanScreen />;
}
