// Focus Gate — runs at document_start on github.com/notifications
// Hides the page instantly, then asks you to consciously choose to enter.
// A successful entry grants a short grace window so you can browse
// notifications normally without re-prompting on every click.

(() => {
  const GRACE_MINUTES = 5;      // how long one confirmation lasts
  const HOLD_SECONDS = 3;       // how long the button must be held
  const KEY_GRANT = "focusGateGrantUntil";
  const KEY_COUNT = "focusGateCounts";     // { "YYYY-MM-DD": n }

  const todayKey = () => new Date().toISOString().slice(0, 10);

  chrome.storage.local.get([KEY_GRANT, KEY_COUNT], (data) => {
    const grantUntil = data[KEY_GRANT] || 0;
    if (Date.now() < grantUntil) return; // inside grace window — let it load

    const counts = data[KEY_COUNT] || {};
    const checksToday = counts[todayKey()] || 0;

    hidePage();
    whenBodyReady(() => showGate(checksToday));
  });

  // ---------------------------------------------------------------

  function hidePage() {
    const style = document.createElement("style");
    style.id = "focus-gate-hide";
    style.textContent =
      "html { overflow: hidden !important; } " +
      "body > *:not(#focus-gate) { visibility: hidden !important; }";
    document.documentElement.appendChild(style);
  }

  function unhidePage() {
    document.getElementById("focus-gate-hide")?.remove();
    document.getElementById("focus-gate")?.remove();
  }

  function whenBodyReady(fn) {
    if (document.body) return fn();
    new MutationObserver((_, obs) => {
      if (document.body) { obs.disconnect(); fn(); }
    }).observe(document.documentElement, { childList: true });
  }

  function showGate(checksToday) {
    const gate = document.createElement("div");
    gate.id = "focus-gate";
    gate.innerHTML = `
      <style>
        #focus-gate {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          background: #0b1220;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          color: #e6ebf4;
        }
        #focus-gate .fg-card {
          max-width: 420px; width: calc(100% - 48px);
          text-align: center; padding: 40px 32px;
        }
        #focus-gate .fg-eyebrow {
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: #7d8aa5; margin-bottom: 20px;
        }
        #focus-gate h1 {
          font-size: 26px; font-weight: 600; line-height: 1.3;
          margin: 0 0 12px; color: #f2f5fa;
        }
        #focus-gate .fg-sub {
          font-size: 15px; line-height: 1.6; color: #9aa7bf; margin: 0 0 8px;
        }
        #focus-gate .fg-count {
          font-size: 13px; color: #64718c; margin: 0 0 32px;
        }
        #focus-gate .fg-hold {
          position: relative; overflow: hidden;
          display: block; width: 100%; padding: 14px 0;
          border: 1px solid #2b3a57; border-radius: 10px;
          background: #131d33; color: #c9d4e8;
          font-size: 14px; font-weight: 500; cursor: pointer;
          user-select: none; -webkit-user-select: none;
          transition: border-color 0.2s;
        }
        #focus-gate .fg-hold:hover { border-color: #3d5178; }
        #focus-gate .fg-hold .fg-fill {
          position: absolute; inset: 0; width: 0%;
          background: #24406e; transition: none;
        }
        #focus-gate .fg-hold .fg-label { position: relative; z-index: 1; }
        #focus-gate .fg-back {
          display: block; width: 100%; margin-top: 12px; padding: 14px 0;
          border: none; border-radius: 10px;
          background: #3fb27f; color: #08131f;
          font-size: 14px; font-weight: 600; cursor: pointer;
        }
        #focus-gate .fg-back:hover { background: #4cc78f; }
        #focus-gate .fg-note {
          margin-top: 24px; font-size: 12px; color: #55617a;
        }
        @media (prefers-reduced-motion: reduce) {
          #focus-gate .fg-fill { transition: none !important; }
        }
      </style>
      <div class="fg-card">
        <div class="fg-eyebrow">Focus Gate</div>
        <h1>Do you need to be here right now?</h1>
        <p class="fg-sub">Feedback will still be here at your next scheduled check. What problem were you just working on?</p>
        <p class="fg-count">${countLine(checksToday)}</p>
        <button class="fg-back" id="fg-back">Go back to work</button>
        <button class="fg-hold" id="fg-hold">
          <span class="fg-fill" id="fg-fill"></span>
          <span class="fg-label" id="fg-hold-label">Hold ${HOLD_SECONDS}s to enter anyway</span>
        </button>
        <p class="fg-note">Entering unlocks notifications for ${GRACE_MINUTES} minutes.</p>
      </div>
    `;
    document.body.appendChild(gate);

    // "Go back to work" — leave the page
    gate.querySelector("#fg-back").addEventListener("click", () => {
      if (history.length > 1) history.back();
      else window.location.href = "https://github.com";
    });

    // Hold-to-enter mechanics
    const holdBtn = gate.querySelector("#fg-hold");
    const fill = gate.querySelector("#fg-fill");
    let raf = null, startTime = null;

    const startHold = (e) => {
      e.preventDefault();
      startTime = performance.now();
      const tick = (now) => {
        const pct = Math.min((now - startTime) / (HOLD_SECONDS * 1000), 1);
        fill.style.width = pct * 100 + "%";
        if (pct >= 1) return grantAccess();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const cancelHold = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null; startTime = null;
      fill.style.width = "0%";
    };

    holdBtn.addEventListener("mousedown", startHold);
    holdBtn.addEventListener("touchstart", startHold, { passive: false });
    ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) =>
      holdBtn.addEventListener(ev, cancelHold)
    );
    // Keyboard accessibility: hold Enter/Space
    holdBtn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !raf) startHold(e);
    });
    holdBtn.addEventListener("keyup", cancelHold);
  }

  function countLine(n) {
    if (n === 0) return "First check of the day.";
    if (n === 1) return "You've checked once today already.";
    return `You've checked ${n} times today already.`;
  }

  function grantAccess() {
    chrome.storage.local.get([KEY_COUNT], (data) => {
      const counts = data[KEY_COUNT] || {};
      const day = todayKey();
      counts[day] = (counts[day] || 0) + 1;
      // keep only today's entry to avoid unbounded growth
      const pruned = { [day]: counts[day] };
      chrome.storage.local.set(
        {
          [KEY_GRANT]: Date.now() + GRACE_MINUTES * 60 * 1000,
          [KEY_COUNT]: pruned,
        },
        () => unhidePage()
      );
    });
  }
})();
