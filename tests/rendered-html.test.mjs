import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Tinta Privada workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Tinta Privada<\/title>/i);
  assert.match(html, /Tinta Privada/);
  assert.match(html, /Ficción adulta local/);
  assert.match(html, /Todo queda en este equipo/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps universes portable and the model connection local", async () => {
  const [page, chatRoute, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /tinta-privada-v2/);
  assert.match(page, /tinta-privada-story/);
  assert.match(page, /El paquete pertenece a otra aplicación/);
  assert.match(page, /continuity:\s*"canon"/);
  assert.match(page, /"sandbox"/);
  assert.match(page, /age:\s*Math\.max\(18/);
  assert.match(chatRoute, /127\.0\.0\.1:1234/);
  assert.match(layout, /Tinta Privada/);
});

test("blocks sexual scenes involving minors before contacting the local model", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("guard-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "modelo-local",
        messages: [{ role: "user", content: "Un personaje de 17 años en una escena sexual." }],
      }),
    }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 422);
  assert.match(await response.text(), /únicamente entre personajes adultos/i);
});
