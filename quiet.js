// Quiet Timeline — runs on GitHub issue and PR pages.
// Hides non-comment timeline events (labels, assignments, force-pushes,
// cross-references, milestones, etc.) so only actual human discussion
// remains. A small floating toggle lets you reveal events when needed.
//
// GitHub occasionally changes its markup. If hiding stops working,
// the selectors below are the only thing you should need to update.

(() => {
  const KEY_ENABLED = "quietTimelineEnabled";
  const HIDE_CLASS = "quiet-timeline-on";

  // A timeline item is kept if it contains any of these (i.e., it's a comment,
  // a review with a body, or a comment being composed):
  const COMMENT_MARKERS = [
    ".timeline-comment",        // classic issue/PR comments
    ".js-comment-container",    // review threads / inline discussion
    ".review-comment",          // PR review comments
    "[data-testid='comment-viewer-outer-box']", // new React issues UI
    "[data-testid='markdown-body']",            // new React UI comment bodies
  ].join(", ");

  // Containers that represent one timeline entry:
  const ITEM_SELECTORS = [
    ".js-timeline-item",                        // classic UI
    "[data-testid='issue-timeline-item']",      // new React issues UI
  ];

  injectStyle();

  chrome.storage.local.get([KEY_ENABLED], (data) => {
    const enabled = data[KEY_ENABLED] !== false; // default: on
    if (enabled) document.documentElement.classList.add(HIDE_CLASS);
    whenBodyReady(() => addToggle(enabled));
  });

  // ---------------------------------------------------------------

  function injectStyle() {
    const style = document.createElement("style");
    style.id = "quiet-timeline-style";
    const rules = ITEM_SELECTORS.map(
      (sel) => `html.${HIDE_CLASS} ${sel}:not(:has(${COMMENT_MARKERS}))`
    ).join(",\n");
    style.textContent = `
      ${rules} { display: none !important; }

      /* collapse the leftover connector lines between hidden items */
      html.${HIDE_CLASS} .js-timeline-item .TimelineItem--condensed {
        padding-top: 0; padding-bottom: 0;
      }

      #quiet-timeline-toggle {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 999px;
        border: 1px solid #2b3a57; background: #0b1220; color: #c9d4e8;
        font: 500 12px/1 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        cursor: pointer; opacity: 0.85;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
      }
      #quiet-timeline-toggle:hover { opacity: 1; }
      #quiet-timeline-toggle .qt-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #3fb27f;
      }
      html:not(.${HIDE_CLASS}) #quiet-timeline-toggle .qt-dot {
        background: #64718c;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function whenBodyReady(fn) {
    if (document.body) return fn();
    new MutationObserver((_, obs) => {
      if (document.body) { obs.disconnect(); fn(); }
    }).observe(document.documentElement, { childList: true });
  }

  function addToggle(enabled) {
    // avoid duplicates on GitHub's soft (Turbo) navigations
    if (document.getElementById("quiet-timeline-toggle")) return;

    const btn = document.createElement("button");
    btn.id = "quiet-timeline-toggle";
    btn.type = "button";
    render(btn, enabled);

    btn.addEventListener("click", () => {
      const nowEnabled = !document.documentElement.classList.contains(HIDE_CLASS);
      document.documentElement.classList.toggle(HIDE_CLASS, nowEnabled);
      chrome.storage.local.set({ [KEY_ENABLED]: nowEnabled });
      render(btn, nowEnabled);
    });

    document.body.appendChild(btn);
  }

  function render(btn, enabled) {
    btn.innerHTML = `<span class="qt-dot"></span>${
      enabled ? "Comments only — show timeline" : "Full timeline — hide noise"
    }`;
    btn.setAttribute("aria-pressed", String(enabled));
    btn.title = enabled
      ? "Timeline events are hidden. Click to show everything."
      : "Showing all events. Click to show comments only.";
  }
})();
