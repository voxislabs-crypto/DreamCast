import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import type { Avatar, Genre, SubscriptionTier } from "@/types";
import styles from "./dashboard.module.css";

const GENRES: { id: Genre; label: string; emoji: string }[] = [
  { id: "fantasy", label: "Fantasy Quest", emoji: "⚔️" },
  { id: "mystery", label: "Mystery", emoji: "🔍" },
  { id: "sci-fi", label: "Sci-Fi", emoji: "🚀" },
  { id: "adventure", label: "Adventure", emoji: "🗺️" },
  { id: "romance", label: "Romance", emoji: "💫" },
  { id: "thriller", label: "Thriller", emoji: "🎭" },
];

const DEFAULT_AVATAR: Avatar = {
  name: "Hero",
  appearance: "A determined traveller with sharp eyes and a weathered coat.",
  skills: { agility: 60, intelligence: 65, charisma: 55, strength: 50 },
  inventory: [],
};

export default function Dashboard() {
  const router = useRouter();
  const preselectedGenre = (router.query.genre as Genre) ?? "fantasy";

  const [genre, setGenre] = useState<Genre>(preselectedGenre);
  const [customScenario, setCustomScenario] = useState("");
  const [avatar, setAvatar] = useState<Avatar>(DEFAULT_AVATAR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startSession() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user", // replace with real auth user id
          genre,
          customScenario: customScenario || undefined,
          avatar,
          tier: "free" as SubscriptionTier,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start session");
      }

      // The session ID is embedded in the response — we need to fetch it
      // from a GET to the sessions list; for now redirect to a fixed path
      // and let the session page load by ID from query string.
      const data = await res.json();
      // Store the first scene in sessionStorage for the session page to pick up
      sessionStorage.setItem("openingScene", JSON.stringify(data));
      await router.push(`/session/new?genre=${genre}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Dashboard – EdgeDream</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Create Your Story</h1>

        {/* Genre selector */}
        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Choose Your Genre</h2>
          <div className={styles.genreGrid}>
            {GENRES.map((g) => (
              <button
                key={g.id}
                className={`${styles.genreBtn} ${genre === g.id ? styles.selected : ""}`}
                onClick={() => setGenre(g.id)}
              >
                <span className={styles.genreEmoji}>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Custom scenario */}
        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>
            Custom Scenario <span className={styles.optional}>(optional)</span>
          </h2>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder='e.g. "I'm an archaeologist uncovering a cursed temple in the Amazon…"'
            value={customScenario}
            onChange={(e) => setCustomScenario(e.target.value)}
            maxLength={300}
          />
          <p className={styles.charCount}>{customScenario.length}/300</p>
        </section>

        {/* Avatar */}
        <section className={styles.section}>
          <h2 className={styles.sectionLabel}>Your Avatar</h2>
          <div className={styles.avatarGrid}>
            <label className={styles.fieldLabel}>
              Name
              <input
                className={styles.input}
                value={avatar.name}
                onChange={(e) => setAvatar({ ...avatar, name: e.target.value })}
                maxLength={30}
              />
            </label>
            <label className={styles.fieldLabel}>
              Appearance
              <input
                className={styles.input}
                value={avatar.appearance}
                onChange={(e) => setAvatar({ ...avatar, appearance: e.target.value })}
                maxLength={100}
              />
            </label>
          </div>

          <div className={styles.skillsGrid}>
            {(["agility", "intelligence", "charisma", "strength"] as const).map((skill) => (
              <label key={skill} className={styles.fieldLabel}>
                {skill.charAt(0).toUpperCase() + skill.slice(1)}{" "}
                <span className={styles.skillValue}>{avatar.skills[skill]}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={avatar.skills[skill]}
                  onChange={(e) =>
                    setAvatar({
                      ...avatar,
                      skills: { ...avatar.skills, [skill]: parseInt(e.target.value) },
                    })
                  }
                  className={styles.slider}
                />
              </label>
            ))}
          </div>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.startButton}
          onClick={startSession}
          disabled={loading}
        >
          {loading ? "Generating opening scene…" : "Jack In →"}
        </button>
      </main>
    </>
  );
}
