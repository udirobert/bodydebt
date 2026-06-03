export interface HealthCoachInput {
  stressScore: number;
  isHealthy: boolean;
  features: {
    eyeFatigue: boolean;
    browTension: boolean;
    mouthTension: boolean;
  };
  stressors: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let qvacModule: any = null;

async function loadQvac() {
  if (qvacModule) return qvacModule;
  try {
    const pkg = ["@qvac", "sdk"].join("/");
    qvacModule = await import(/* webpackIgnore: true */ pkg);
    return qvacModule;
  } catch {
    return null;
  }
}

export function buildPrompt(input: HealthCoachInput): string {
  return `You are a health recovery coach. A user completed a ZK-verified facial stress scan.

Verified data:
- Stress score: ${input.stressScore}/100
- ZK result: ${input.isHealthy ? "Within healthy range" : "Elevated stress"}
- Eye fatigue: ${input.features.eyeFatigue ? "Yes" : "No"}
- Brow tension: ${input.features.browTension ? "Yes" : "No"}
- Reported stressors: ${input.stressors.join(", ") || "None"}

Give 3 specific, actionable recovery tips in 2-3 sentences total. Direct, no caveats.`;
}

export function buildFallbackPrompt(input: HealthCoachInput): string {
  return buildPrompt(input);
}

export async function runHealthCoach(
  input: HealthCoachInput
): Promise<string | null> {
  const qvac = await loadQvac();
  if (!qvac) return null;

  try {
    const { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } = qvac;

    const modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: "llm",
    });

    let result = "";
    const response = completion({
      modelId,
      history: [{ role: "user" as const, content: buildPrompt(input) }],
      stream: true,
    });

    for await (const token of response.tokenStream) {
      result += token;
    }

    await unloadModel({ modelId });
    return result || null;
  } catch {
    return null;
  }
}
