(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const elements = {
    editor: $('editor'), reader: $('reader'), script: $('scriptInput'),
    speed: $('speedInput'), size: $('sizeInput'), mirror: $('mirrorInput'),
    speedValue: $('speedValue'), sizeValue: $('sizeValue'), prompt: $('promptText'),
    scroll: $('scrollArea'), controls: $('readerControls'), countdown: $('countdown'),
    paused: $('pausedBadge'), play: $('playButton'), read: $('readButton'),
    back: $('backButton'), restart: $('restartButton')
  };

  const defaults = {
    script: 'Welcome to your teleprompter.\n\nPaste or type your script, choose a speed and text size, then tap Read.',
    speed: 35,
    size: 52,
    mirror: true
  };

  let state = { playing: false, counting: false, animationId: 0, lastTime: 0, countdownId: 0 };

  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('prompt-settings') || '{}'); } catch (_) {}
    elements.script.value = typeof saved.script === 'string' ? saved.script : defaults.script;
    elements.speed.value = saved.speed || defaults.speed;
    elements.size.value = saved.size || defaults.size;
    elements.mirror.checked = saved.mirror !== false;
    updateLabels();
  }

  function save() {
    localStorage.setItem('prompt-settings', JSON.stringify({
      script: elements.script.value,
      speed: Number(elements.speed.value),
      size: Number(elements.size.value),
      mirror: elements.mirror.checked
    }));
  }

  function updateLabels() {
    elements.speedValue.value = `${elements.speed.value} px/s`;
    elements.sizeValue.value = `${elements.size.value} px`;
  }

  function openReader() {
    save();
    elements.prompt.textContent = elements.script.value.trim() || 'Your script is empty.';
    elements.prompt.style.fontSize = `${elements.size.value}px`;
    elements.prompt.classList.toggle('mirrored', elements.mirror.checked);
    elements.scroll.scrollTop = 0;
    elements.editor.hidden = true;
    elements.reader.hidden = false;
    elements.controls.classList.remove('hidden');
    elements.paused.hidden = true;
    elements.play.textContent = 'Start';
    try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (_) {}
  }

  function closeReader() {
    cancelRun();
    elements.reader.hidden = true;
    elements.editor.hidden = false;
    elements.script.focus();
  }

  function cancelRun() {
    state.playing = false;
    state.counting = false;
    cancelAnimationFrame(state.animationId);
    clearTimeout(state.countdownId);
    elements.countdown.hidden = true;
  }

  function beginCountdown() {
    if (state.counting || state.playing) return;
    state.counting = true;
    elements.controls.classList.add('hidden');
    elements.paused.hidden = true;
    let count = 3;
    elements.countdown.textContent = count;
    elements.countdown.hidden = false;

    const tick = () => {
      count -= 1;
      if (count > 0) {
        elements.countdown.textContent = count;
        state.countdownId = setTimeout(tick, 1000);
      } else {
        elements.countdown.hidden = true;
        state.counting = false;
        startScrolling();
      }
    };
    state.countdownId = setTimeout(tick, 1000);
  }

  function startScrolling() {
    state.playing = true;
    state.lastTime = performance.now();
    elements.play.textContent = 'Pause';
    elements.controls.classList.add('hidden');
    elements.paused.hidden = true;
    state.animationId = requestAnimationFrame(step);
  }

  function step(now) {
    if (!state.playing) return;
    const elapsed = Math.min((now - state.lastTime) / 1000, 0.1);
    state.lastTime = now;
    elements.scroll.scrollTop += Number(elements.speed.value) * elapsed;
    const atEnd = elements.scroll.scrollTop + elements.scroll.clientHeight >= elements.scroll.scrollHeight - 2;
    if (atEnd) {
      pause();
      elements.play.textContent = 'Replay';
      return;
    }
    state.animationId = requestAnimationFrame(step);
  }

  function pause() {
    state.playing = false;
    cancelAnimationFrame(state.animationId);
    elements.play.textContent = 'Resume';
    elements.controls.classList.remove('hidden');
    elements.paused.hidden = false;
  }

  function togglePlayback() {
    if (state.counting) return;
    if (state.playing) pause();
    else if (elements.scroll.scrollTop + elements.scroll.clientHeight >= elements.scroll.scrollHeight - 2) {
      elements.scroll.scrollTop = 0;
      beginCountdown();
    } else if (elements.play.textContent === 'Start') beginCountdown();
    else startScrolling();
  }

  elements.read.addEventListener('click', openReader);
  elements.back.addEventListener('click', closeReader);
  elements.play.addEventListener('click', (event) => { event.stopPropagation(); togglePlayback(); });
  elements.restart.addEventListener('click', (event) => {
    event.stopPropagation();
    cancelRun();
    elements.scroll.scrollTop = 0;
    elements.play.textContent = 'Start';
    elements.paused.hidden = true;
    beginCountdown();
  });
  elements.scroll.addEventListener('click', togglePlayback);
  elements.controls.addEventListener('click', (event) => event.stopPropagation());
  elements.script.addEventListener('input', save);
  [elements.speed, elements.size].forEach((input) => input.addEventListener('input', () => { updateLabels(); save(); }));
  elements.mirror.addEventListener('change', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.playing) pause(); });

  load();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
})();
