# Celebration video library

Drop short MP4 / WebM / GIF files in here to enable the celebration overlay
variants. Each filename below corresponds to a variant key in
`client/src/lib/videos.js`. If a file is missing the matching variant in
ProfilePage will be selectable but silent — the overlay attempts to load
it, the `<video>` element fails, and the overlay auto-dismisses with no
JS error.

## Expected filenames

```
set-opponent/
  strike.mp4         → "Strike"
  explosion.mp4      → "Explosion"
  doh.mp4            → "D'oh"

won-game/
  fireworks.mp4      → "Fireworks"
  trophy.mp4         → "Trophy"
  confetti.mp4       → "Confetti"

took-jack/
  jackpot.mp4        → "Jackpot"
  coinrain.mp4       → "Coin rain"
  dance.mp4          → "Dance"
```

## Sourcing

All royalty-free, no-attribution-required tiers:

- **Pixabay videos** — https://pixabay.com/videos/ — search the names
  above (e.g. "fireworks", "explosion", "trophy"), download MP4. No account
  required, permissive license.
- **Mixkit** — https://mixkit.co/free-stock-video/ — broad library,
  download MP4, no attribution required.
- **Giphy** (export as MP4) — https://giphy.com/ — find a GIF you like, use
  the share link to download as MP4. Many memes/reactions are right here.
- **Tenor** — https://tenor.com/ — similar to Giphy. Clip download
  available via the file menu.

## Sizing tips

- Trim leading silence/black so the action starts immediately.
- Keep clips ≤ 2 seconds where possible (the overlay caps at 4 seconds
  and dismisses automatically).
- Encode at modest quality — 720p H.264 is plenty for a 2-second clip.
  Target ≤ 500 KB per file. Avoid 4K / 60fps source files.
- Test playback locally: `npm run dev`, then visit Profile → Celebration
  videos → click the variant button to preview.

## Adding more variants later

To add a new file-based variant:
1. Drop the file into the correct subdirectory.
2. Add a registry entry in `client/src/lib/videos.js`:
   ```js
   yourkey: { label: "Your label", file: "/videos/<event>/<your-file>.mp4" },
   ```
3. The Profile UI picks it up automatically — no other changes needed.

## Audio

By default the overlay plays videos **muted** so the video's own audio
doesn't compete with the celebration SFX (which fire independently). If
you want a particular video's audio to play, that requires a code change
to flip the `muted` flag — ask and I'll wire it.
