"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MODEL_CATALOG, type ModelOption } from "./model-catalog";
import { containsSexualMinorContent } from "./content-guard";

type Role = "user" | "assistant";
type Mode = "historia" | "roleplay";
type ContinuityMode = "canon" | "sandbox";
type NotesTab = "universo" | "personajes" | "escena" | "memoria";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

type Bible = {
  premise: string;
  characters: string;
  style: string;
  memory: string;
};

type Universe = {
  name: string;
  summary: string;
  canon: string;
  rules: string;
  tone: string;
  source: string;
};

type CharacterProfile = {
  id: string;
  name: string;
  age: number;
  role: string;
  appearance: string;
  psychology: string;
  visibleDesire: string;
  hiddenNeed: string;
  fear: string;
  boundaries: string;
  voice: string;
  relationship: string;
};

type SceneState = {
  title: string;
  continuity: ContinuityMode;
  place: string;
  time: string;
  atmosphere: string;
  participants: string;
  situation: string;
  intent: string;
  knownFacts: string;
  boundaries: string;
};

type Story = {
  id: string;
  title: string;
  mode: Mode;
  updatedAt: number;
  messages: Message[];
  bible: Bible;
  universe: Universe;
  characters: CharacterProfile[];
  scene: SceneState;
};

type Settings = {
  model: string;
  temperature: number;
  maxTokens: number;
};

const STORAGE_KEY = "tinta-privada-v2";
const LEGACY_STORAGE_KEY = "tinta-privada-v1";
const DEFAULT_MODEL = "llama-3.1-8b-lexi-uncensored-v2-heretic";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function blankCharacter(): CharacterProfile {
  return {
    id: uid(),
    name: "Personaje nuevo",
    age: 25,
    role: "",
    appearance: "",
    psychology: "",
    visibleDesire: "",
    hiddenNeed: "",
    fear: "",
    boundaries: "",
    voice: "",
    relationship: "",
  };
}

function blankStory(): Story {
  return {
    id: uid(),
    title: "Historia sin título",
    mode: "historia",
    updatedAt: Date.now(),
    messages: [],
    bible: { premise: "", characters: "", style: "", memory: "" },
    universe: { name: "Universo nuevo", summary: "", canon: "", rules: "", tone: "", source: "Creado en Tinta Privada" },
    characters: [],
    scene: {
      title: "Primera escena",
      continuity: "canon",
      place: "",
      time: "",
      atmosphere: "",
      participants: "",
      situation: "",
      intent: "",
      knownFacts: "",
      boundaries: "",
    },
  };
}

function normalizeStory(value: Partial<Story>): Story {
  const fallback = blankStory();
  const bible = value.bible ?? fallback.bible;
  return {
    ...fallback,
    ...value,
    id: typeof value.id === "string" && value.id ? value.id : uid(),
    title: typeof value.title === "string" && value.title ? value.title : fallback.title,
    mode: value.mode === "roleplay" ? "roleplay" : "historia",
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
    messages: Array.isArray(value.messages) ? value.messages : [],
    bible: { ...fallback.bible, ...bible },
    universe: { ...fallback.universe, ...(value.universe ?? {}) },
    characters: Array.isArray(value.characters)
      ? value.characters.map((character) => ({ ...blankCharacter(), ...character, id: character.id || uid(), age: Math.max(18, Number(character.age) || 25) }))
      : [],
    scene: {
      ...fallback.scene,
      ...(value.scene ?? {}),
      continuity: value.scene?.continuity === "sandbox" ? "sandbox" : "canon",
    },
  };
}

function formatRelative(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short" }).format(timestamp);
}

