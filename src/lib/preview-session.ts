import type { DebtAnalysis, Stressor, ConfidenceTier, FaceAnalysisResult, HRVData } from "@/lib/types";

const BACKUP_KEY = "body-debt-preview-backup";

export interface PreviewSessionBackup {
  analysis: DebtAnalysis | null;
  selectedStressors: Stressor[];
  wakeTime: string | null;
  bedTime: string | null;
  confidenceTier: ConfidenceTier;
  faceAnalysis: FaceAnalysisResult | null;
  hrvData: HRVData | null;
}

export function savePreviewBackup(backup: PreviewSessionBackup): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
}

export function loadPreviewBackup(): PreviewSessionBackup | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(BACKUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PreviewSessionBackup;
  } catch {
    return null;
  }
}

export function clearPreviewBackup(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(BACKUP_KEY);
}
