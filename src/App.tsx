import { useRef, useState } from "react";
import {
  Excalidraw,
  Footer,
  Sidebar,
  WelcomeScreen,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

export default function App() {
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [mode, setMode] = useState<"agent" | "assistant">("agent");
  const [pulsing, setPulsing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleIdeate = async () => {
    const api = excalidrawRef.current;
    if (!api || isLoading) return;

    setIsLoading(true);
    setPulsing(true);

    try {
      // 1. Extract canvas content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elements = (api.getSceneElements() as any[]).filter((el) => !el.isDeleted);
      const texts: string[] = elements
        .filter((el) => el.type === "text")
        .map((el) => el.text as string)
        .filter(Boolean);

      const userMessage =
        texts.length > 0
          ? `Canvas content:\n${texts.join("\n")}`
          : "The canvas is empty. Generate a starting idea for a brainstorming session.";

      // 2. Call local Ollama LLM
      const ollamaUrl = import.meta.env.VITE_OLLAMA_URL ?? "http://localhost:11434";
      const model = import.meta.env.VITE_OLLAMA_MODEL ?? "gemma3:270m";

      const payload = {
        model,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content:
              "You are a creative collaborator on a brainstorming canvas. Based on the existing ideas, generate one short, new contribution (max 8 words) that is thematically related and adds value. Respond with only the idea text, no explanation, no special characters.",
          },
          { role: "user", content: userMessage },
        ],
      };
      console.log("[Ideate] →", payload);

      const response = await fetch(`${ollamaUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
      const data = await response.json();
      console.log("[Ideate] ←", data);
      const generatedIdea: string =
        data.choices?.[0]?.message?.content?.trim() ?? "New idea";

      // 3. Compute position: right of rightmost existing rectangle
      const rects = elements.filter((el) => el.type === "rectangle");
      const newX =
        rects.length > 0
          ? Math.max(...rects.map((el) => el.x + el.width)) + 40
          : 100;
      const avgY =
        rects.length > 0
          ? rects.reduce((sum: number, el) => sum + el.y, 0) / rects.length
          : 200;

      // 4. Create rectangle + bound text element
      const rectId = crypto.randomUUID();
      const textId = crypto.randomUUID();
      const now = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRect: any = {
        id: rectId,
        type: "rectangle",
        x: newX + 10,
        y: avgY + 10,
        width: 200,
        height: 100,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "#d0f0fd",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: { type: 3 },
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: [{ type: "text", id: textId }],
        updated: now,
        link: null,
        locked: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newText: any = {
        id: textId,
        type: "text",
        x: newX + 10,
        y: avgY + 10,
        width: 200,
        height: 100,
        angle: 0,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: null,
        updated: now,
        link: null,
        locked: false,
        text: generatedIdea,
        fontSize: 16,
        fontFamily: 1,
        textAlign: "center",
        verticalAlign: "middle",
        containerId: rectId,
        originalText: generatedIdea,
        autoResize: true,
        lineHeight: 1.25,
      };

      const scene = api.getSceneElements();
      api.updateScene({ elements: [...scene, newRect, newText] });
    } catch (err) {
      console.error("Ideate failed:", err);
      alert(`Ideate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setPulsing(false), 400);
    }
  };

  const addStickyNote = () => {
    const api = excalidrawRef.current;
    if (!api) return;
    const scene = api.getSceneElements();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newElement: any = {
      id: crypto.randomUUID(),
      type: "rectangle",
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 220,
      height: 120,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "#fff3a3",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      seed: Math.floor(Math.random() * 1000000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000),
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
    };
    api.updateScene({
      elements: [...scene, newElement],
    });
  };

  const clearBoard = () => {
    excalidrawRef.current?.updateScene({ elements: [] });
  };

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 12,
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: "#e8e8e8",
            borderRadius: 20,
            padding: 3,
            cursor: "pointer",
            userSelect: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        >
          <div
            onClick={() => setMode("agent")}
            className={mode === "agent" ? "agent-pulsing" : undefined}
            style={{
              padding: "6px 16px",
              borderRadius: 17,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              backgroundColor: mode === "agent" ? "#7248d1" : "transparent",
              color: mode === "agent" ? "#fff" : "#555",
              transition: mode === "agent" ? undefined : "all 0.2s ease",
            }}
          >
            Agent
          </div>
          <div
            onClick={() => setMode("assistant")}
            style={{
              padding: "6px 16px",
              borderRadius: 17,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              backgroundColor: mode === "assistant" ? "#7248d1" : "transparent",
              color: mode === "assistant" ? "#fff" : "#555",
              transition: "all 0.2s ease",
            }}
          >
            Assistant
          </div>
        </div>
        <button
          onClick={mode === "assistant" ? handleIdeate : undefined}
          disabled={mode !== "assistant" || isLoading}
          style={{
            padding: "8px 20px",
            borderRadius: 20,
            border: "none",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            backgroundColor:
              mode !== "assistant"
                ? "#ccc"
                : pulsing
                  ? "#9b6eef"
                  : "#7248d1",
            color: mode !== "assistant" ? "#888" : "#fff",
            cursor: mode === "assistant" && !isLoading ? "pointer" : "default",
            boxShadow:
              pulsing && mode === "assistant"
                ? "0 0 16px 6px rgba(114, 72, 209, 0.6)"
                : "0 1px 3px rgba(0,0,0,0.15)",
            transform: pulsing && mode === "assistant" ? "scale(1.1)" : "scale(1)",
            transition: "all 0.3s ease",
          }}
        >
          {isLoading ? "Thinking…" : "Ideate!"}
        </button>
      </div>
      <Excalidraw
        excalidrawAPI={(api) => {
          excalidrawRef.current = api;
        }}
        onChange={(elements, _appState, files) => {
          localStorage.setItem(
            "my-scene",
            JSON.stringify({ elements, files })
          );
        }}
        initialData={(() => {
          try {
            const saved = localStorage.getItem("my-scene");
            if (!saved) return undefined;
            const { elements, files } = JSON.parse(saved);
            return { elements, files };
          } catch {
            return undefined;
          }
        })()}
      >
        <WelcomeScreen />
        <Sidebar name="my-tools">
          <div style={{ padding: 12 }}>
            <h3>My Tools</h3>
            <button onClick={addStickyNote}>Add sticky note</button>
            <button onClick={clearBoard} style={{ marginLeft: 8 }}>
              Clear board
            </button>
          </div>
        </Sidebar>
        <Footer>
          <div style={{ display: "flex", gap: 8, padding: 8 }}>
            <button onClick={addStickyNote}>Quick sticky</button>
            <button onClick={clearBoard}>Reset</button>
          </div>
        </Footer>
      </Excalidraw>
    </div>
  );
}
