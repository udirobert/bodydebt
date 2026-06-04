import type { StressorType } from "@/lib/types";

export interface QvacInferRequest {
  stressScore: number;
  isHealthy: boolean;
  features: {
    eyeFatigue: boolean;
    browTension: boolean;
    mouthTension: boolean;
  };
  stressors: StressorType[];
}

export interface QvacInferResponse {
  advice: string;
  source: string;
  model?: string;
}

export interface QvacProgress {
  status: string;
  loaded?: number;
  total?: number;
  percent?: number;
}

/**
 * Calls the QVAC edge AI inference endpoint via SSE.
 * Reports progress via onProgress callback and returns the final advice.
 *
 * POST /api/qvac/infer
 */
export async function getQvacAdvice(
  input: QvacInferRequest,
  onProgress?: (progress: QvacProgress) => void
): Promise<QvacInferResponse> {
  const res = await fetch("/api/qvac/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    return { advice: "Focus on rest and hydration.", source: "fallback" };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return { advice: "Focus on rest and hydration.", source: "fallback" };
  }

  const decoder = new TextDecoder();
  let buffer = "";

  return new Promise((resolve) => {
    const read = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          resolve({ advice: "Focus on rest and hydration.", source: "fallback" });
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: progress")) {
            // next line has data
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.status) {
                onProgress?.(data as QvacProgress);
              } else if (data.advice) {
                resolve({
                  advice: data.advice,
                  source: data.source,
                  model: data.model,
                });
                reader.cancel();
                return;
              }
            } catch {
              // skip malformed data
            }
          }
        }

        read();
      }).catch(() => {
        resolve({ advice: "Focus on rest and hydration.", source: "fallback" });
      });
    };

    read();
  });
}
