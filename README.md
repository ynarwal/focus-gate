# Focus Gate for GitHub Notifications

A tiny Chrome extension that intercepts `github.com/notifications` and makes you pause before entering. Instead of a reflexive tab-switch, you get a full-screen prompt asking whether you actually need to be there — plus a count of how many times you've already checked today.

## How it works

- The moment the notifications page starts loading, the extension hides it behind a dark overlay.
- **"Go back to work"** (the big green button — the default, easy choice) sends you back where you came from.
- **"Hold 3s to enter anyway"** requires you to physically hold the button for 3 seconds. That small friction is enough to break the autopilot loop and make checking a conscious decision.
- If you do enter, you get a **5-minute grace window** where notifications work normally — so you can actually read and respond without being re-prompted on every click.
- It tracks how many times you've checked **today** (stored locally, never sent anywhere) and shows it on the gate as a gentle mirror.

## Install (2 minutes)

1. Unzip this folder somewhere permanent (Chrome loads it from disk, so don't delete it later).
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked** and select the `focus-gate` folder.
5. Visit https://github.com/notifications — you should see the gate.

## Customize

Open `content.js` and edit the two constants at the top:

```js
const GRACE_MINUTES = 5;   // how long one confirmation lasts
const HOLD_SECONDS = 3;    // how long you must hold the button
```

Want it stricter? Set `HOLD_SECONDS` to 10. Want to gate other pages too (e.g., the GitHub homepage feed)? Add patterns to `matches` in `manifest.json`:

```json
"matches": [
  "https://github.com/notifications*",
  "https://github.com/?tab=*"
]
```

After any edit, go back to `chrome://extensions` and hit the reload icon on the extension card.

## Notes

- All data (grace window timestamp, daily check count) lives in `chrome.storage.local` on your machine.
- The overlay is injected at `document_start`, so notification content is hidden before it can catch your eye.
- Works with keyboard too: focus the hold button and hold Enter or Space.
