import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "http://127.0.0.1:1234/api/v1/models";

type NativeModel = {
  type: string;
  key: string;
  loaded_instances?: Array<{ id: string }>;
};

export async function POST(request: NextRequest) {
  try {
    const { model } = await request.json() as { model?: string };
    if (!model) return NextResponse.json({ error: "No se indicó un modelo." }, { status: 400 });

    const listResponse = await fetch(BASE_URL, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!listResponse.ok) throw new Error("LM Studio no respondió.");
    const catalog = await listResponse.json() as { models?: NativeModel[] };
    const available = (catalog.models ?? []).find((item) => item.type === "llm" && item.key === model);
    if (!available) return NextResponse.json({ error: "Ese modelo no está instalado." }, { status: 404 });

    const loadedIds = (catalog.models ?? [])
      .filter((item) => item.type === "llm")
      .flatMap((item) => item.loaded_instances ?? [])
      .map((instance) => instance.id);

    for (const instanceId of loadedIds) {
      const unload = await fetch(`${BASE_URL}/unload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer lm-studio" },
        body: JSON.stringify({ instance_id: instanceId }),
        signal: AbortSignal.timeout(30000),
      });
      if (!unload.ok) throw new Error("No se pudo liberar el modelo anterior.");
    }

    const load = await fetch(`${BASE_URL}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer lm-studio" },
      body: JSON.stringify({
        model,
        context_length: 4096,
        parallel: 1,
        flash_attention: true,
        offload_kv_cache_to_gpu: false,
        echo_load_config: true,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!load.ok) {
      const detail = await load.text();
      throw new Error(detail || "LM Studio no pudo cargar el modelo.");
    }

    return NextResponse.json(await load.json());
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "No se pudo cambiar el modelo." },
      { status: 503 },
    );
  }
}
