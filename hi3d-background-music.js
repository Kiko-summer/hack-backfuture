(() => {
  'use strict';

  const key = 'lightwall.music.v1';
  const track = new URL('./cave-assets/audio/hi3d-deep-light.mp3', document.currentScript?.src || document.baseURI).href;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch {}
  let enabled = saved.enabled !== false;
  let volume = typeof saved.volume === 'number' && Number.isFinite(saved.volume)
    ? Math.min(1, Math.max(0, saved.volume)) : 0.45;
  let interacted = false;
  let state = enabled ? 'ready' : 'off';
  let revision = 0;
  let loadingTimer;

  const style = document.createElement('style');
  style.textContent = `
    #music-controls { position: fixed; z-index: 4; right: max(24px, env(safe-area-inset-right)); bottom: max(20px, env(safe-area-inset-bottom)); display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 3px 11px 3px 4px; border: 1px solid #81968b80; border-radius: 9px; background: #071412ed; color: #e5f0e7; font: 12px/1.5 system-ui, sans-serif; }
    #music-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 102px; min-height: 38px; padding: 4px 9px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; cursor: pointer; touch-action: manipulation; }
    #music-toggle:hover { background: #295249; }
    #music-toggle:focus-visible, #music-volume:focus-visible { outline: 2px solid #d0eace; outline-offset: 3px; }
    #music-volume { width: 72px; accent-color: #adc8ac; cursor: pointer; }
    .music-volume-label { display: flex; align-items: center; gap: 6px; }
    #music-message { position: absolute; right: 0; bottom: calc(100% + 7px); width: max-content; max-width: min(300px, 90vw); padding: 7px 10px; border-radius: 6px; background: #071412ed; color: #ffdfb0; }
    #music-message[hidden], #music-download[hidden] { display: none; }
    #music-download { color: #d0eace; margin-left: 8px; }
    #status { max-width: calc(100vw - 310px); }
    @media (max-width: 670px) {
      #music-controls { right: max(12px, env(safe-area-inset-right)); bottom: max(76px, calc(env(safe-area-inset-bottom) + 60px)); }
      #status { max-width: calc(100vw - 36px); }
    }
  `;
  document.head.append(style);

  const controls = document.createElement('aside');
  controls.id = 'music-controls';
  controls.setAttribute('aria-label', '背景音乐');
  controls.innerHTML = `
    <button id="music-toggle" type="button" aria-pressed="false"><span aria-hidden="true">♫</span><span id="music-label">开启音乐</span></button>
    <label class="music-volume-label">音量<input id="music-volume" type="range" min="0" max="100" step="1" aria-label="背景音乐音量"></label>
    <span id="music-message" role="status" aria-live="polite" hidden><span id="music-error"></span><a id="music-download" download="hi3d-deep-light.mp3" hidden>下载音乐</a></span>
  `;
  document.body.append(controls);
  const button = controls.querySelector('#music-toggle');
  const label = controls.querySelector('#music-label');
  const slider = controls.querySelector('#music-volume');
  const message = controls.querySelector('#music-message');
  const errorText = controls.querySelector('#music-error');
  const download = controls.querySelector('#music-download');
  download.href = track;

  const audio = document.createElement('audio');
  audio.id = 'background-music';
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = volume;
  audio.setAttribute('aria-hidden', 'true');
  document.body.append(audio);
  slider.value = String(Math.round(volume * 100));

  function save() {
    try { localStorage.setItem(key, JSON.stringify({ enabled, volume })); } catch {}
  }

  function render() {
    controls.dataset.state = state;
    const on = enabled && interacted && state !== 'error' && state !== 'blocked';
    button.setAttribute('aria-pressed', String(on));
    label.textContent = state === 'error' ? '重试音乐' : state === 'loading' ? '音乐加载中' :
      !enabled ? '音乐关' : !interacted || state === 'blocked' ? '开启音乐' : '音乐开';
    button.title = state === 'ready' ? '点击或开始移动后播放「深处的微光」' :
      on ? '关闭背景音乐' : '播放背景音乐「深处的微光」';
    slider.title = `${Math.round(volume * 100)}%`;
    slider.setAttribute('aria-valuetext', `${Math.round(volume * 100)}%`);
  }

  function fail(text) {
    state = 'error';
    errorText.textContent = text;
    message.hidden = false;
    download.hidden = false;
    render();
  }

  async function play() {
    if (!enabled || document.hidden) return;
    const attempt = ++revision;
    clearTimeout(loadingTimer);
    if (!audio.src || audio.error) {
      audio.src = track;
      audio.load();
    }
    state = 'loading';
    message.hidden = true;
    download.hidden = true;
    render();
    loadingTimer = setTimeout(() => {
      if (revision !== attempt || state !== 'loading') return;
      ++revision;
      audio.pause();
      fail('音乐加载超时，可重试或下载。');
    }, 20000);
    try {
      await audio.play();
      if (revision !== attempt) return;
      clearTimeout(loadingTimer);
      if (!enabled || document.hidden) { audio.pause(); return; }
      state = 'playing';
      render();
    } catch (error) {
      if (revision !== attempt) return;
      clearTimeout(loadingTimer);
      if (error.name === 'NotAllowedError') {
        state = 'blocked';
        render();
      } else if (error.name !== 'AbortError') {
        fail('音乐暂不可用，可重试或下载。');
      }
    }
  }

  function pause(nextState) {
    ++revision;
    clearTimeout(loadingTimer);
    audio.pause();
    state = nextState;
    render();
  }

  button.addEventListener('click', () => {
    if (!interacted || !enabled || state === 'error' || state === 'blocked') {
      interacted = true;
      enabled = true;
      save();
      play();
    } else {
      enabled = false;
      save();
      message.hidden = true;
      pause('off');
    }
  });

  slider.addEventListener('input', () => {
    volume = Number(slider.value) / 100;
    audio.volume = volume;
    save();
    render();
  });

  function unlock(event) {
    if (interacted || !enabled || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest('#music-controls, input, textarea, select, button, a')) return;
    if (event.type === 'keydown' && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'KeyQ', 'Space'].includes(event.code)) return;
    interacted = true;
    play();
  }
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(enabled ? 'background' : 'off');
    else if (enabled && interacted) play();
  });
  window.addEventListener('pagehide', () => pause(enabled ? 'background' : 'off'));
  window.addEventListener('pageshow', event => {
    if (event.persisted && enabled && interacted) play();
  });
  audio.addEventListener('error', () => {
    if (enabled && interacted && !document.hidden) {
      ++revision;
      clearTimeout(loadingTimer);
      fail('音乐文件加载失败，可重试或下载。');
    }
  });
  render();
})();
