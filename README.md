# DreamCast / EdgeDream

DreamCast is a cost-aware interactive storytelling platform where players shape cinematic, choose-your-own-adventure sessions through text-driven actions. The current scaffold, branded in-app as EdgeDream, includes live narration, deterministic consequence scoring, optional short video generation, content moderation, and subscription-tier limits.

The architecture is designed around one core operating rule: do not spend expensive AI video budget on every turn. DreamCast should feel cinematic through narration, pacing, and selective rendering, not constant brute-force generation.

## Current Capabilities

- Live second-person narration through an OpenAI-compatible chat API.
- DeepInfra/DeepSeek-class narration support through `NARRATION_BASE_URL`.
- Consequence engine that scores actions using avatar skills, environment tags, and inferred action type.
- Director layer that decides whether each scene should be text-only, ambient, animated-still, or full video.
- Optional video generation through SiliconFlow, Replicate, or Runway.
- Previous-frame URL support for visual continuity when using image-to-video providers.
- Local development stubs when API keys are not configured.
- Input/output moderation through a blocklist plus OpenAI-compatible moderation calls.
- Subscription tier limits for clip budgets and session duration.

## Cost Strategy

DreamCast is built to keep unit economics survivable:

- Use cheaper OpenAI-compatible narration providers for high-volume story turns.
- Prefer SiliconFlow for lower-cost video generation when available.
- Let the Director spend full video only on high-impact beats such as openings, failures, reveals, action, and climaxes.
- Preserve clip budget for quieter scenes with text or ambient presentation.
- Keep the next major roadmap item focused on narrative state compression so long sessions do not resend full transcripts.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, CSS Modules |
| Narration | OpenAI-compatible chat completions: OpenAI, xAI, DeepInfra, etc. |
| Director | Local TypeScript render-budget decision layer |
| Video | SiliconFlow, Replicate, Runway, or local stub |
| Session store | In-memory development adapter, Supabase/Firestore planned |
| Billing | Stripe planned |
| Auth | NextAuth.js planned |
| Tests | Jest + ts-jest |

## Architecture

```txt
Browser UI
  |
  | POST /api/sessions
  | POST /api/sessions/[id]/action
  v
Next.js API Routes
  |
  +-- Content moderation
  +-- Consequence engine
  +-- LLM narrator
  +-- Director render decision
  +-- Video provider, only when Director approves spend
  v
Session store
```

The important separation is:

- `src/lib/narrator.ts` generates structured narrative scenes.
- `src/lib/consequenceEngine.ts` makes player outcomes feel earned.
- `src/lib/director.ts` controls cinematic budget.
- `src/lib/videoGen.ts` handles provider-specific video generation.
- `src/lib/sessionStore.ts` persists session state behind a swappable adapter.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in only the providers you want to use.

### Narration

OpenAI:

```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
NARRATION_MODEL=gpt-4o
```

xAI Grok:

```env
OPENAI_API_KEY=xai-...
OPENAI_BASE_URL=https://api.x.ai/v1
NARRATION_MODEL=grok-3-beta
```

DeepInfra:

```env
OPENAI_API_KEY=your-deepinfra-token
NARRATION_BASE_URL=https://api.deepinfra.com/v1/openai
NARRATION_MODEL=deepseek-ai/DeepSeek-V3
```

### Video

SiliconFlow:

```env
SILICONFLOW_API_KEY=...
SILICONFLOW_API_BASE=https://api.siliconflow.com/v1
SILICONFLOW_VIDEO_MODEL=Wan-AI/Wan2.2-I2V-A14B
```

Replicate:

```env
REPLICATE_API_TOKEN=r8_...
VIDEO_MODEL_VERSION=your-model-version
```

Runway:

```env
RUNWAY_API_KEY=rw_...
```

With no video keys, DreamCast returns a stub video URL for local development.

## Getting Started

```bash
git clone https://github.com/voxislabs-crypto/DreamCast
cd DreamCast
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm test
npm run build
npm run dev
```

## Project Structure

```txt
src/
  __tests__/
    consequenceEngine.test.ts
    contentModeration.test.ts
    director.test.ts
    sessionStore.test.ts
    videoGen.test.ts
  lib/
    consequenceEngine.ts
    contentModeration.ts
    director.ts
    narrator.ts
    sessionStore.ts
    videoGen.ts
  pages/
    api/sessions/
    dashboard.tsx
    index.tsx
    session/[id].tsx
  styles/
  types/
```

## Roadmap

1. Upgrade Next.js from `14.2.3` to a patched `14.2.x` release.
2. Add a Story State Compiler to compress scene history into compact world state.
3. Replace the in-memory session store with Supabase or Firestore.
4. Add auth and tier enforcement around session creation/action routes.
5. Persist generated video URLs before provider links expire.
6. Add branch prediction and speculative generation for latency reduction.
7. Add narrative-aware moderation so safety checks do not break immersion.

## Validation

Current local verification:

```txt
npm test
31 passed

npm run build
Compiled successfully
```

## Security Note

The current `next@14.2.3` dependency is known to trigger npm audit advisories. Upgrade Next.js before deploying this app publicly.
