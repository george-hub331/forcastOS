# ForecastOS

**Prediction markets turn beliefs into prices. ForecastOS turns beliefs into version-controlled memory.**

A Telegram bot built on [MemForks](https://github.com/memforks-dev/memforks): every tracked Polymarket gets a forked memory tree (YES thesis, NO thesis, resolution risk, evidence streams). Evidence **forks** reasoning instead of overwriting it. After resolution, `/postmortem` merges a validated lesson into `calibration/main` for future markets.

## End-to-end workflow

1. `/track` a market → `/thesis` shows **contradictory YES/NO** branches (same question, different answers)
2. `/inject` contradicting evidence → bot forks thesis (`YES thesis forked…`)
3. `/resolve yes|no` → `/postmortem` → lesson **merged into `calibration/main`**
4. `/track` a similar market → `/thesis` cites the prior lesson
5. Losing thesis branch still queryable via `/evidence`

## Stack

- [Grammy](https://grammy.dev) — Telegram bot
- [Polymarket Gamma API](https://gamma-api.polymarket.com) — read-only market data
- [@memfork/core](https://www.npmjs.com/package/@memfork/core) — branch, recall, commit, merge
- [@memfork/vercel-ai](https://www.npmjs.com/package/@memfork/vercel-ai) — `withMemForks` for classification & thesis generation
- Sui mainnet via `memfork init --quick`

## Setup

```bash
# 1. MemForks credentials (one-time, ~30s)
npm install -g @memfork/cli
memfork init --quick
memfork doctor --env   # copy MEMFORK_* vars

# 2. Install & configure
cd forcastOS
npm install
cp .env.example .env   # fill MEMFORK_*, OPENAI_API_KEY, TELEGRAM_BOT_TOKEN

# 3. Bootstrap durable branch
npm run bootstrap

# 4. Run
npm run dev
```

Create a bot via [@BotFather](https://t.me/BotFather) and paste the token into `.env`.

## Commands

| Command | Description |
|---------|-------------|
| `/track <url-or-slug>` | Fork market branch tree from `calibration/main`, seed theses |
| `/thesis` | YES vs NO arguments (parallel recall) |
| `/evidence` | News + microstructure evidence |
| `/risk` | Resolution criteria & ambiguity |
| `/inject <text>` | Manual evidence (demo) |
| `/fork yes\|no <reason>` | Manual thesis fork |
| `/resolve yes\|no` | Demo resolution override |
| `/postmortem` | Score branches, merge lesson → `calibration/main` |
| `/recall-calibration` | View durable lessons |
| `/merge <branch>` | Promote any branch to `calibration/main` |
| `/status` | Tracked markets + live prices |

## Branch topology

```
calibration/main
└── market/<id>/
    ├── thesis/yes          (+ forks: thesis/yes@<timestamp>)
    ├── thesis/no
    ├── resolution-risk
    ├── sources/news
    ├── sources/microstructure
    ├── trade-plan/paper
    └── lesson              (created at postmortem)
```


## Architecture

```
Telegram → Grammy bot → @memfork/core ↔ Sui (branches, merge)
                      → @memfork/vercel-ai (classify, generate theses)
                      → Polymarket API (prices, resolution)
                      → data/sessions.json (bookkeeping only)
```

Memory lives in MemWal/Walrus via MemForks — not in the JSON file.

## License

MIT
