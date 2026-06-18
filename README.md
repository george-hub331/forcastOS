# ForecastOS

**Prediction markets turn beliefs into prices. ForecastOS turns beliefs into version-controlled memory.**

Telegram bot built on [MemForks](https://github.com/memforks-dev/memforks). Each tracked Polymarket gets a forked memory tree: YES thesis, NO thesis, resolution risk, and evidence streams. New evidence **forks** a thesis when the view changes — it never overwrites prior reasoning. After resolution, `/postmortem` merges one durable lesson into `calibration/main`, which future markets inherit when forked.

## End-to-end workflow

1. `/track <polymarket-url-or-slug>` → `/thesis` shows **contradictory YES/NO** recall (same market, different branches)
2. `/inject <text>` with contradicting evidence → bot forks the thesis (`YES thesis forked…`); old branch preserved
3. `/resolve yes|no` → `/postmortem` → lesson **merged into `calibration/main`**
4. `/track` another market → `/thesis` → opening reasoning recalls prior calibration lessons
5. Losing thesis stays on its branch in MemForks (not merged); prior forks remain addressable by branch name

## Stack

| Layer | Package / service |
|-------|-------------------|
| Telegram | [Grammy](https://grammy.dev) |
| Market data | [Polymarket Gamma API](https://gamma-api.polymarket.com) (read-only, no API key) |
| Memory | [@memfork/core](https://www.npmjs.com/package/@memfork/core) — `branch`, `recall`, `commit`, `merge` |
| AI | [@memfork/vercel-ai](https://www.npmjs.com/package/@memfork/vercel-ai) — `withMemForks` + `generateObject` (`autoCommit: false`) |
| Model | OpenAI `gpt-4o-mini` via `@ai-sdk/openai` |
| Chain | Sui via `memfork init --quick` (mainnet recommended, gas sponsored) |

## Setup

```bash
# 1. MemForks credentials (one-time, interactive — pick mainnet)
npm install -g @memfork/cli
memfork init --quick
memfork doctor --env   # copy printed MEMFORK_* vars

# 2. Install & configure
cd forcastOS
npm install
cp .env.example .env
# Required: MEMFORK_*, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN

# 3. Bootstrap calibration/main (also runs automatically on startup)
npm run bootstrap

# 4. Run bot
npm run dev
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | yes | From @BotFather |
| `OPENAI_API_KEY` | yes | Thesis generation, evidence classification, postmortem |
| `MEMFORK_TREE_ID` | yes | From `memfork doctor --env` |
| `MEMFORK_PRIVATE_KEY` | yes | Sui signer |
| `MEMFORK_MEMWAL_ACCOUNT` | yes | MemWal account ID |
| `MEMFORK_MEMWAL_KEY` | yes | MemWal delegate key |
| `MEMFORK_NETWORK` | no | Default `mainnet` |
| `MEMFORK_RELAYER_URL` | no | Default `https://relayer.memory.walrus.xyz` |
| `EVIDENCE_POLL_MS` | no | Price poller interval (default `180000` = 3 min) |

### npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Telegram bot + evidence poller |
| `npm start` | Same as `dev` |
| `npm run bootstrap` | Create `calibration/main` branch (idempotent) |
| `npm run typecheck` | TypeScript check |

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Help text |
| `/track <url-or-slug>` | Fetch Polymarket, fork 6 branches from `calibration/main`, seed theses |
| `/thesis` | Parallel recall on current YES/NO thesis heads |
| `/evidence` | Recall `sources/news` + `sources/microstructure` for active market |
| `/risk` | Recall `resolution-risk` for active market |
| `/inject <text>` | Manual news evidence → classify → confirm, fork, or log as noise |
| `/fork yes\|no <reason>` | Manual thesis fork + commit |
| `/resolve yes\|no` | Demo resolution override (stored until `/postmortem`) |
| `/postmortem` | Score branches, extract lesson, `merge` into `calibration/main` |
| `/recall-calibration` | Recall durable lessons on `calibration/main` |
| `/merge <branch>` | Manually `merge` any branch into `calibration/main` |
| `/status` | Tracked markets + live Polymarket prices |

**Active market:** most commands operate on the latest unresolved market for your chat. `/track` sets the active market.

**Polymarket refs:** full URL, slug (e.g. `new-rhianna-album-before-gta-vi-926`), condition ID (`0x…`), or numeric Gamma ID.

## How it works

### Branch topology

Branch names use `/` as a naming convention — each is a flat MemWal namespace, not on-chain nesting.

```
calibration/main                    ← cross-market lessons (survives postmortem)
market/<conditionId>/
  thesis/yes                        ← initial head; forks to thesis/yes@<timestamp>
  thesis/no
  resolution-risk
  sources/news
  sources/microstructure
  trade-plan/paper                  ← created on track, not yet written to
  lesson                            ← created at postmortem, then merged away
```

On `/track`, six sub-branches are forked from `calibration/main`. Resolution criteria are committed to `resolution-risk`. Initial YES/NO theses are generated via `withMemForks` (recalling calibration lessons) and committed explicitly.

### Evidence handling

| Verdict | Action |
|---------|--------|
| `confirms` | `commit` to `sources/news` |
| `changes-view` | `branch` new thesis head + `commit`; update `yesHead`/`noHead` in session |
| `noise` | `commit` to `sources/microstructure` only — thesis unchanged |

Classification uses `withMemForks` scoped to the current thesis head with `autoCommit: false`.

**Background poller:** every `EVIDENCE_POLL_MS` (default 3 min), fetches Polymarket prices and commits ticks to `sources/microstructure`. There is no news ingestion pipeline — use `/inject` for demo evidence.

### Postmortem flow

1. Outcome from Polymarket API, or `/resolve` demo override (`pendingOutcome`)
2. Recall final YES/NO thesis states + news evidence
3. Model extracts winner, lesson pattern, source scores
4. Create `market/<id>/lesson` from winning thesis head → `commit` → `merge` into `calibration/main`
5. Losing thesis branch is **not** merged; market marked resolved in `data/sessions.json`

### What lives where

| Data | Storage |
|------|---------|
| Theses, evidence, lessons | MemForks / MemWal (Walrus) |
| Which markets a chat tracks, thesis head pointers, prices | `data/sessions.json` (gitignored) |
| Chat messages | Not persisted |

## Project structure

```
src/
  index.ts                 # entry: env check, bot, poller
  scripts/bootstrap.ts     # ensure calibration/main
  bot/                     # Grammy commands
  memfork/                 # client, branches, extractFactText
  ai/                      # theses, classifier, postmortem (withMemForks)
  markets/polymarket.ts    # Gamma API provider
  evidence/                # processEvidence, price poller
  store/sessions.ts        # JSON session state
```



## License

MIT
