import { NextResponse } from "next/server";
import { MODEL_CATALOG, MODEL_PROFILE } from "../../model-catalog";

const LM_STUDIO_MODELS = "http://127.0.0.1:1234/api/v1/models";

export async function GET() {
  try {
    const response = await fetch(LM_STUDIO_MODELS, {
      cache: "no-store",
      signal: AbortSignal.timeout(1800),
    });
    if (!response.ok) return new Response(await response.text(), { status: response.status });
    const body = await response.json() as {
      models?: Array<{
        type: string;
        key: string;
        display_name?: string;
        params_string?: string | null;
        quantization?: { name?: string };
        loaded_instances?: Array<{ id: string }>;
      }>;
    };
    const data = (body.models ?? [])
      .filter((model) => model.type === "llm")
      .map((model) => {
        const profile = MODEL_PROFILE.get(model.key);
        return {
          id: model.key,
          label: profile?.label || model.display_name || model.key,
          params: model.params_string || profile?.params || "LLM",
          quantization: model.quantization?.name || profile?.quantization || "",
          loaded: Boolean(model.loaded_instances?.length),
          note: profile?.note || "Modelo local",
          rank: profile?.rank ?? 99,
        };
      })
      .sort((a, b) => a.rank - b.rank);
    return NextResponse.json({ data, connected: true });
  } catch {
    return NextResponse.json(
      { data: MODEL_CATALOG, connected: false, error: "LM Studio está iniciando." },
    );
  }
}
