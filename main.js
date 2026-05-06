// --- SVG アイコン ---
const SVG_PAUSE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.4em" height="1.4em"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
const SVG_PLAY  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1.4em" height="1.4em"><path d="M8 5v14l11-7z"/></svg>`;

// --- プリセット秒数 ---
const PRESET_SECONDS = [20, 30, 60, 120, 180, 300, 600];

// --- テキスト定義（ひらがな / 漢字） ---
const TEXTS = {
  hiragana: {
    'btn-goto-timer':       'はじめる',
    'btn-goto-settings':    'せってい',
    'settings-title':       'せってい',
    'label-time':           'タイマーのじかん',
    'label-custom-time':    'じぶんでじかんをきめる',
    'label-min-unit':       'ふん',
    'label-sec-unit':       'びょう',
    'btn-set-custom-time':  'このじかんにする',
    'label-audio':          'おと',
    'label-display':        'ひょうじ',
    'kanji-toggle-label':   'かんじをつかう',
    'audio-record-idle':    '声をろくおんする',
    'audio-record-active':  'ろくおんをとめる',
    'audio-upload-btn':     'ファイルからえらぶ',
    'status-chime':         'じょうたい: デフォルトチャイム',
    'status-blob':          'じょうたい: ろくおんされた こえ',
    'status-prefix':        'じょうたい',
    'btn-back-to-start':    'もどる',
    'btn-start-timer':      'スタート',
    'btn-retry-timer':      'もういっかい',
    'btn-stop-alert':       'とめる',
    'finish-text':          'おしまい',
  },
  kanji: {
    'btn-goto-timer':       '始める',
    'btn-goto-settings':    '設定',
    'settings-title':       '設定',
    'label-time':           'タイマーの時間',
    'label-custom-time':    '自分で時間を決める',
    'label-min-unit':       '分',
    'label-sec-unit':       '秒',
    'btn-set-custom-time':  'この時間にする',
    'label-audio':          '音',
    'label-display':        '表示',
    'kanji-toggle-label':   '漢字を使う',
    'audio-record-idle':    '声を録音する',
    'audio-record-active':  '録音を止める',
    'audio-upload-btn':     'ファイルから選ぶ',
    'status-chime':         '状態: デフォルトチャイム',
    'status-blob':          '状態: 録音された声',
    'status-prefix':        '状態',
    'btn-back-to-start':    '戻る',
    'btn-start-timer':      'スタート',
    'btn-retry-timer':      'もう一回',
    'btn-stop-alert':       '止める',
    'finish-text':          'おしまい',
  }
};

// --- State ---
const state = {
  remainingSeconds: 0,
  totalSeconds: 0,
  isRunning: false,
  isPaused: false,
  timerInterval: null,
  settings: {
    selectedTime: 30,
    audioSrc: 'chime',
    audioFileName: '',
    useKanji: false,
  },
  audioBlob: null
};

// --- DOM ---
const screens       = document.querySelectorAll('.screen');
const flashOverlay  = document.getElementById('flash-overlay');
const timerDisplay  = document.getElementById('timer-display');
const progressBar   = document.getElementById('progress-bar');
const stopBtn       = document.getElementById('btn-stop-alert');
const placeholderText = document.getElementById('placeholder-text');
const finishText    = document.getElementById('finish-text');
const timerVideo    = document.getElementById('timer-video');
const startTimerBtn = document.getElementById('btn-start-timer');
const retryTimerBtn = document.getElementById('btn-retry-timer');
const pauseBtn      = document.getElementById('btn-pause-timer');