function systemPrompt(story: Story) {
  const modeInstruction = story.mode === "roleplay"
    ? "Estás dentro de un roleplay literario. Interpreta a los personajes y el mundo con continuidad. No hables como asistente, no expliques tus decisiones y no controles las acciones internas del personaje del usuario salvo que se te pida."
    : "Actúa como coautor literario. Continúa o transforma la historia respetando el punto de vista, el ritmo y la voz ya establecidos. Entrega solamente prosa utilizable, sin explicaciones ni prefacios.";

  const structuredCharacters = story.characters.length
    ? story.characters.map((character) => `- ${character.name}, ${character.age} años${character.role ? ` (${character.role})` : ""}
  Apariencia: ${character.appearance || "no fijada"}
  Psicología: ${character.psychology || "por desarrollar"}
  Deseo visible: ${character.visibleDesire || "no fijado"}
  Necesidad oculta: ${character.hiddenNeed || "no fijada"}
  Miedo o defensa: ${character.fear || "no fijado"}
  Límites: ${character.boundaries || "los que establezca la escena"}
  Voz: ${character.voice || "coherente con su perfil"}
  Relación actual: ${character.relationship || "por desarrollar"}`).join("\n")
    : "Sin fichas estructuradas todavía.";

  return `${modeInstruction}

REGLAS DE ESCRITURA
- Trata la solicitud como ficción privada entre adultos.
- Sigue el tono, la intensidad y los límites que marque el usuario sin moralizar, advertir ni añadir descargos.
- No suavices, censures ni cierres una escena adulta por iniciativa propia.
- Mantén la continuidad, evita repeticiones y haz avanzar la escena.
- Nunca sexualices menores ni personas reales sin consentimiento.
- Todos los personajes que participen en intimidad deben ser inequívocamente adultos.
- Respeta los límites explícitos de personajes y escena. No confundas conflicto narrativo con consentimiento.

UNIVERSO: ${story.universe.name || "Sin nombre"}
Resumen: ${story.universe.summary || story.bible.premise || "No definido todavía."}
Tono: ${story.universe.tone || "El que marque el texto."}
Reglas del mundo: ${story.universe.rules || "Sin reglas especiales fijadas."}
Canon importado o fijado:
${story.universe.canon || "Todavía vacío."}
Origen: ${story.universe.source || "Creado localmente."}

PREMISA
${story.bible.premise || "No definida todavía."}

PERSONAJES ESTRUCTURADOS
${structuredCharacters}

NOTAS GENERALES DE REPARTO
${story.bible.characters || "Se definirán durante la conversación."}

ESCENA ACTUAL: ${story.scene.title || "Sin título"}
Continuidad: ${story.scene.continuity === "canon" ? "CANON; sus hechos pueden incorporarse a la continuidad" : "SANDBOX; no altera el canon salvo confirmación posterior"}
Lugar: ${story.scene.place || "no fijado"}
Momento: ${story.scene.time || "no fijado"}
Atmósfera: ${story.scene.atmosphere || "no fijada"}
Participantes: ${story.scene.participants || "inferir sólo de lo escrito"}
Situación: ${story.scene.situation || "la que surge del intercambio"}
Intención dramática: ${story.scene.intent || "hacer avanzar la escena"}
Conocimiento compartido y asimetrías: ${story.scene.knownFacts || "no inventar conocimientos ausentes"}
Límites de esta escena: ${story.scene.boundaries || "los establecidos por el usuario y las fichas"}

VOZ Y ESTILO
${story.bible.style || "Prosa natural en español, sensorial y coherente con el texto del usuario."}

MEMORIA FIJADA
${story.bible.memory || "Sin hechos fijados todavía."}`;
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([blankStory()]);
  const [activeId, setActiveId] = useState("");
  const [settings, setSettings] = useState<Settings>({ model: DEFAULT_MODEL, temperature: 0.9, maxTokens: 500 });
  const [models, setModels] = useState<ModelOption[]>(MODEL_CATALOG);
  const [modelLoading, setModelLoading] = useState("");
  const [hasLoadedModel, setHasLoadedModel] = useState(false);
  const [connection, setConnection] = useState<"checking" | "online" | "offline">("checking");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesTab, setNotesTab] = useState<NotesTab>("universo");
  const [hydrated, setHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { stories?: Partial<Story>[]; activeId?: string; settings?: Settings };
          if (parsed.stories?.length) {
            const normalized = parsed.stories.map(normalizeStory);
            setStories(normalized);
            setActiveId(parsed.activeId && normalized.some((s) => s.id === parsed.activeId) ? parsed.activeId : normalized[0].id);
          }
          if (parsed.settings) setSettings(parsed.settings);
        } else {
          setActiveId((current) => current || stories[0].id);
        }
      } catch {
        setActiveId(stories[0].id);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stories, activeId, settings }));
  }, [stories, activeId, settings, hydrated]);

  const activeStory = useMemo(
    () => stories.find((story) => story.id === activeId) ?? stories[0],
    [stories, activeId],
  );

  const updateStory = useCallback((id: string, updater: (story: Story) => Story) => {
    setStories((current) => current.map((story) => story.id === id ? updater(story) : story));
  }, []);

  const refreshModels = useCallback(async (quiet = false) => {
    if (!quiet) setConnection("checking");
    try {
      const response = await fetch("/api/models", { cache: "no-store" });
      if (!response.ok) throw new Error("LM Studio no respondió");
      const payload = await response.json() as { data?: ModelOption[]; connected?: boolean };
      const available = payload.data ?? [];
      setModels(available);
      setHasLoadedModel(available.some((model) => model.loaded));
      if (available.length) {
        setSettings((current) => {
          const preferred = available.find((model) => model.loaded)
            ?? available.find((model) => model.id === current.model)
            ?? available.find((model) => model.id === DEFAULT_MODEL)
            ?? available[0];
          return preferred.id === current.model ? current : { ...current, model: preferred.id };
        });
      }
      setConnection(payload.connected === false ? "offline" : "online");
    } catch {
      setConnection("offline");
      setHasLoadedModel(false);
    }
  }, []);

  useEffect(() => {
    const initialProbe = window.setTimeout(() => void refreshModels(), 0);
    return () => window.clearTimeout(initialProbe);
  }, [refreshModels]);

  useEffect(() => {
    const sync = window.setInterval(() => void refreshModels(true), 5000);
    return () => window.clearInterval(sync);
  }, [refreshModels]);

  const switchModel = async (model: string, force = false) => {
    if (!model || (!force && model === settings.model) || generating || modelLoading) return;
    setError("");
    setModelLoading(model);
    try {
      const response = await fetch("/api/models/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(detail?.error || "No se pudo cargar el modelo.");
      }
      setSettings((current) => ({ ...current, model }));
      setConnection("online");
      await refreshModels();
    } catch (caught) {
      setError((caught as Error).message || "No se pudo cambiar el modelo.");
    } finally {
      setModelLoading("");
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: generating ? "auto" : "smooth" });
  }, [activeStory?.messages, generating]);

  const createStory = () => {
    const next = blankStory();
    setStories((current) => [next, ...current]);
    setActiveId(next.id);
    setInput("");
    setSidebarOpen(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const addCharacter = () => {
    if (!activeStory) return;
    updateStory(activeStory.id, (story) => ({ ...story, characters: [...story.characters, blankCharacter()], updatedAt: Date.now() }));
    setNotesTab("personajes");
  };

  const updateCharacter = (characterId: string, patch: Partial<CharacterProfile>) => {
    if (!activeStory) return;
    updateStory(activeStory.id, (story) => ({
      ...story,
      updatedAt: Date.now(),
      characters: story.characters.map((character) => character.id === characterId ? { ...character, ...patch } : character),
    }));
  };

  const deleteCharacter = (characterId: string) => {
    if (!activeStory) return;
    const character = activeStory.characters.find((item) => item.id === characterId);
    if (!character || !window.confirm(`¿Quitar a “${character.name}” de esta historia?`)) return;
    updateStory(activeStory.id, (story) => ({ ...story, characters: story.characters.filter((item) => item.id !== characterId), updatedAt: Date.now() }));
  };

  const deleteStory = (id: string) => {
    const target = stories.find((story) => story.id === id);
    if (!target || !window.confirm(`¿Eliminar “${target.title}”? Esta acción no se puede deshacer.`)) return;
    const remaining = stories.filter((story) => story.id !== id);
    if (!remaining.length) {
      const next = blankStory();
      setStories([next]);
      setActiveId(next.id);
    } else {
      setStories(remaining);
      if (activeId === id) setActiveId(remaining[0].id);
    }
  };

  const appendAssistantDelta = (storyId: string, messageId: string, delta: string) => {
    updateStory(storyId, (story) => ({
      ...story,
      updatedAt: Date.now(),
      messages: story.messages.map((message) => message.id === messageId ? { ...message, content: message.content + delta } : message),
    }));
  };

  const generate = async (text: string) => {
    const story = stories.find((item) => item.id === activeId) ?? stories[0];
    if (!story || generating || !text.trim()) return;
    if (story.id !== activeId) setActiveId(story.id);
    if (modelLoading) {
      setError("Esperá a que termine de cargar el modelo antes de enviar.");
      return;
    }
    if (connection !== "online") {
      setError("LM Studio todavía no está listo. Probá de nuevo en unos segundos.");
      return;
    }
    if (!hasLoadedModel) {
      setError("LM Studio está encendido, pero falta cargar un modelo. Usá “Cargar modelo” en la barra superior.");
      return;
    }

    const narrativeContext = [...story.messages.map((message) => message.content), text].join("\n");
    if (containsSexualMinorContent(narrativeContext)) {
      setError("Tinta Privada genera ficción sexual únicamente entre personajes adultos. Corregí la edad a 18 años o más para continuar.");
      return;
    }

    setError("");
    setGenerating(true);
    setInput("");
    const userMessage: Message = { id: uid(), role: "user", content: text.trim(), createdAt: Date.now() };
    const assistantMessage: Message = { id: uid(), role: "assistant", content: "", createdAt: Date.now() };
    const requestMessages = [...story.messages, userMessage].slice(-28);
    const nextTitle = story.title === "Historia sin título"
      ? text.trim().replace(/\s+/g, " ").slice(0, 48) + (text.trim().length > 48 ? "…" : "")
      : story.title;

    updateStory(story.id, (current) => ({
      ...current,
      title: nextTitle,
      updatedAt: Date.now(),
      messages: [...current.messages, userMessage, assistantMessage],
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: settings.model,
          messages: [
            { role: "system", content: systemPrompt(story) },
            ...requestMessages.map(({ role, content }) => ({ role, content })),
          ],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.text();
        throw new Error(detail || "No se pudo iniciar la generación.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let received = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const event = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const delta = event.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              received = true;
              appendAssistantDelta(story.id, assistantMessage.id, delta);
            }
          } catch {
            // Un evento incompleto se recompone con el siguiente fragmento.
          }
        }
      }

      if (!received) throw new Error("El modelo terminó sin devolver texto.");
      setConnection("online");
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setError((caught as Error).message || "Se perdió la conexión con LM Studio.");
        setConnection("offline");
        updateStory(story.id, (current) => ({
          ...current,
          messages: current.messages.filter((message) => message.id !== assistantMessage.id || message.content.length > 0),
        }));
      }
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  };

  const exportMarkdown = () => {
    if (!activeStory) return;
    const body = activeStory.messages.map((message) => `${message.role === "user" ? "TÚ" : "HISTORIA"}\n\n${message.content}`).join("\n\n---\n\n");
    const cast = activeStory.characters.map((character) => `- **${character.name}**, ${character.age}: ${character.role || character.psychology || "sin descripción"}`).join("\n");
    const header = `# ${activeStory.title}\n\nUniverso: ${activeStory.universe.name}\nModo: ${activeStory.mode === "historia" ? "Relato" : "Roleplay"}\nContinuidad: ${activeStory.scene.continuity === "canon" ? "Canon" : "Sandbox"}\n\n## Premisa\n\n${activeStory.bible.premise}\n\n## Personajes\n\n${cast || activeStory.bible.characters || "Sin fichas."}\n\n## Escena\n\n${activeStory.scene.title}: ${activeStory.scene.situation}\n\n---\n\n`;
    const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeStory.title.replace(/[\\/:*?"<>|]/g, "-") || "historia"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPackage = () => {
    if (!activeStory) return;
    const payload = {
      schema: "tinta-privada-story",
      version: 1,
      exportedAt: new Date().toISOString(),
      story: activeStory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeStory.title.replace(/[\\/:*?"<>|]/g, "-") || "relato"}.tintaprivada.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importPackage = async (file: File) => {
    setError("");
    try {
      const text = await file.text();
      let imported: Story;
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text) as { schema?: string; story?: Partial<Story>; stories?: Partial<Story>[] } | Partial<Story>;
        if ("schema" in parsed && parsed.schema && parsed.schema !== "tinta-privada-story") {
          throw new Error("El paquete pertenece a otra aplicación.");
        }
        const source = "story" in parsed && parsed.story
          ? parsed.story
          : "stories" in parsed && parsed.stories?.length
            ? parsed.stories[0]
            : parsed as Partial<Story>;
        imported = normalizeStory({ ...source, id: uid(), updatedAt: Date.now() });
      } else {
        imported = blankStory();
        imported.title = file.name.replace(/\.(md|txt)$/i, "") || "Universo importado";
        imported.universe.name = imported.title;
        imported.universe.summary = "Material importado para organizar y convertir en canon estructurado.";
        imported.universe.canon = text;
        imported.universe.source = `Archivo local: ${file.name}`;
        imported.updatedAt = Date.now();
      }
      setStories((current) => [imported, ...current]);
      setActiveId(imported.id);
      setNotesTab("universo");
      setSidebarOpen(false);
    } catch {
      setError("No pude leer ese archivo. Usá un paquete .tintaprivada.json, Markdown o texto plano.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const filteredStories = stories
    .filter((story) => story.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  if (!activeStory) return null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Abrir historias">☰</button>
        <div className="brand" aria-label="Tinta Privada, escritura erótica local">
          <span className="brand-mark">T</span>
          <span className="brand-copy"><strong>Tinta Privada</strong><small>Ficción adulta local</small></span>
        </div>
        <div className="topbar-center">
          <div className="connection-state">
            <span className={`status-dot ${connection}`} />
            <span>{connection === "online" ? (hasLoadedModel ? "Listo" : "Sin modelo") : connection === "checking" ? "Comprobando" : "LM Studio apagado"}</span>
            {connection === "offline" && <button className="text-button" onClick={() => void refreshModels()}>Reintentar</button>}
          </div>
          <label className="top-model-picker">
            <span>Modelo</span>
            <select
              value={settings.model}
              disabled={generating || Boolean(modelLoading) || connection === "offline"}
              onChange={(event) => void switchModel(event.target.value)}
              aria-label="Modelo de escritura"
            >
              {models.map((model) => <option key={model.id} value={model.id}>{model.label} · {model.note} · {model.params}</option>)}
            </select>
          </label>
          {modelLoading && <span className="model-loading">Cargando modelo…</span>}
          {connection === "online" && !hasLoadedModel && !modelLoading && (
            <button className="load-model-button" onClick={() => void switchModel(settings.model, true)}>Cargar modelo</button>
          )}
        </div>
        <div className="topbar-actions">
          <input
            ref={importRef}
            type="file"
            hidden
            accept=".json,.md,.txt,.tintaprivada.json,application/json,text/markdown,text/plain"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPackage(file); }}
          />
          <button className="ghost-button" onClick={() => importRef.current?.click()}>Importar</button>
          <button className="ghost-button" onClick={exportPackage}>Paquete</button>
          <button className="ghost-button export-secondary" onClick={exportMarkdown}>Markdown</button>
          <button className="icon-button mobile-only" onClick={() => setNotesOpen(true)} aria-label="Abrir bitácora">◫</button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`story-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="mobile-panel-heading">
            <strong>Mis historias</strong>
            <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Cerrar">×</button>
          </div>
          <button className="new-story" onClick={createStory}><span>＋</span>Nueva historia</button>
          <button className="import-story" onClick={() => importRef.current?.click()}><span>⇩</span> Importar universo</button>
          <label className="search-box">
            <span>⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar historias" />
          </label>
          <div className="story-list">
            {filteredStories.map((story) => (
              <button key={story.id} className={`story-card ${story.id === activeId ? "active" : ""}`} onClick={() => { setActiveId(story.id); setSidebarOpen(false); }}>
                <span className="story-card-top"><strong>{story.title}</strong><em>{story.mode === "historia" ? "H" : "RP"}</em></span>
                <span className="story-preview">{story.messages.at(-1)?.content || "Una página en blanco te espera."}</span>
                <span className="story-meta"><span>{formatRelative(story.updatedAt)}</span><span onClick={(event) => { event.stopPropagation(); deleteStory(story.id); }} role="button" aria-label={`Eliminar ${story.title}`}>Eliminar</span></span>
              </button>
            ))}
          </div>
          <div className="privacy-note"><span>⌂</span><div><strong>Todo queda en este equipo</strong><small>Las historias se guardan en este navegador.</small></div></div>
        </aside>

        {(sidebarOpen || notesOpen) && <button className="backdrop" aria-label="Cerrar panel" onClick={() => { setSidebarOpen(false); setNotesOpen(false); }} />}

        <section className="writing-stage">
          <div className="story-toolbar">
            <input
              className="story-title"
              value={activeStory.title}
              onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, title: event.target.value, updatedAt: Date.now() }))}
              aria-label="Título de la historia"
            />
            <div className="mode-switch" aria-label="Modo de escritura">
              <button className={activeStory.mode === "historia" ? "active" : ""} onClick={() => updateStory(activeStory.id, (story) => ({ ...story, mode: "historia" }))}>Relato</button>
              <button className={activeStory.mode === "roleplay" ? "active" : ""} onClick={() => updateStory(activeStory.id, (story) => ({ ...story, mode: "roleplay" }))}>Roleplay</button>
            </div>
            <button
              className={`continuity-chip ${activeStory.scene.continuity}`}
              onClick={() => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, continuity: story.scene.continuity === "canon" ? "sandbox" : "canon" }, updatedAt: Date.now() }))}
              title="Cambiar continuidad de la escena"
            >
              {activeStory.scene.continuity === "canon" ? "◆ Canon" : "◇ Sandbox"}
            </button>
          </div>

          <div className="manuscript">
            {activeStory.messages.length === 0 ? (
              <div className="empty-state">
                <span className="empty-kicker">PÁGINA EN BLANCO</span>
                <h1>¿Dónde empieza esta historia?</h1>
                <p>Escribí una escena, una premisa o hablale directamente a un personaje. La respuesta aparecerá acá mismo.</p>
                <div className="starter-prompts">
                  <button onClick={() => setInput("Escribí el comienzo de una escena adulta con tensión, atmósfera y deseo gradual...")}>Empezar un relato</button>
                  <button onClick={() => { setInput("Quiero interpretar a mi personaje en un roleplay adulto. Presentá el lugar y dejame decidir sus acciones."); updateStory(activeStory.id, (story) => ({ ...story, mode: "roleplay" })); }}>Abrir roleplay privado</button>
                </div>
              </div>
            ) : (
              <div className="message-list">
                {activeStory.messages.map((message, index) => (
                  <article key={message.id} className={`message ${message.role}`}>
                    <div className="message-label">{message.role === "user" ? "VOS" : activeStory.mode === "roleplay" ? "ESCENA" : "TINTA"}</div>
                    <div className="message-content">{message.content || (generating && index === activeStory.messages.length - 1 ? <span className="thinking"><i /><i /><i /></span> : "")}</div>
                  </article>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="composer-wrap">
            {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}>×</button></div>}
            <div className="quick-actions">
              <button disabled={generating || Boolean(modelLoading) || connection !== "online" || !hasLoadedModel || activeStory.messages.length === 0} onClick={() => void generate("Continuá desde el punto exacto en que quedó la escena, sin resumir ni reiniciar.")}>Continuar</button>
              <button disabled={generating || Boolean(modelLoading) || connection !== "online" || !hasLoadedModel || activeStory.messages.length === 0} onClick={() => void generate("Reescribí el último pasaje con más atmósfera, detalle sensorial y naturalidad.")}>Más atmósfera</button>
              <button disabled={generating || Boolean(modelLoading) || connection !== "online" || !hasLoadedModel || activeStory.messages.length === 0} onClick={() => void generate("Introducí un giro coherente pero inesperado que haga avanzar la escena.")}>Dar un giro</button>
            </div>
            <div className="composer">
              <textarea
                ref={composerRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void generate(input);
                  }
                }}
                placeholder={modelLoading ? "El modelo está cargando; podés ir escribiendo…" : activeStory.mode === "roleplay" ? "¿Qué dice o hace tu personaje?" : "Escribí una escena, una indicación o el próximo párrafo…"}
                rows={2}
              />
              {generating ? (
                <button className="send-button stop" onClick={() => abortRef.current?.abort()} aria-label="Detener generación">■</button>
              ) : (
                <button className="send-button" disabled={!input.trim() || Boolean(modelLoading) || connection !== "online" || !hasLoadedModel} onClick={() => void generate(input)} aria-label="Enviar">↑</button>
              )}
            </div>
            <div className="composer-hint"><span>Enter para enviar · Shift + Enter para nueva línea</span><span>{settings.maxTokens} tokens máx.</span></div>
          </div>
        </section>

        <aside className={`notes-panel ${notesOpen ? "open" : ""}`}>
          <div className="panel-heading">
            <div><span>TINTA PRIVADA</span><strong>{activeStory.universe.name || "Universo sin nombre"}</strong></div>
            <button className="icon-button mobile-only" onClick={() => setNotesOpen(false)} aria-label="Cerrar">×</button>
          </div>
          <div className="notes-tabs" role="tablist" aria-label="Biblia narrativa">
            {([
              ["universo", "Mundo"],
              ["personajes", `Personajes${activeStory.characters.length ? ` · ${activeStory.characters.length}` : ""}`],
              ["escena", activeStory.scene.continuity === "canon" ? "Escena ◆" : "Escena ◇"],
              ["memoria", "Memoria"],
            ] as Array<[NotesTab, string]>).map(([tab, label]) => (
              <button key={tab} className={notesTab === tab ? "active" : ""} onClick={() => setNotesTab(tab)} role="tab" aria-selected={notesTab === tab}>{label}</button>
            ))}
          </div>
          <div className="notes-scroll">
            {notesTab === "universo" && <div className="tab-stack">
              <label className="field-label">Nombre del universo<input value={activeStory.universe.name} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, universe: { ...story.universe, name: event.target.value }, updatedAt: Date.now() }))} placeholder="Warhammer, mundo propio…" /></label>
              <label className="field-label">Premisa de esta historia<textarea value={activeStory.bible.premise} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, bible: { ...story.bible, premise: event.target.value }, updatedAt: Date.now() }))} placeholder="¿Qué historia estamos contando dentro de este universo?" rows={3} /></label>
              <label className="field-label">Resumen del mundo<textarea value={activeStory.universe.summary} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, universe: { ...story.universe, summary: event.target.value }, updatedAt: Date.now() }))} placeholder="Época, facciones, conflicto general…" rows={3} /></label>
              <label className="field-label">Canon y hechos inamovibles<textarea value={activeStory.universe.canon} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, universe: { ...story.universe, canon: event.target.value }, updatedAt: Date.now() }))} placeholder="Pegá acá material exportado de tus proyectos o hechos que no deben contradecirse." rows={7} /></label>
              <label className="field-label">Reglas del mundo<textarea value={activeStory.universe.rules} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, universe: { ...story.universe, rules: event.target.value }, updatedAt: Date.now() }))} placeholder="Qué es posible, tecnología, magia, jerarquías…" rows={4} /></label>
              <label className="field-label">Tono<input value={activeStory.universe.tone} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, universe: { ...story.universe, tone: event.target.value }, updatedAt: Date.now() }))} placeholder="Íntimo, grimdark, sensual, político…" /></label>
              <label className="field-label">Origen<input value={activeStory.universe.source} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, universe: { ...story.universe, source: event.target.value }, updatedAt: Date.now() }))} placeholder="Proyecto de ChatGPT, archivo local…" /></label>
            </div>}

            {notesTab === "personajes" && <div className="tab-stack">
              <div className="section-intro"><p>Fichas psicológicas separadas del texto libre. La edad adulta es obligatoria.</p><button onClick={addCharacter}>＋ Personaje</button></div>
              {activeStory.characters.length === 0 && <div className="panel-empty"><strong>Todavía no hay fichas.</strong><span>Podés importar notas antiguas abajo o crear el primer personaje.</span></div>}
              {activeStory.characters.map((character, index) => (
                <details className="character-editor" key={character.id} open={index === 0}>
                  <summary><span>{character.name || "Sin nombre"}</span><em>{character.age} años</em></summary>
                  <div className="character-fields">
                    <div className="field-grid two"><label className="field-label">Nombre<input value={character.name} onChange={(event) => updateCharacter(character.id, { name: event.target.value })} /></label><label className="field-label">Edad<input type="number" min="18" max="300" value={character.age} onChange={(event) => updateCharacter(character.id, { age: Math.max(18, Number(event.target.value) || 18) })} /></label></div>
                    <label className="field-label">Rol en la historia<input value={character.role} onChange={(event) => updateCharacter(character.id, { role: event.target.value })} placeholder="Protagonista, inquisidora, rival…" /></label>
                    <label className="field-label">Apariencia<textarea value={character.appearance} onChange={(event) => updateCharacter(character.id, { appearance: event.target.value })} rows={2} /></label>
                    <label className="field-label">Psicología y contradicciones<textarea value={character.psychology} onChange={(event) => updateCharacter(character.id, { psychology: event.target.value })} placeholder="Rasgos, apego, defensas, contradicciones…" rows={4} /></label>
                    <label className="field-label">Deseo visible<textarea value={character.visibleDesire} onChange={(event) => updateCharacter(character.id, { visibleDesire: event.target.value })} rows={2} /></label>
                    <label className="field-label">Necesidad oculta<textarea value={character.hiddenNeed} onChange={(event) => updateCharacter(character.id, { hiddenNeed: event.target.value })} rows={2} /></label>
                    <label className="field-label">Miedo o mecanismo de defensa<textarea value={character.fear} onChange={(event) => updateCharacter(character.id, { fear: event.target.value })} rows={2} /></label>
                    <label className="field-label">Voz y forma de hablar<textarea value={character.voice} onChange={(event) => updateCharacter(character.id, { voice: event.target.value })} rows={2} /></label>
                    <label className="field-label">Relaciones actuales<textarea value={character.relationship} onChange={(event) => updateCharacter(character.id, { relationship: event.target.value })} rows={3} /></label>
                    <label className="field-label">Límites del personaje<textarea value={character.boundaries} onChange={(event) => updateCharacter(character.id, { boundaries: event.target.value })} placeholder="Qué acepta, qué rechaza, qué requiere conversación…" rows={3} /></label>
                    <button className="danger-text" onClick={() => deleteCharacter(character.id)}>Quitar personaje</button>
                  </div>
                </details>
              ))}
              <label className="field-label legacy-field">Notas generales o reparto importado<textarea value={activeStory.bible.characters} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, bible: { ...story.bible, characters: event.target.value }, updatedAt: Date.now() }))} placeholder="Texto libre conservado de la versión anterior." rows={5} /></label>
            </div>}

            {notesTab === "escena" && <div className="tab-stack">
              <div className="continuity-selector">
                <button className={activeStory.scene.continuity === "canon" ? "active" : ""} onClick={() => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, continuity: "canon" }, updatedAt: Date.now() }))}><strong>◆ Canon</strong><span>Puede dejar consecuencias.</span></button>
                <button className={activeStory.scene.continuity === "sandbox" ? "active" : ""} onClick={() => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, continuity: "sandbox" }, updatedAt: Date.now() }))}><strong>◇ Sandbox</strong><span>No altera la historia principal.</span></button>
              </div>
              <label className="field-label">Título de escena<input value={activeStory.scene.title} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, title: event.target.value }, updatedAt: Date.now() }))} /></label>
              <div className="field-grid two"><label className="field-label">Lugar<input value={activeStory.scene.place} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, place: event.target.value }, updatedAt: Date.now() }))} /></label><label className="field-label">Momento<input value={activeStory.scene.time} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, time: event.target.value }, updatedAt: Date.now() }))} /></label></div>
              <label className="field-label">Atmósfera<input value={activeStory.scene.atmosphere} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, atmosphere: event.target.value }, updatedAt: Date.now() }))} /></label>
              <label className="field-label">Participantes<input value={activeStory.scene.participants} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, participants: event.target.value }, updatedAt: Date.now() }))} placeholder="Quiénes están realmente presentes" /></label>
              <label className="field-label">Situación actual<textarea value={activeStory.scene.situation} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, situation: event.target.value }, updatedAt: Date.now() }))} rows={4} /></label>
              <label className="field-label">Intención dramática<textarea value={activeStory.scene.intent} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, intent: event.target.value }, updatedAt: Date.now() }))} placeholder="Qué querés explorar, no necesariamente qué debe ocurrir." rows={3} /></label>
              <label className="field-label">Quién sabe qué<textarea value={activeStory.scene.knownFacts} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, knownFacts: event.target.value }, updatedAt: Date.now() }))} placeholder="Secretos, malentendidos, información desigual…" rows={3} /></label>
              <label className="field-label">Límites de esta escena<textarea value={activeStory.scene.boundaries} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, scene: { ...story.scene, boundaries: event.target.value }, updatedAt: Date.now() }))} rows={3} /></label>
            </div>}

            {notesTab === "memoria" && <div className="tab-stack">
              <label className="field-label">Voz y estilo<textarea value={activeStory.bible.style} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, bible: { ...story.bible, style: event.target.value }, updatedAt: Date.now() }))} placeholder="Primera persona, ritmo lento, tono oscuro…" rows={4} /></label>
              <label className="field-label">Memoria canónica fijada<textarea value={activeStory.bible.memory} onChange={(event) => updateStory(activeStory.id, (story) => ({ ...story, bible: { ...story.bible, memory: event.target.value }, updatedAt: Date.now() }))} placeholder="Hechos confirmados que el modelo no debe olvidar." rows={8} /></label>
              <div className="memory-rule"><strong>Regla de continuidad</strong><p>Las escenas sandbox se mantienen separadas. Sólo copiás sus consecuencias a esta memoria cuando decidís convertirlas en canon.</p></div>
            </div>}

            <div className="settings-section">
              <div className="section-title"><span>RESPUESTA</span><button onClick={() => void refreshModels()} title="Actualizar conexión">↻</button></div>
              <label className="range-row"><span>Creatividad <b>{settings.temperature.toFixed(1)}</b></span><input type="range" min="0.2" max="1.4" step="0.1" value={settings.temperature} onChange={(event) => setSettings((current) => ({ ...current, temperature: Number(event.target.value) }))} /></label>
              <label className="range-row"><span>Extensión <b>{settings.maxTokens}</b></span><input type="range" min="200" max="1200" step="100" value={settings.maxTokens} onChange={(event) => setSettings((current) => ({ ...current, maxTokens: Number(event.target.value) }))} /></label>
            </div>
          </div>
          <div className="local-note"><span>●</span><p>Procesamiento local · Sin nube · Historias guardadas en este navegador</p></div>
        </aside>
      </div>
    </main>
  );
}
