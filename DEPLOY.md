# Pitch Tracker - Railway Deployment Guide

## Prerequisites
- GitHub account (you have this ✓)
- Railway account (sign up at railway.app using GitHub)

## Step 1: Reorganize Your Project

Your project should have this structure:
```
pitch-tracker/
├── src/
│   ├── App.jsx        (updated - use new version)
│   └── main.jsx
├── server/
│   ├── index.js       (updated - use new version)
│   ├── package.json   (updated - use new version)
│   └── import-games.js
├── games-backup.json  (rename your current games.json)
├── package.json       (your Vite/React package.json)
└── vite.config.js
```

## Step 2: Update vite.config.js

Add build output to server folder:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'server/dist'
  }
})
```

## Step 3: Update Root package.json Scripts

Add these scripts to your root package.json:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Step 4: Push to GitHub

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push
```

## Step 5: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your pitch-tracker repository
4. Railway will auto-detect it. Click **"Add variables"** and skip for now
5. Click **"Deploy"**

## Step 6: Add PostgreSQL Database

1. In your Railway project, click **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway automatically connects it and sets `DATABASE_URL`

## Step 7: Configure Build Settings

1. Click on your service (not the database)
2. Go to **Settings** → **Build**
3. Set these values:
   - **Root Directory:** `/` (leave empty or /)
   - **Build Command:** `npm install && npm run build && cd server && npm install`
   - **Start Command:** `cd server && node index.js`

4. Click **"Deploy"** to rebuild

## Step 8: Import Your Existing Games (Optional)

1. Copy `games.json` to `server/games-backup.json`
2. In Railway, go to your PostgreSQL database and copy the connection string
3. Run locally:
```bash
cd server
DATABASE_URL="your_connection_string" node import-games.js
```

## Step 9: Get Your URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Share this URL with your friends! 🎉

---

## Local Development

For local development, you can still run:

**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (Backend with local PostgreSQL or keep using JSON):**
```bash
cd server
npm run dev
```

## Troubleshooting

**"Cannot connect to database"**
- Make sure PostgreSQL is added in Railway
- Check that DATABASE_URL variable is set (Railway does this automatically)

**"502 Bad Gateway"**
- Check the deployment logs in Railway
- Make sure the build command completed successfully

**Blank page**
- Check browser console for errors
- Make sure the build output is in `server/dist/`

---

## Environment Variables (set in Railway)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (auto-set) | Railway sets this when you add PostgreSQL |
| `PORT` | (auto-set) | Railway sets this automatically |

