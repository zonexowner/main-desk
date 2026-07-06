import type { BrainSnapshot, PostMortem, Signal } from "@/lib/types";

async function callOpenAI(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 220,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

const SYSTEM = `You write concise post-mortem narratives for paper trading signals.
Rules:
- 2–4 sentences max.
- Do NOT change or invent the tag — it is already decided.
- Focus on context: regime, timing, whether the thesis still made sense.
- No trade advice, entries, or new levels.
- Plain English, desk tone.`;

/** Adds optional LLM narrative; rule-based tag/summary/lesson unchanged. */
export async function enrichPostMortemWithLlm(
  signal: Signal,
  base: PostMortem,
  brainAtExit?: BrainSnapshot,
): Promise<PostMortem> {
  const narrative = await callOpenAI(
    SYSTEM,
    [
      `Asset: ${signal.asset}`,
      `Direction: ${signal.direction} ${signal.mode}`,
      `Entry ${signal.entry} · Stop ${signal.stop} · Exit ${signal.exitPrice ?? "?"}`,
      `Brain at entry: ${signal.brainLabel} (score ${signal.brainScore}, ${signal.brainConfidence})`,
      brainAtExit
        ? `Brain at exit: ${brainAtExit.label} (score ${brainAtExit.score})`
        : "",
      `Thesis: ${signal.thesis}`,
      `Rule tag: ${base.tag}`,
      `Rule summary: ${base.summary}`,
      `Rule lesson: ${base.lesson}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (!narrative) {
    return { ...base, mode: "rule" };
  }

  return {
    ...base,
    narrative,
    mode: "llm",
  };
}

export function isLlmPostMortemConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