// --- 初期化 ---
function init() {
  loadSettings();
  pauseBtn.innerHTML = SVG_PAUSE;
  setupEventListeners();
  updateTimerDisplay(state.settings.selectedTime);
  updateDurationOptionsUI();
  applyTextMode();
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('kamiski-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.settings = { ...state.settings, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

function saveSettings() {
  localStorage.setItem('kamiski-settings', JSON.stringify(state.settings));
}

// --- イベントリスナー ---
function setupEventListeners() {
  document.getElementById('btn-goto-timer').onclick = () => { showScreen('screen-timer'); resetTimerUI(); };
  document.getElementById('btn-goto-settings').onclick = () => showScreen('screen-settings');
  document.getElementById('btn-back-to-start').onclick = () => showScreen('screen-start');

  startTimerBtn.onclick = () => startTimer(state.settings.selectedTime);
  retryTimerBtn.onclick = () => resetTimerUI();
  stopBtn.onclick       = () => showScreen('screen-start');

  // 一時停止 / 再開
  pauseBtn.onclick = () => {
    if (!state.isRunning) return;
    state.isPaused ? resumeTimer() : pauseTimer();
  };

  // ホーム（スタート画面へ）
  document.getElementById('btn-home-timer').onclick = () => showScreen('screen-start');

  // 時間ラジオ
  document.querySelectorAll('input[name="timer-duration"]').forEach(radio => {
    radio.onchange = (e) => {
      state.settings.selectedTime = parseInt(e.target.value);
      saveSettings();
      updateDurationOptionsUI();
    };
  });

  // 任意時間
  document.getElementById('btn-set-custom-time').onclick = () => {
    const m = Math.max(0, Math.min(99, parseInt(document.getElementById('custom-minutes').value) || 0));
    const s = Math.max(0, Math.min(59, parseInt(document.getElementById('custom-seconds').value) || 0));
    const total = m * 60 + s;
    if (total <= 0) return;
    state.settings.selectedTime = total;
    saveSettings();
    updateDurationOptionsUI();
  };

  // 音声
  document.getElementById('audio-record').onclick = toggleRecording;
  document.getElementById('audio-upload-btn').onclick = () => document.getElementById('audio-upload').click();
  document.getElementById('audio-upload').onchange = handleAudioUpload;

  // 漢字トグル
  const kanjiToggle  = document.getElementById('toggle-kanji');
  const kanjiWrapper = document.getElementById('kanji-toggle-wrapper');
  kanjiToggle.checked = state.settings.useKanji;
  kanjiWrapper.classList.toggle('checked', state.settings.useKanji);
  kanjiToggle.onchange = () => {
    state.settings.useKanji = kanjiToggle.checked;
    kanjiWrapper.classList.toggle('checked', kanjiToggle.checked);
    applyTextMode();
    saveSettings();
  };
}

// --- テキストモード ---
function applyTextMode() {
  const t = TEXTS[state.settings.useKanji ? 'kanji' : 'hiragana'];

  const ids = [
    'btn-goto-timer', 'btn-goto-settings', 'settings-title',
    'label-time', 'label-custom-time', 'label-min-unit', 'label-sec-unit',
    'btn-set-custom-time', 'label-audio', 'label-display',
    'kanji-toggle-label', 'audio-upload-btn',
    'btn-back-to-start', 'btn-start-timer', 'btn-retry-timer', 'btn-stop-alert',
    'finish-text',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = t[id];
  });

  // ラジオボタンのラベル（data-hiragana / data-kanji 属性から更新）
  const attrKey = state.settings.useKanji ? 'data-kanji' : 'data-hiragana';
  document.querySelectorAll('.neon-radio-label[data-hiragana]').forEach(label => {
    const span = label.querySelector('.duration-label');
    if (span) span.textContent = label.getAttribute(attrKey);
  });

  const recordBtn = document.getElementById('audio-record');
  if (recordBtn) {
    recordBtn.textContent = recordBtn.dataset.recording === 'true'
      ? t['audio-record-active'] : t['audio-record-idle'];
  }

  const audioStatus = document.getElementById('audio-status');
  if (audioStatus) {
    if (state.settings.audioSrc === 'chime') {
      audioStatus.textContent = t['status-chime'];
    } else if (state.settings.audioSrc === 'blob') {
      audioStatus.textContent = t['status-blob'];
    } else if (state.settings.audioSrc === 'file' && state.settings.audioFileName) {
      audioStatus.textContent = `${t['status-prefix']}: ${state.settings.audioFileName}`;
    }
  }
}

// --- 画面管理 ---
function showScreen(screenId) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (screenId === 'screen-start') resetApp();
}

