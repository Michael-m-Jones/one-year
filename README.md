# One Year of Us 💙

A surprise one-year anniversary site for Samantha. Static, free, GitHub-Pages-ready.

## Structure
```
index.html        → the whole page (gate → intro → journey → gallery → numbers → letter → finale)
css/style.css     → styles (midnight-blue + blush theme)
js/main.js        → smooth scroll, password gate, music, scroll animations, mouse trail, counters
assets/photos/    → final web-ready photos go here
assets/audio/song.mp3 → the autoplay song (add this file)
```

## Two things still needed
1. **The song:** drop the MP3 at `assets/audio/song.mp3` (it autoplays after she taps "enter with sound").
2. **Photos + moment text + the letter:** Michael provides; Claude slots them in.

## Password
The reveal password is **love** (set in `js/main.js`, constant `PASSWORD`).

## Deploy to GitHub Pages (free)
1. Create a new repo (e.g. `one-year`) on GitHub.
2. Upload everything in this folder to the repo.
3. Repo → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `/root` → Save.
4. Live in ~1 min at `https://<your-username>.github.io/one-year/`.

> Note: the password gate is client-side — it keeps the page private from casual eyes, but isn't true security. Perfect for a surprise link.
