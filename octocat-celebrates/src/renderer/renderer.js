/*
 * Octocat core runtime.
 *
 * Provides the plugin API that Phase 1 feature modules build on. Feature files
 * live in features/ and must ONLY use the restricted `api` passed to their hooks
 * plus their own CSS variables/classes. They must not edit this file.
 *
 * Public surface (window.Octocat):
 *   Octocat.registerPlugin({ id, priority?, onEvent?(event, api), onIdle?(api) })
 *   Octocat.speak({ text, pluginId, priority?, channel?, pitch?, rate?, voice? })
 *   Octocat.version
 *
 * The `api` object handed to plugin hooks is intentionally narrow:
 *   api.addClass(cls) / api.removeClass(cls)   -> toggles class on #octocat root
 *   api.setCssVar(name, value)                 -> sets a CSS var on #octocat root
 *   api.addOverlay(node)                       -> appends a node into #overlay
 *   api.speak(opts)                            -> speech arbiter (auto-fills pluginId)
 *   api.root                                   -> the #octocat element (read-only use)
 */
(function () {
  'use strict';

  const octocat = document.getElementById('octocat');
  const overlay = document.getElementById('overlay');
  const bubble = document.getElementById('bubble');
  const bubbleText = document.getElementById('bubble-text');
  const confetti = document.getElementById('confetti');

  const ANIMATION_CLASSES = ['commit', 'merge', 'push', 'checkout', 'rewrite'];

  const EVENT_CONFIG = {
    'post-commit':   { cls: 'commit',   text: 'Nice commit! ✅',     confetti: true },
    'post-merge':    { cls: 'merge',    text: 'Merged! 🎉',          confetti: true },
    'pre-push':      { cls: 'push',     text: 'Shipping it! 🚀',     confetti: false },
    'post-checkout': { cls: 'checkout', text: 'New branch? 👀',      confetti: false },
    'post-rewrite':  { cls: 'rewrite',  text: 'History rewritten 🌀', confetti: false }
  };

  const COLORS = ['#2da44e', '#0969da', '#bf3989', '#fb8f44', '#8250df', '#f0c419'];

  let resetTimer = null;

  function clearAnimation() {
    octocat.classList.remove(...ANIMATION_CLASSES);
    void octocat.offsetWidth; // force reflow so the same animation can replay
    octocat.classList.add('idle');
  }

  function showBubble(text) {
    bubbleText.textContent = text;
    bubble.classList.remove('hidden');
  }

  function hideBubble() {
    bubble.classList.add('hidden');
  }

  function burstConfetti() {
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = 45 + Math.random() * 10 + '%';
      piece.style.background = COLORS[i % COLORS.length];
      piece.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      piece.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
      piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      confetti.appendChild(piece);
      requestAnimationFrame(() => piece.classList.add('go'));
      setTimeout(() => piece.remove(), 1000);
    }
  }

  /* ----------------------------- Speech arbiter ----------------------------- */
  // One utterance at a time. For a given `channel`, a higher-priority request
  // supersedes a lower-priority one that is queued/active, so e.g. the goblin
  // voice wins over generic event narration and they never talk over each other.
  const speech = {
    supported: typeof window.speechSynthesis !== 'undefined',
    current: null,   // { channel, priority }
    queue: []
  };

  function speak(opts) {
    if (!opts || !opts.text) return;
    if (!speech.supported) return;

    const req = {
      text: String(opts.text),
      pluginId: opts.pluginId || 'unknown',
      priority: typeof opts.priority === 'number' ? opts.priority : 0,
      channel: opts.channel || 'default',
      pitch: typeof opts.pitch === 'number' ? opts.pitch : 1,
      rate: typeof opts.rate === 'number' ? opts.rate : 1,
      voice: opts.voice || null
    };

    // Same-channel arbitration against whatever is currently speaking.
    if (speech.current && speech.current.channel === req.channel) {
      if (req.priority > speech.current.priority) {
        window.speechSynthesis.cancel();
        speech.current = null;
      } else {
        // A higher/equal-priority utterance already owns this channel; drop it.
        return;
      }
    }

    speech.queue.push(req);
    drainSpeech();
  }

  function drainSpeech() {
    if (!speech.supported || speech.current || speech.queue.length === 0) return;
    speech.queue.sort((a, b) => b.priority - a.priority); // highest priority first
    const req = speech.queue.shift();
    speech.current = { channel: req.channel, priority: req.priority };

    const utt = new SpeechSynthesisUtterance(req.text);
    utt.pitch = req.pitch;
    utt.rate = req.rate;
    if (req.voice) {
      const match = window.speechSynthesis.getVoices().find((v) => v.name === req.voice);
      if (match) utt.voice = match;
    }
    const done = () => {
      speech.current = null;
      drainSpeech();
    };
    utt.onend = done;
    utt.onerror = done;
    window.speechSynthesis.speak(utt);
  }

  /* ------------------------------ Plugin system ----------------------------- */
  const plugins = [];

  function makeApi(pluginId) {
    return {
      root: octocat,
      addClass: (cls) => octocat.classList.add(cls),
      removeClass: (cls) => octocat.classList.remove(cls),
      setCssVar: (name, value) => octocat.style.setProperty(name, value),
      addOverlay: (node) => overlay.appendChild(node),
      speak: (opts) => speak(Object.assign({ pluginId }, opts))
    };
  }

  function registerPlugin(plugin) {
    if (!plugin || !plugin.id) {
      console.warn('[octocat] registerPlugin requires an id');
      return;
    }
    plugin.priority = typeof plugin.priority === 'number' ? plugin.priority : 0;
    plugin._api = makeApi(plugin.id);
    plugins.push(plugin);
    console.log(`[octocat] plugin registered: ${plugin.id} (priority ${plugin.priority})`);
  }

  function dispatchEvent(event) {
    // Highest-priority first so high-priority speech claims its channel first.
    const ordered = plugins.slice().sort((a, b) => b.priority - a.priority);
    for (const p of ordered) {
      if (typeof p.onEvent === 'function') {
        try { p.onEvent(event, p._api); }
        catch (err) { console.error(`[octocat] plugin ${p.id} onEvent error:`, err); }
      }
    }
  }

  function dispatchIdle() {
    for (const p of plugins) {
      if (typeof p.onIdle === 'function') {
        try { p.onIdle(p._api); }
        catch (err) { console.error(`[octocat] plugin ${p.id} onIdle error:`, err); }
      }
    }
  }

  /* -------------------------------- Core loop ------------------------------- */
  function celebrate(type) {
    const cfg = EVENT_CONFIG[type];
    if (!cfg) return;

    if (resetTimer) clearTimeout(resetTimer);

    octocat.classList.remove('idle', ...ANIMATION_CLASSES);
    void octocat.offsetWidth;
    octocat.classList.add(cfg.cls);

    showBubble(cfg.text);
    if (cfg.confetti) burstConfetti();

    dispatchEvent({ type, config: cfg });

    resetTimer = setTimeout(() => {
      clearAnimation();
      hideBubble();
    }, 2600);
  }

  // Idle blink loop. Core owns blink; the eyes feature only writes --pupil-x/y.
  function scheduleBlink() {
    const delay = 2500 + Math.random() * 3000;
    setTimeout(() => {
      if (octocat.classList.contains('idle')) {
        octocat.classList.add('blink');
        setTimeout(() => octocat.classList.remove('blink'), 160);
      }
      dispatchIdle();
      scheduleBlink();
    }, delay);
  }
  scheduleBlink();

  if (window.octocat && window.octocat.onGitEvent) {
    window.octocat.onGitEvent(({ type }) => celebrate(type));
  }

  const closeBtn = document.getElementById('close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.octocat) window.octocat.quit();
    });
  }

  /* ------------------------------ Public export ----------------------------- */
  window.Octocat = {
    version: 2,
    registerPlugin,
    speak,
    // Manual testing from devtools: Octocat.test('post-commit')
    test: celebrate
  };
  // Back-compat for round-1 devtools usage.
  window.__test = celebrate;
})();
