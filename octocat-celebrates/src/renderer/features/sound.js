/*
 * Sounds & voice (#40). Owner: sound feature agent.
 * Allowed file: features/sound.js ONLY.
 * Meow on commit + periodic purr via the WebAudio API (no asset files).
 * Optional spoken event lines via api.speak({ channel:'event', priority:<low> })
 * so the goblin voice always wins. Register Octocat.registerPlugin({ id:'sound', ... }).
 */
(function () {
  'use strict';

  const PLUGIN_PRIORITY = 30;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;

  function getAudioContext() {
    if (!AudioContextCtor) return null;
    if (!audioContext || audioContext.state === 'closed') {
      try {
        audioContext = new AudioContextCtor();
      } catch (_err) {
        audioContext = null;
      }
    }
    return audioContext;
  }

  function withAudio(play) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const start = () => {
      if (ctx.state === 'closed') return;
      try { play(ctx); }
      catch (_err) { /* Audio should never break Octocat. */ }
    };

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        const resumed = ctx.resume();
        if (resumed && typeof resumed.then === 'function') {
          resumed.then(start).catch(() => {});
          return;
        }
      } catch (_err) {
        return;
      }
    }

    start();
  }

  function connectEnvelope(ctx, duration, volume) {
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.035);
    gain.gain.setValueAtTime(volume, now + duration * 0.42);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(ctx.destination);

    return gain;
  }

  function meow() {
    withAudio((ctx) => {
      const now = ctx.currentTime;
      const duration = 0.34;
      const voice = ctx.createOscillator();
      const throat = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      const throatGain = ctx.createGain();
      const output = connectEnvelope(ctx, duration, 0.075);

      voice.type = 'triangle';
      voice.frequency.setValueAtTime(580, now);
      voice.frequency.exponentialRampToValueAtTime(920, now + 0.11);
      voice.frequency.exponentialRampToValueAtTime(480, now + duration);
      voice.detune.setValueAtTime(-12, now);
      voice.detune.linearRampToValueAtTime(18, now + 0.11);
      voice.detune.linearRampToValueAtTime(-10, now + duration);

      throat.type = 'sine';
      throat.frequency.setValueAtTime(290, now);
      throat.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      throat.frequency.exponentialRampToValueAtTime(250, now + duration);

      voiceGain.gain.setValueAtTime(0.85, now);
      throatGain.gain.setValueAtTime(0.24, now);
      voice.connect(voiceGain).connect(output);
      throat.connect(throatGain).connect(output);

      voice.start(now);
      throat.start(now);
      voice.stop(now + duration + 0.02);
      throat.stop(now + duration + 0.02);
    });
  }

  function chirp() {
    withAudio((ctx) => {
      const now = ctx.currentTime;
      const duration = 0.18;
      const osc = ctx.createOscillator();
      const gain = connectEnvelope(ctx, duration, 0.045);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(1300, now + duration);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    });
  }

  function purr() {
    withAudio((ctx) => {
      const now = ctx.currentTime;
      const duration = 1.5;
      const rumble = ctx.createOscillator();
      const tremolo = ctx.createOscillator();
      const tremoloDepth = ctx.createGain();
      const gain = ctx.createGain();

      rumble.type = 'sawtooth';
      rumble.frequency.setValueAtTime(68, now);
      tremolo.type = 'sine';
      tremolo.frequency.setValueAtTime(27, now);
      tremoloDepth.gain.setValueAtTime(0.018, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.023, now + 0.18);
      gain.gain.setValueAtTime(0.023, now + duration - 0.22);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      tremolo.connect(tremoloDepth).connect(gain.gain);
      rumble.connect(gain).connect(ctx.destination);

      rumble.start(now);
      tremolo.start(now);
      rumble.stop(now + duration + 0.02);
      tremolo.stop(now + duration + 0.02);
    });
  }

  function maybeSpeak(api, text) {
    if (!api || typeof api.speak !== 'function') return;
    api.speak({
      text,
      channel: 'event',
      priority: PLUGIN_PRIORITY,
      pitch: 1.45,
      rate: 1.15
    });
  }

  if (window.Octocat && typeof window.Octocat.registerPlugin === 'function') {
    window.Octocat.registerPlugin({
      id: 'sound',
      priority: PLUGIN_PRIORITY,
      onEvent(event, api) {
        if (!event) return;

        if (event.type === 'post-commit' || event.type === 'post-merge') {
          meow();
          maybeSpeak(api, event.type === 'post-merge' ? 'Mrow, merged!' : 'Meow, nice commit!');
        } else if (event.type === 'pre-push') {
          chirp();
        }
      },
      onIdle() {
        if (Math.random() < 0.25) purr();
      }
    });
  }
})();
