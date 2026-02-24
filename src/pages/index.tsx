import Head from "next/head";
import Link from "next/link";
import styles from "./index.module.css";

const GENRES = [
  { id: "fantasy", label: "⚔️ Fantasy Quest", desc: "Ancient ruins, enchanted forests, mythical creatures." },
  { id: "mystery", label: "🔍 Mystery Detective", desc: "Clues, suspects, and a city full of secrets." },
  { id: "sci-fi", label: "🚀 Sci-Fi Explorer", desc: "Distant worlds, advanced tech, the unknown frontier." },
  { id: "adventure", label: "🗺️ Epic Adventure", desc: "Uncharted territory, daring escapes, hidden treasures." },
  { id: "romance", label: "💫 Romantic Journey", desc: "Connections, drama, and heart-racing moments." },
  { id: "thriller", label: "🎭 Thriller", desc: "High stakes, twists, and edge-of-your-seat tension." },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>EdgeDream – Live Your Story</title>
        <meta name="description" content="AI-powered interactive storytelling. You are the star." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <h1 className={styles.heroTitle}>
            Edge<span className={styles.accent}>Dream</span>
          </h1>
          <p className={styles.heroTagline}>
            Stop watching stories. <strong>Live them.</strong>
          </p>
          <p className={styles.heroSub}>
            AI-powered choose-your-own-adventure with real-time narration and
            cinematic video clips — you're the star, every choice matters.
          </p>
          <Link href="/dashboard" className={styles.ctaButton}>
            Start Your Story →
          </Link>
        </section>

        {/* Genre preview */}
        <section className={styles.genreSection}>
          <h2 className={styles.sectionTitle}>Pick Your World</h2>
          <div className={styles.genreGrid}>
            {GENRES.map((g) => (
              <Link key={g.id} href={`/dashboard?genre=${g.id}`} className={styles.genreCard}>
                <span className={styles.genreLabel}>{g.label}</span>
                <span className={styles.genreDesc}>{g.desc}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className={styles.howSection}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <ol className={styles.stepList}>
            <li>
              <span className={styles.stepNum}>1</span>
              <div>
                <strong>Pick a genre & create your avatar</strong>
                <p>Choose your world, name your character, assign your skills.</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNum}>2</span>
              <div>
                <strong>The AI narrator sets the scene</strong>
                <p>Vivid second-person prose drops you straight into the action.</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNum}>3</span>
              <div>
                <strong>Make choices — or go off-script</strong>
                <p>Pick from suggested branches or type anything you want to do.</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNum}>4</span>
              <div>
                <strong>Watch your decision come to life</strong>
                <p>A short video clip renders your exact choice in real time.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* Pricing */}
        <section className={styles.pricingSection}>
          <h2 className={styles.sectionTitle}>Plans</h2>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <h3>Free</h3>
              <p className={styles.price}>$0</p>
              <ul>
                <li>Text narration</li>
                <li>2 clips per session</li>
                <li>5-minute sessions</li>
                <li>3 genre presets</li>
              </ul>
              <Link href="/dashboard" className={styles.planButton}>
                Get Started
              </Link>
            </div>
            <div className={`${styles.pricingCard} ${styles.featured}`}>
              <h3>Basic</h3>
              <p className={styles.price}>$9<span>/mo</span></p>
              <ul>
                <li>Full video clips</li>
                <li>10 clips per session</li>
                <li>10-minute sessions</li>
                <li>All genres + custom</li>
                <li>Voice input</li>
              </ul>
              <Link href="/dashboard" className={styles.planButtonFeatured}>
                Start Free Trial
              </Link>
            </div>
            <div className={styles.pricingCard}>
              <h3>Premium</h3>
              <p className={styles.price}>$19<span>/mo</span></p>
              <ul>
                <li>Everything in Basic</li>
                <li>Cross-session memory</li>
                <li>Avatar customisation</li>
                <li>20 clips / session</li>
                <li>Priority queue</li>
              </ul>
              <Link href="/dashboard" className={styles.planButton}>
                Upgrade
              </Link>
            </div>
            <div className={styles.pricingCard}>
              <h3>Ultra</h3>
              <p className={styles.price}>$29<span>/mo</span></p>
              <ul>
                <li>Everything in Premium</li>
                <li>50 clips / session</li>
                <li>60-minute sessions</li>
                <li>Community gallery</li>
                <li>Early model access</li>
              </ul>
              <Link href="/dashboard" className={styles.planButton}>
                Upgrade
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
