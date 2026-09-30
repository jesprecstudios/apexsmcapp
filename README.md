# ApexSMC — AI Forex Chart Intelligence Terminal

> **Desktop-First AI Chart Analysis Terminal for Retail Forex Traders and Smart Money Concepts (SMC) Analysts**

ApexSMC combines interactive high-density financial charting with server-orchestrated multimodal Google Gemini AI to deliver structured, explainable technical analysis—including order block detection, Fair Value Gap (FVG) rebalancing, Break of Structure (BOS) tracking, liquidity sweeps, and verifiable confluence scoring.

---

## 1. Quick Start

### Prerequisites
- **Node.js**: `v20.x` or higher (tested on `v24.x`)
- **Package Manager**: `npm`

### Local Development
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Run the local development server (Turbopack)
npm run dev
```

Visit [http://localhost:3000/terminal](http://localhost:3000/terminal) to access the workstation.

---

## 2. Environment Configuration

Configure `.env.local` based on `.env.example`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-server-service-role-key

# Google Gemini API (Server-side analysis engine)
GEMINI_API_KEY=your-gemini-api-key

# App Defaults
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_SYMBOL=EURUSD
NEXT_PUBLIC_DEFAULT_TIMEFRAME=H1
NEXT_PUBLIC_DEFAULT_STRATEGY=SMC
```

---

## 3. Database & Row Level Security (RLS)

Database migrations are located in `supabase/migrations/`:
- `supabase/migrations/20260929000000_initial_schema.sql`

### Tables Included
1. **`public.profiles`**: User identity, workspace settings, and default symbol/timeframe preferences.
2. **`public.snapshots`**: Chart captures, visible range coordinates, and session metadata.
3. **`public.analyses`**: AI analysis outputs, bias, confluence score, model identifier, and structured JSON results.
4. **`public.usage_events`**: Operational telemetry, token tracking, and cost accounting.

Apply migrations via Supabase CLI or the Supabase SQL Editor:
```bash
npx supabase db push
```

---

## 4. Design System & Stitch MCP Assets

This project uses the official **ApexSMC Terminal Design System** drafted and generated via **Stitch MCP**:
- **Stitch Project ID:** `10772035888295376367` (`ApexSMC - AI Forex Chart Terminal`)
- **Design System Asset:** `assets/13867013273867940962`
- **Generated Terminal Screen:** `projects/10772035888295376367/screens/41c2c3c5a799443fa4b6051cc600a520`
- **Documentation:** Review [DESIGN.md](DESIGN.md) for full design tokens, color scales, and typography specs.

---

## 5. Implementation Roadmap Status

- [x] **Phase 1: Foundation & Application Shell** (Complete)
  - Next.js 16 App Router, TypeScript, React 19, Tailwind CSS v4
  - Supabase Auth, client/server helpers, and middleware route protection
  - Initial database schema with RLS (`profiles`, `snapshots`, `analyses`, `usage_events`)
  - Stitch MCP Terminal Design System and responsive 70/30 workspace shell
- [x] **Phase 2: Chart Terminal Integration & Cloudinary Storage** (Complete)
  - TradingView Lightweight Charts v5 canvas engine with multi-pair data generator
  - Cloudinary Storage adapter (`src/lib/storage/cloudinary.ts`) for snapshot uploads
  - Snapshot capture handle returning high-resolution base64 canvas + chart context
  - Symbol & timeframe selector controls with SMC overlay toggles
- [x] **Phase 3: AI Analysis Engine (Gemini)** (Complete)
  - Official `@google/genai` multimodal integration with dynamic fallback resilience
  - Strategy registry & prompt modules: SMC, Chart Patterns, Candlestick Reversals, Combined Confluence
  - Structured output schemas with strict Zod validation and cross-field business logic
  - Dynamic AI Intelligence panel with bias hero banner, confluence meters, institutional levels, scenario cards, and interactive inquiry
- [x] **Phase 4: History, Persistence & Security** (Complete)
  - Cloudinary asset management with automated image cleanup on deletion
  - History drawer with database queries, filtering by bias/symbol, and instant restoration
  - Rate limiting telemetry logging to `usage_events`
- [ ] **Phase 5: AI Evaluation & Production Deployment**

---

## 6. Testing & Quality Assurance

Run the automated test suite covering strategy definitions, confluence scoring, and schema validation:
```bash
# Run unit tests
npm test

# Run ESLint validation
npm run lint

# Run full production build
npm run build
```
