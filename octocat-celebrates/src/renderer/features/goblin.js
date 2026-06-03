/*
 * Goblin mode (#44) — HEADLINER. Owner: goblin feature agent.
 * Allowed files: features/goblin.js, features/goblin.css ONLY.
 * Use only the plugin `api` (addClass/removeClass/setCssVar/addOverlay/speak)
 * and your own CSS classes/vars. Do NOT touch pupils or shared SVG nodes directly.
 *
 * Register with Octocat.registerPlugin({ id:'goblin', priority: <high>, onEvent }).
 * Goblin speech should use api.speak({ channel:'event', priority:<high>, pitch:<low> }).
 */
(function () {
  'use strict';

  const EVENT_LINES = {
    'post-commit': 'Hehehe! Fresh loot for my hoard!',
    'post-merge': 'Two treasures become one! Mine, all mine!',
    'pre-push': 'Off to the goblin market! Sending it!',
    'post-checkout': 'A new tunnel to explore... sneaky sneaky.',
    'post-rewrite': 'I rewrote history! Nobody will ever know!'
  };

  const IDLE_MUTTERS = [
    'Shiny branches...',
    'Need more commitses.',
    'Sneak, stash, scurry.',
    'Guard the loot.'
  ];

  function safeCall(fn) {
    try {
      if (typeof fn === 'function') fn();
    } catch (err) {
      console.warn('[goblin] skipped unsafe goblin flourish:', err);
    }
  }

  function createSvgElement(tag, attrs) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach((name) => node.setAttribute(name, attrs[name]));
    return node;
  }

  function buildGoblinOverlay() {
    if (typeof document === 'undefined') return null;

    const svg = createSvgElement('svg', {
      class: 'goblin-overlay',
      viewBox: '0 0 160 176',
      width: '160',
      height: '176',
      'aria-hidden': 'true',
      focusable: 'false'
    });

    const leftEar = createSvgElement('path', {
      class: 'goblin-ear goblin-ear-left',
      d: 'M38 58 L4 36 L30 88 Z'
    });
    const rightEar = createSvgElement('path', {
      class: 'goblin-ear goblin-ear-right',
      d: 'M122 58 L156 36 L130 88 Z'
    });
    const hood = createSvgElement('path', {
      class: 'goblin-hood',
      d: 'M33 42 Q51 8 85 20 Q118 28 130 66 Q104 38 78 44 Q52 38 33 42 Z'
    });
    const hoodPatch = createSvgElement('path', {
      class: 'goblin-hood-patch',
      d: 'M91 23 L111 36 L101 48 Z'
    });
    const grin = createSvgElement('path', {
      class: 'goblin-grin',
      d: 'M68 106 Q80 116 92 106'
    });
    const leftTooth = createSvgElement('path', {
      class: 'goblin-tooth',
      d: 'M74 110 L77 121 L81 111 Z'
    });
    const rightTooth = createSvgElement('path', {
      class: 'goblin-tooth',
      d: 'M84 111 L88 121 L91 110 Z'
    });
    const glowLeft = createSvgElement('ellipse', {
      class: 'goblin-eye-glow',
      cx: '64',
      cy: '86',
      rx: '7',
      ry: '3'
    });
    const glowRight = createSvgElement('ellipse', {
      class: 'goblin-eye-glow',
      cx: '96',
      cy: '86',
      rx: '7',
      ry: '3'
    });

    svg.append(leftEar, rightEar, hood, hoodPatch, glowLeft, glowRight, grin, leftTooth, rightTooth);
    return svg;
  }

  function applyGoblinLook(api) {
    if (!api || typeof api.addClass !== 'function') return;

    safeCall(() => api.addClass('goblin'));

    if (applyGoblinLook.overlayAdded || typeof api.addOverlay !== 'function') return;
    const overlay = buildGoblinOverlay();
    if (!overlay) return;

    safeCall(() => {
      api.addOverlay(overlay);
      applyGoblinLook.overlayAdded = true;
    });
  }

  function speak(api, text, channel, priority) {
    if (!api || typeof api.speak !== 'function' || !text) return;

    safeCall(() => api.speak({
      text,
      channel,
      priority,
      pitch: 0.3,
      rate: 0.9
    }));
  }

  const plugin = {
    id: 'goblin',
    priority: 80,
    onEvent(event, api) {
      applyGoblinLook(api);
      const line = event && EVENT_LINES[event.type];
      speak(api, line, 'event', 80);
    },
    onIdle(api) {
      applyGoblinLook(api);
      if (Math.random() > 0.1) return;
      const line = IDLE_MUTTERS[Math.floor(Math.random() * IDLE_MUTTERS.length)];
      speak(api, line, 'idle', 40);
    }
  };

  if (window.Octocat && typeof window.Octocat.registerPlugin === 'function') {
    window.Octocat.registerPlugin(plugin);
    applyGoblinLook(plugin._api);
  }
})();