// --- タイマーロジック ---
function startTimer(seconds) {
  if (state.isRunning) return;
  state.totalSeconds = seconds;
  state.remainingSeconds = seconds;
  state.isRunning = true;
  state.isPaused = false;

  startTimerBtn.classList.add('hidden');
  retryTimerBtn.classList.add('hidden');
  stopBtn.classList.add('hidden');
  if (finishText)      finishText.classList.add('hidden');
  if (placeholderText) placeholderText.classList.add('hidden');

  updatePauseBtn(false);

  if (timerVideo) {
    timerVideo.src = './assets/timer_video.mp4';
    timerVideo.classList.remove('hidden');
    timerVideo.currentTime = 0;
    timerVideo.play().catch(e => console.warn("Video play failed:", e));
  }

  updateTimerDisplay(state.remainingSeconds);
  updateProgressBar();
  tick();
}

function tick() {
  state.timerInterval = setInterval(() => {
    state.remainingSeconds--;
    updateTimerDisplay(state.remainingSeconds);
    updateProgressBar();
    if (state.remainingSeconds <= 0) finishTimer();
  }, 1000);
}

function pauseTimer() {
  if (!state.isRunning || state.isPaused) return;
  state.isPaused = true;
  clearInterval(state.timerInterval);
  if (timerVideo) timerVideo.pause();
  updatePauseBtn(true);
}

function resumeTimer() {
  if (!state.isRunning || !state.isPaused) return;
  state.isPaused = false;
  if (timerVideo) timerVideo.play().catch(() => {});
  updatePauseBtn(false);
  tick();
}

function updatePauseBtn(isPaused) {
  if (!pauseBtn) return;
  pauseBtn.innerHTML = isPaused ? SVG_PLAY : SVG_PAUSE;
  pauseBtn.classList.toggle('is-paused', isPaused);
  pauseBtn.setAttribute('aria-label', isPaused ? '再開' : '一時停止');
}

function finishTimer() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.isPaused  = false;

  if (timerVideo) {
    timerVideo.pause();
    timerVideo.classList.add('hidden');
  }

  updatePauseBtn(false);
  playAlert();
  startFlashing();

  stopBtn.classList.remove('hidden');
  retryTimerBtn.classList.remove('hidden');

  if (finishText) {
    finishText.textContent = TEXTS[state.settings.useKanji ? 'kanji' : 'hiragana']['finish-text'];
    finishText.classList.remove('hidden');
  }
  if (placeholderText) placeholderText.classList.add('hidden');
}

function resetApp() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.isPaused  = false;

  if (timerVideo) { timerVideo.pause(); timerVideo.classList.add('hidden'); }

  stopFlashing();
  stopSound();
  resetProgressBar();
  updateTimerDisplay(0);
  resetTimerUI();
}

function resetTimerUI() {
  stopBtn.classList.add('hidden');
  retryTimerBtn.classList.add('hidden');
  startTimerBtn.classList.remove('hidden');
  if (finishText)      finishText.classList.add('hidden');
  if (placeholderText) placeholderText.classList.remove('hidden');

  updatePauseBtn(false);
  updateTimerDisplay(state.settings.selectedTime);
  resetProgressBar();
  stopFlashing();
  stopSound();
}

// --- UI 更新 ---
function updateTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
  const percent = state.totalSeconds > 0
    ? (state.remainingSeconds / state.totalSeconds) * 100 : 100;
  progressBar.style.width = `${percent}%`;

  if (percent > 50) {
    progressBar.style.backgroundColor = '#00ff00';
    progressBar.style.boxShadow = '0 0 18px #00ff00, 0 0 36px #00ff00';
    progressBar.classList.remove('progress-urgent');
  } else if (percent > 20) {
    progressBar.style.backgroundColor = '#ffff00';
    progressBar.style.boxShadow = '0 0 18px #ffff00, 0 0 36px #ffff00';
    progressBar.classList.remove('progress-urgent');
  } else {
    progressBar.style.backgroundColor = '#ff00ff';
    progressBar.style.boxShadow = '0 0 18px #ff00ff, 0 0 36px #ff00ff';
    progressBar.classList.add('progress-urgent');
  }
}

