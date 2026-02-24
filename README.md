# EdgeDream

**EdgeDream** is an AI-powered, choose-your-own-adventure interactive storytelling platform. Stop watching stories — *live them*. Pick a genre, build your avatar, and experience a real-time cinematic adventure where every choice you make shapes what happens next.

---

## Features

- **Live LLM Narration** — Second-person scene generation with long-context continuity across scenes, powered by any OpenAI-compatible API (OpenAI GPT-4o, xAI Grok, etc.)
- **Consequence & Probability Engine** — Deterministic outcome calculation based on avatar skills, environmental modifiers, and inferred action type. Results feel earned, not random.
- **Video Clip Chaining** — 5–10 second clips generated via Replicate or Runway, chained frame-to-frame for visual continuity.
- **Content Moderation** — All player inputs and LLM outputs are checked against the OpenAI Moderation API and a local blocklist before processing.
- **Subscription Tiers** — Free / Basic ($9/mo) / Premium ($19/mo) / Ultra ($29/mo), with enforced clip and session limits per tier.
- **Branching Choices** — 2–3 suggested options per scene, or go fully off-script with free-text input.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, CSS Modules |
| Narration | OpenAI / xAI Grok (OpenAI-compatible chat completions) |
| Video | Replicate (Kling/Luma models) or Runway Gen-3 |
| Session store | In-memory (dev) / Supabase or Firestore (production) |
| Billing | Stripe |
| Auth | NextAuth.js |
| Voice input | Web Speech API + OpenAI Whisper (planned) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (React / Next.js)                                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Landing  │  │  Dashboard   │  │ Session page │                  │
│  │  page    │  │ (genre/avatar│  │ (scene feed +│                  │
│  └──────────┘  │  setup)      │  │  choice panel│                  │
│                └──────────────┘  └──────────────┘                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ fetch()
┌───────────────────────────▼─────────────────────────────────────────┐
│  Next.js API Routes                                                 │
│  POST /api/sessions           → create session + opening scene      │
│  GET  /api/sessions/[id]      → fetch session state                 │
│  POST /api/sessions/[id]/action → process player action             │
└──────┬──────────────────────────────┬──────────────────────────────┘
       │                              │
┌──────▼──────────┐        ┌──────────▼───────────┐
│ Content         │        │  Consequence Engine   │
│ Moderation      │        │  (avatar skills +     │
│ (blocklist +    │        │   env tags → outcome) │
│  OpenAI API)    │        └──────────┬────────────┘
└─────────────────┘                  │
                            ┌────────▼────────────┐
                            │  LLM Narrator        │
                            │  (OpenAI / Grok API) │
                            └────────┬────────────┘
                                     │
                            ┌────────▼────────────┐
                            │  Video Gen Service   │
                            │  (Replicate / Runway)│
                            └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- An OpenAI API key (or xAI Grok key with compatible base URL)
- Optionally: Replicate API token + video model version for video generation

### Setup

```bash
git clone https://github.com/voxislabs-crypto/DreamCast
cd DreamCast
npm install

# Copy and fill in your environment variables
cp .env.example .env.local
```

Edit `.env.local` with your API keys (see `.env.example` for all options).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm test
```

---

## Project Structure

```
src/
├── __tests__/                 Unit tests
│   ├── consequenceEngine.test.ts
│   ├── contentModeration.test.ts
│   ├── sessionStore.test.ts
│   └── videoGen.test.ts
├── lib/
│   ├── consequenceEngine.ts   Probability & outcome resolution
│   ├── contentModeration.ts   Input/output safety checks
│   ├── narrator.ts            LLM-powered scene generation
│   ├── sessionStore.ts        Session persistence adapter
│   └── videoGen.ts            Short video clip generation
├── pages/
│   ├── index.tsx              Landing page
│   ├── dashboard.tsx          Genre + avatar setup
│   ├── session/[id].tsx       Live session page
│   └── api/
│       └── sessions/          REST API routes
└── types/
    └── index.ts               Core domain types
```

---

## Subscription Tiers

| Tier | Price | Clips/session | Session length | Video | Voice | Cross-session memory |
|---|---|---|---|---|---|---|
| Free | $0 | 2 | 5 min | ✗ | ✗ | ✗ |
| Basic | $9/mo | 10 | 10 min | ✓ | ✓ | ✗ |
| Premium | $19/mo | 20 | 20 min | ✓ | ✓ | ✓ |
| Ultra | $29/mo | 50 | 60 min | ✓ | ✓ | ✓ |

---

## Content Moderation

All player inputs and generated narrative text pass through two layers before use:

1. **Synchronous blocklist** — hardcoded patterns for the most severe categories, zero latency, no API call required.
2. **OpenAI Moderation API** — semantic classification across all standard harm categories.

The platform defaults to general-audience content. Inputs that fail moderation return a `422` error with the flagged categories listed.

