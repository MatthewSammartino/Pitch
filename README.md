# Pitch
First web app. Wohoo!

# 🃏 Pitch Tracker

A live, shared pitch analytics dashboard for your friend group.

## Project Structure

```
pitch-tracker/
├── server/
│   ├── index.js       ← Express API
│   ├── games.json     ← Auto-created on first run (your database)
│   └── package.json
└── client/
    ├── src/
    │   └── App.jsx    ← React dashboard
    └── package.json
```

---

## Setup

### 1. Server

```bash
cd server
npm install
npm start
```

You should see:
```
🃏 Pitch Tracker API running at http://localhost:3001
   Accessible on your network at http://<your-ip>:3001
```

`games.json` will be created automatically with your existing game history on first run.

### 2. Client

In a new terminal:

```bash
cd client
npm install
npm run dev        # if using Vite
# or
npm start          # if using Create React App
```

Dashboard opens at **http://localhost:5173** (Vite) or **http://localhost:3000** (CRA).

---

## Sharing with the Group

Find your local IP:
- **Mac**: `ipconfig getifaddr en0`
- **Windows**: `ipconfig` → look for IPv4 Address
- **Linux**: `hostname -I`

Anyone on your WiFi can open `http://<your-ip>:5173` and log games in real time.

> **Note**: Both the server and client need to be running. Keep the terminal windows open during game night.

---

## Logging a New Game

1. Open the dashboard → **Overview** tab
2. Fill in each player's result (positive = win, negative = loss)
3. Scores must sum to **zero** — the form will tell you if they don't
4. Leave a player blank if they didn't play that game
5. Hit **Add Game** — all charts update instantly

## Deleting a Game

Go to the **Log** tab → click ✕ next to any game → confirm deletion.

---

## Adding a New Player

1. Add the player name to the `PLAYERS` array in `App.jsx`
2. Add a color and suit for them in the `COLORS` and `SUITS` objects
3. The server will automatically include them when logging new games
