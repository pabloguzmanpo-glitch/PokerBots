# 🃏 PokerBots

Real-time Texas Hold'em poker game where you play against AI bots with unique personalities. Built this as a fun experiment mixing game logic, websockets and bot behavior — ended up being way more entertaining than expected.

## What it does

You can jump in and play against 4 AI bots, each with their own playstyle and chat lines. Or just watch them go at it without joining. The game runs continuously — a new hand starts automatically after each round.

## The Bots

| | Name | Style |
|---|------|-------|
| 🐂 | El Toro | Bets aggressively every single hand |
| 🦊 | El Zorro | Bluffs constantly and talks trash |
| 🧊 | Don Frío | Cold and calculated — only plays strong hands |
| 🤪 | Loco Pepe | Completely random, somehow wins a lot |

## Stack

- **Node.js + Express** — server and game loop
- **Socket.io** — real-time sync between players
- **Vanilla JS** — frontend, no frameworks needed
- **CSS** — custom poker table UI with animations

## Run locally

```bash
npm install
node server.js
```

Open `http://localhost:3000`

## Structure

```
├── server.js         # Entry point, socket events
├── game/
│   ├── engine.js     # Texas Hold'em logic
│   ├── bots.js       # Bot personalities and decisions
│   └── deck.js       # Card deck and hand evaluator
└── public/
    └── index.html    # Frontend
```

## What's next

- Global leaderboard across sessions
- More bot personalities
- Twitch Channel Points integration
- Tournament mode
- GPT-powered bot chat

---

Virtual chips only. No real money. Works great as a stream overlay.