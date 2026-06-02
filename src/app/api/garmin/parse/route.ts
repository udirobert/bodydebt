import { NextRequest, NextResponse } from "next/server";
import type { HRVData } from "@/lib/types";

export const maxDuration = 10;

/**
 * POST /api/garmin/parse
 *
 * Body: { csvText: string }
 *
 * Parses a Garmin Connect HRV CSV export and returns HRVData.
 *
 * Garmin CSV columns (typical HRV export):
 *   Date, Time, HRV Status, 5-Min High, 5-Min Low,
 *   Baseline Low, Baseline High, Last Night's Average, Last Night's 5-Min High
 *
 * Falls through to a null response if parsing fails — caller falls back to
 * manual proxy. Never shows a raw error to the user.
 */
export async function POST(request: NextRequest) {
  let body: { csvText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { csvText } = body;
  if (!csvText || typeof csvText !== "string") {
    return NextResponse.json({ error: "csvText required" }, { status: 400 });
  }

  try {
    const result = parseGarminHRVCsv(csvText);
    if (!result) {
      return NextResponse.json({ error: "PARSE_FAILED", message: "Could not read this file." }, { status: 422 });
    }
    return NextResponse.json({ hrvData: result });
  } catch {
    return NextResponse.json({ error: "PARSE_FAILED", message: "Could not read this file." }, { status: 422 });
  }
}

function parseGarminHRVCsv(csv: string): HRVData | null {
  const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Find header row — may not be the first line in all Garmin exports
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().includes("last night") || l.toLowerCase().includes("baseline")
  );
  if (headerIdx < 0) return null;

  const headers = splitCsvRow(lines[headerIdx]).map((h) =>
    h.toLowerCase().trim().replace(/['"]/g, "")
  );

  // Find the most recent data row (first non-empty row after header)
  const dataRow = lines
    .slice(headerIdx + 1)
    .map(splitCsvRow)
    .find((row) => row.some((cell) => cell.trim() !== ""));

  if (!dataRow) return null;

  const get = (partial: string): number | null => {
    const idx = headers.findIndex((h) => h.includes(partial.toLowerCase()));
    if (idx < 0 || idx >= dataRow.length) return null;
    const raw = dataRow[idx].replace(/[^0-9.-]/g, "");
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  };

  const lastNightAvg  = get("last night's average") ?? get("last night average");
  const baselineLow   = get("baseline low");
  const baselineHigh  = get("baseline high");

  if (lastNightAvg === null) return null;

  // Derive personal baseline midpoint; fall back to population average
  const POPULATION_BASELINE = 65;
  const baselineMid = baselineLow !== null && baselineHigh !== null
    ? (baselineLow + baselineHigh) / 2
    : POPULATION_BASELINE;

  const hrvDeltaPercent = Math.round(((lastNightAvg - baselineMid) / baselineMid) * 100);

  return {
    hrvDeltaPercent: Math.max(-80, Math.min(30, hrvDeltaPercent)),
    restingHrDelta: 0, // not in HRV export
    source: "garmin_export",
    confidence: "medium", // real data, but potentially from yesterday or earlier
  };
}

function splitCsvRow(row: string): string[] {
  // Handle quoted fields with commas
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}
