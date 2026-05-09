# Sound effects library

Drop short MP3 files in here to enable the file-based celebration variants.
Each filename below corresponds to a variant key in
`client/src/lib/sounds.js`. If a file is missing the matching variant in
ProfilePage will be selectable but silent — no error, just no audio.

## Expected filenames

```
made-bid/
  applause.mp3        → "Applause (file)"
  cheer.mp3           → "Cheer (file)"
  coin.mp3            → "Coin (file)"

set-opponent/
  airhorn-real.mp3    → "Air horn (file)"
  sad-trombone.mp3    → "Sad trombone (file)"
  crowd-aww.mp3       → "Crowd aww (file)"

won-game/
  crowd-cheer.mp3     → "Crowd cheer (file)"
  victory-fanfare.mp3 → "Victory fanfare (file)"
  champion.mp3        → "Champion (file)"
```

## Sourcing

All royalty-free, no-attribution-required tiers. Recommended:

- **Pixabay** — https://pixabay.com/sound-effects/ — search the names
  above (e.g. "applause short", "air horn", "crowd cheer"), download MP3.
  No account required. Pixabay's content license is permissive for use in
  apps and games.
- **Mixkit** — https://mixkit.co/free-sound-effects/ — broad library,
  download MP3, no attribution required.
- **Freesound** — https://freesound.org/ — filter by License = "Creative
  Commons 0" to avoid attribution requirements.

## Sizing tips

- Trim leading silence so the sound starts immediately.
- Keep clips ≤ 2 seconds where possible (won-game can stretch to ~3-4s).
- Encode at 128 kbps MP3 — produces files in the 30–80 KB range for
  short clips. Avoid lossless / 320 kbps; the bundle gets bloated fast.
- Test playback locally: `npm run dev`, then visit Profile → Celebration
  sounds → click the variant button to preview.

## Adding more variants later

To add a new file-based variant:
1. Drop the MP3 into the correct subdirectory.
2. Add a registry entry in `client/src/lib/sounds.js` to one of
   `MADE_BID_VARIANTS` / `SET_OPPONENT_VARIANTS` / `WIN_GAME_VARIANTS`:
   ```js
   yourkey: { label: "Your label (file)", file: "/sounds/<event>/<your-file>.mp3" },
   ```
3. The Profile UI picks it up automatically — no other changes needed.
