/*
 * Eyes follow cursor (#55/#42). Owner: eyes feature agent.
 * Allowed file: features/eyes.js ONLY.
 * Track the pointer over the window and set ONLY --pupil-x / --pupil-y on #octocat
 * (via api.setCssVar). Do not transform the eyes directly (core owns blink).
 * Follows while the pointer is over the cat (transparent-window hit-testing limit).
 */
(function () {
  'use strict';

  const MAX_PUPIL_OFFSET_PX = 4;
  const POINTER_DISTANCE_TO_PUPIL_RATIO = 0.04;

  let pluginApi = null;

  function getRoot() {
    return document.getElementById('octocat');
  }

  function formatPx(value) {
    const normalized = Math.abs(value) < 0.01 ? 0 : value;
    return normalized.toFixed(2).replace(/\.00$/, '') + 'px';
  }

  function setPupilOffset(x, y) {
    const xValue = formatPx(x);
    const yValue = formatPx(y);

    if (pluginApi && typeof pluginApi.setCssVar === 'function') {
      pluginApi.setCssVar('--pupil-x', xValue);
      pluginApi.setCssVar('--pupil-y', yValue);
      return;
    }

    const root = getRoot();
    if (!root || !root.style) return;
    root.style.setProperty('--pupil-x', xValue);
    root.style.setProperty('--pupil-y', yValue);
  }

  function resetPupils() {
    setPupilOffset(0, 0);
  }

  function updatePupils(event) {
    if (!event) return;

    const root = getRoot();
    if (!root || typeof root.getBoundingClientRect !== 'function') return;

    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (!distance) {
      resetPupils();
      return;
    }

    const offset = Math.min(MAX_PUPIL_OFFSET_PX, distance * POINTER_DISTANCE_TO_PUPIL_RATIO);
    setPupilOffset((dx / distance) * offset, (dy / distance) * offset);
  }

  function maybeResetOnLeave(event) {
    if (!event || event.relatedTarget === null) resetPupils();
  }

  function captureApi(api) {
    if (api && !pluginApi) pluginApi = api;
  }

  document.addEventListener('pointermove', updatePupils);
  document.addEventListener('pointerout', maybeResetOnLeave);
  document.addEventListener('mouseleave', maybeResetOnLeave);
  window.addEventListener('mouseout', maybeResetOnLeave);

  if (window.Octocat && typeof window.Octocat.registerPlugin === 'function') {
    window.Octocat.registerPlugin({
      id: 'eyes',
      onEvent: function (_event, api) {
        captureApi(api);
      },
      onIdle: function (api) {
        captureApi(api);
      }
    });
  }
})();