function resetProgressBar() {
  progressBar.style.width = '100%';
  progressBar.style.backgroundColor = '#00ff00';
  progressBar.style.boxShadow = '0 0 18px #00ff00, 0 0 36px #00ff00';
  progressBar.classList.remove('progress-urgent');
}

function updateDurationOptionsUI() {
  const isPreset = PRESET_SECONDS.includes(state.settings.selectedTime);
  document.querySelectorAll('input[name="timer-duration"]').forEach(radio => {
    const label = radio.parentElement;
    const isSelected = isPreset && parseInt(radio.value) === state.settings.selectedTime;
    radio.checked = isSelected;
    label.classList.toggle('checked', isSelected);
  });
  syncCustomTimeInputs();
}

function syncCustomTimeInputs() {
  const total = state.settings.selectedTime;
  const minEl = document.getElementById('custom-minutes');
  const secEl = document.getElementById('custom-seconds');
  if (minEl) minEl.value = Math.floor(total / 60);
  if (secEl) secEl.value = total % 60;
}

// --- フラッシュ ---
function startFlashing() {
  flashOverlay.classList.remove('flash-once');
  void flashOverlay.offsetWidth;
  flashOverlay.classList.add('flash-once');
}

function stopFlashing() {
  flashOverlay.classList.remove('flash-once');
  flashOverlay.style.opacity = '0';
}

// --- アラーム音 ---
let activeAudio = null;

function playAlert() {
  if (state.settings.audioSrc === 'chime') {
    playAlarm();
  } else if (state.audioBlob) {
    try {
      const url = URL.createObjectURL(state.audioBlob);
      activeAudio = new Audio(url);
      activeAudio.loop = true;
      activeAudio.play();
    } catch (e) {
      playAlarm();
    }
  }
}

function stopSound() {
  if (activeAudio) {
    if (activeAudio.pause) activeAudio.pause();
    activeAudio = null;
  }
}

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    master.gain.value = 0.28;

    // ビープ×3 を 1.6 秒おきに 10 サイクル（約 16 秒）
    for (let cycle = 0; cycle < 10; cycle++) {
      const base = ctx.currentTime + cycle * 1.6;
      [0, 0.28, 0.56].forEach(offset => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g);
        g.connect(master);
        osc.type = 'sine';
        osc.frequency.value = 880;
        const t = base + offset;
        g.gain.setValueAtTime(1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    }

    activeAudio = {
      pause: () => {
        try {
          master.gain.setValueAtTime(0, ctx.currentTime);
          setTimeout(() => ctx.close().catch(() => {}), 150);
        } catch (e) {}
      }
    };
  } catch (e) {
    console.warn("Audio not supported:", e);
  }
}

// --- 録音 ---
let mediaRecorder;
let audioChunks = [];

async function toggleRecording() {
  const btn = document.getElementById('audio-record');
  const t = TEXTS[state.settings.useKanji ? 'kanji' : 'hiragana'];

  if (btn.dataset.recording !== 'true') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const tStop = TEXTS[state.settings.useKanji ? 'kanji' : 'hiragana'];
      state.audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
      state.settings.audioSrc = 'blob';
      state.settings.audioFileName = '';
      document.getElementById('audio-status').textContent = tStop['status-blob'];
      saveSettings();
    };
    audioChunks = [];
    mediaRecorder.start();
    btn.dataset.recording = 'true';
    btn.textContent = t['audio-record-active'];
    btn.style.color = 'red';
  } else {
    mediaRecorder.stop();
    btn.dataset.recording = 'false';
    btn.textContent = t['audio-record-idle'];
    btn.style.color = 'white';
  }
}

function handleAudioUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const t = TEXTS[state.settings.useKanji ? 'kanji' : 'hiragana'];
  state.audioBlob = file;
  state.settings.audioSrc = 'file';
  state.settings.audioFileName = file.name;
  document.getElementById('audio-status').textContent = `${t['status-prefix']}: ${file.name}`;
  saveSettings();
}

// --- 起動 ---
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
  } catch (err) {
    console.error("Initialization error:", err);
    document.body.style.backgroundColor = "navy";
    alert("アプリの起動に失敗しました。再読み込みしてください。");
  }
});
