import { NextRequest, NextResponse } from "next/server";
import { containsSexualMinorContent } from "../../content-guard";

const LM_STUDIO_CHAT = "http://127.0.0.1:1234/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.model || !Array.isArray(body?.messages)) {
      return NextResponse.json({ error: "La solicitud está incompleta." }, { status: 400 });
    }

    const narrative = body.messages
      .filter((message: { role?: string }) => message.role !== "system")
      .map((message: { content?: unknown }) => typeof message.content === "string" ? message.content : "")
      .join("\n");
    if (containsSexualMinorContent(narrative)) {
      return NextResponse.json(
        { error: "Tinta Privada genera ficción sexual únicamente entre personajes adultos. Corregí la edad a 18 años o más para continuar." },
        { status: 422 },
      );
    }

    const response = await fetch(LM_STUDIO_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer lm-studio" },
      body: JSON.stringify(body),
      signal: request.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "LM Studio rechazó la generación.", detail },
        { status: response.status },
      );
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    return NextResponse.json(
      { error: "No se pudo conectar con LM Studio en 127.0.0.1:1234." },
      { status: 503 },
    );
  }
}
