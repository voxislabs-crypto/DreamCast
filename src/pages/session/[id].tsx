import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { PlayerActionResponse, Scene, SessionStatus } from "@/types";
import styles from "./[id].module.css";

// ── Components ────────────────────────────────────────────────────────────────

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className={styles.videoWrapper}>
      <video
        key={url}
        className={styles.video}
        autoPlay
        muted
        playsInline
        controls
      >
        <source src={url} />
        Your browser does not support video playback.
      </video>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Scene["outcome"] }) {
  if (!outcome) return null;
  return (
    <div className={`${styles.outcome} ${outcome.success ? styles.success : styles.failure}`}>
      <span className={styles.outcomeIcon}>{outcome.success ? "✓" : "✗"}</span>
      <span>{outcome.explanation}</span>
    </div>
  );
}

function ChoicePanel({
  choices,
  onChoose,
  disabled,
}: {
  choices: Scene["choices"];
  onChoose: (input: string, choiceId?: string) => void;
  disabled: boolean;
}) {
  const [customInput, setCustomInput] = useState("");

  return (
    <div className={styles.choicePanel}>
      <p className={styles.choiceHint}>What do you do?</p>
      <div className={styles.choiceButtons}>
        {choices.map((c) => (
          <button
            key={c.id}
            className={styles.choiceBtn}
            onClick={() => onChoose(c.label, c.id)}
            disabled={disabled}
          >
            {c.label}
            {c.hint && <span className={styles.choiceHintText}> — {c.hint}</span>}
          </button>
        ))}
      </div>

      <div className={styles.customRow}>
        <input
          className={styles.customInput}
          placeholder="Or type your own action…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customInput.trim()) {
              onChoose(customInput.trim());
              setCustomInput("");
            }
          }}
          disabled={disabled}
          maxLength={200}
        />
        <button
          className={styles.sendBtn}
          onClick={() => {
            if (customInput.trim()) {
              onChoose(customInput.trim());
              setCustomInput("");
            }
          }}
          disabled={disabled || !customInput.trim()}
        >
          →
        </button>
      </div>
    </div>
  );
}

// ── Session page ──────────────────────────────────────────────────────────────

export default function SessionPage() {
  const router = useRouter();
  const { id: sessionId } = router.query as { id: string };

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("active");
  const [clipsUsed, setClipsUsed] = useState(0);
  const [clipsRemaining, setClipsRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the opening scene from sessionStorage (set by dashboard)
  useEffect(() => {
    if (!router.isReady) return;
    const raw = sessionStorage.getItem("openingScene");
    if (raw) {
      const data: PlayerActionResponse = JSON.parse(raw);
      setScenes([data.scene]);
      setSessionStatus(data.sessionStatus);
      setClipsUsed(data.clipsUsed);
      setClipsRemaining(data.clipsRemaining);
      sessionStorage.removeItem("openingScene");
    }
  }, [router.isReady]);

  // Auto-scroll to latest scene
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scenes]);

  async function handleAction(input: string, choiceId?: string) {
    if (!sessionId || sessionId === "new") return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo-user", input, choiceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to process action");
      }

      const data: PlayerActionResponse = await res.json();
      setScenes((prev) => [...prev, data.scene]);
      setSessionStatus(data.sessionStatus);
      setClipsUsed(data.clipsUsed);
      setClipsRemaining(data.clipsRemaining);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const latestScene = scenes[scenes.length - 1];
  const isActive = sessionStatus === "active";

  return (
    <>
      <Head>
        <title>Session – EdgeDream</title>
      </Head>

      <main className={styles.main}>
        {/* Header bar */}
        <header className={styles.header}>
          <span className={styles.logo}>EdgeDream</span>
          <div className={styles.sessionMeta}>
            <span className={styles.metaBadge}>
              Scene {scenes.length}
            </span>
            {clipsRemaining > 0 && (
              <span className={styles.metaBadge}>
                {clipsRemaining} clips left
              </span>
            )}
            <span className={`${styles.statusBadge} ${styles[sessionStatus]}`}>
              {sessionStatus.replace("_", " ")}
            </span>
          </div>
        </header>

        {/* Scene feed */}
        <div className={styles.sceneFeed}>
          {scenes.map((scene) => (
            <div key={scene.id} className={styles.sceneCard}>
              {scene.videoUrl && <VideoPlayer url={scene.videoUrl} />}
              <OutcomeBadge outcome={scene.outcome} />
              <p className={styles.narrative}>{scene.narrativeText}</p>
            </div>
          ))}

          {loading && (
            <div className={styles.loadingCard}>
              <div className={styles.spinner} />
              <p>Generating next scene…</p>
            </div>
          )}

          {/* Game over / completed */}
          {(sessionStatus === "game_over" || sessionStatus === "completed") && (
            <div className={styles.endCard}>
              <h2>{sessionStatus === "game_over" ? "💀 Game Over" : "🏁 Adventure Complete"}</h2>
              <p>
                {sessionStatus === "game_over"
                  ? "Your luck ran out. But every legend gets a second chance."
                  : "You've reached the end of this chapter."}
              </p>
              <button
                className={styles.reloadBtn}
                onClick={() => router.push("/dashboard")}
              >
                Start New Adventure
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Choice panel */}
        {isActive && latestScene && !loading && (
          <ChoicePanel
            choices={latestScene.choices}
            onChoose={handleAction}
            disabled={loading}
          />
        )}

        {error && <p className={styles.error}>{error}</p>}
      </main>
    </>
  );
}
