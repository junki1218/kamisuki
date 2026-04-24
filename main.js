import '/style.css';

// --- State Management ---
const state = {
  remainingSeconds: 0,
  totalSeconds: 0,
  isRunning: false,
  timerInterval: null,
  settings: {
    selectedTime: 30, // Default timer duration
    flashPattern: 'default',
    audioSrc: 'chime',
    presetImages: ['/assets/celebration1.png', '/assets/celebration2.png']
  },
  audioBlob: null
};

// --- DOM Elements ---
const screens = document.querySelectorAll('.screen');
const flashOverlay = document.getElementById('flash-overlay');
const timerDisplay = document.getElementById('timer-display');
const progressBar = document.getElementById('progress-bar');
const stopBtn = document.getElementById('btn-stop-alert');
const celebrationImg = document.getElementById('celebration-img');
const placeholderText = document.getElementById('placeholder-text');
const timerVideo = document.getElementById('timer-video');
const startTimerBtn = document.getElementById('btn-start-timer');
const retryTimerBtn = document.getElementById('btn-retry-timer');

// --- Initialization ---
function init() {
  loadSettings();
  setupEventListeners();
  updateTimerDisplay(0);
  updateDurationOptionsUI();
  
  document.getElementById('thumb-1').src = state.settings.presetImages[0];
  document.getElementById('thumb-2').src = state.settings.presetImages[1];
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

function setupEventListeners() {
  // Navigation
  document.getElementById('btn-goto-timer').onclick = () => {
    showScreen('screen-timer');
    resetTimerUI(); // Prepare timer screen
  };
  document.getElementById('btn-goto-settings').onclick = () => showScreen('screen-settings');
  document.getElementById('btn-back-to-start').onclick = () => showScreen('screen-start');

  // Timer Controls
  startTimerBtn.onclick = () => startTimer(state.settings.selectedTime);
  retryTimerBtn.onclick = () => resetTimerUI();

  // Settings
  document.querySelectorAll('input[name="timer-duration"]').forEach(radio => {
    radio.onchange = (e) => {
      state.settings.selectedTime = parseInt(e.target.value);
      saveSettings();
      updateDurationOptionsUI(); // Update UI immediately
    };
  });

  // Audio recording
  document.getElementById('audio-record').onclick = toggleRecording;
  document.getElementById('audio-upload-btn').onclick = () => document.getElementById('audio-upload').click();
  document.getElementById('audio-upload').onchange = handleAudioUpload;

  // Stop button
  stopBtn.onclick = () => showScreen('screen-start');
}

// --- Screen Management ---
function showScreen(screenId) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  if (screenId === 'screen-start') {
    resetApp();
  }
}

// --- Timer Logic ---
function startTimer(seconds) {
  if (state.isRunning) return;
  state.totalSeconds = seconds;
  state.remainingSeconds = seconds;
  state.isRunning = true;
  
  startTimerBtn.classList.add('hidden');
  retryTimerBtn.classList.add('hidden');
  stopBtn.classList.add('hidden');
  celebrationImg.classList.add('hidden');
  if (placeholderText) {
    placeholderText.classList.add('hidden');
  }
  
  if (timerVideo) {
    timerVideo.src = '/assets/timer_video.mp4';
    timerVideo.classList.remove('hidden');
    timerVideo.currentTime = 0;
    timerVideo.play().catch(e => console.warn("Video play failed:", e));
  }

  updateTimerDisplay(state.remainingSeconds);
  updateProgressBar();

  state.timerInterval = setInterval(() => {
    state.remainingSeconds--;
    updateTimerDisplay(state.remainingSeconds);
    updateProgressBar();

    if (state.remainingSeconds <= 0) {
      finishTimer();
    }
  }, 1000);
}

function finishTimer() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  
  if (timerVideo) {
    timerVideo.pause();
    timerVideo.classList.add('hidden');
  }

  playAlert();
  startFlashing();
  stopBtn.classList.remove('hidden');
  retryTimerBtn.classList.remove('hidden');
  
  // Show random celebration image if available
  if (state.settings.presetImages[0]) {
    celebrationImg.src = state.settings.presetImages[Math.floor(Math.random() * 2)] || state.settings.presetImages[0];
    celebrationImg.classList.remove('hidden');
    if (placeholderText) {
      placeholderText.classList.add('hidden');
    }
  }
}

function resetApp() {
  clearInterval(state.timerInterval);
  state.isRunning = false;
  state.remainingSeconds = 0;
  
  if (timerVideo) {
    timerVideo.pause();
    timerVideo.classList.add('hidden');
  }

  updateTimerDisplay(0);
  progressBar.style.width = '100%'; // Reset progress bar visually
  stopFlashing();
  stopSound();
  
  resetTimerUI();
}

function resetTimerUI() {
  // Reset buttons and displays for a new timer run
  stopBtn.classList.add('hidden');
  retryTimerBtn.classList.add('hidden');
  startTimerBtn.classList.remove('hidden');
  celebrationImg.classList.add('hidden');
  if (placeholderText) {
    placeholderText.classList.remove('hidden');
  }

  updateTimerDisplay(state.settings.selectedTime);
  progressBar.style.width = '100%';
  
  stopFlashing();
  stopSound();
}


// --- UI Updates ---
function updateTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
  const percent = state.totalSeconds > 0 ? (state.remainingSeconds / state.totalSeconds) * 100 : 100;
  progressBar.style.width = `${percent}%`;
}

function updateDurationOptionsUI() {
  const radios = document.querySelectorAll('input[name="timer-duration"]');
  radios.forEach(radio => {
    const label = radio.parentElement;
    if (parseInt(radio.value) === state.settings.selectedTime) {
      radio.checked = true;
      label.classList.add('checked');
    } else {
      label.classList.remove('checked');
    }
  });
}

// --- Feedback Effects ---
let activeAudio = null;
let flashInterval = null;

function playAlert() {
  if (state.settings.audioSrc === 'chime') {
    playChime();
  } else if (state.audioBlob) {
    const url = URL.createObjectURL(state.audioBlob);
    activeAudio = new Audio(url);
    activeAudio.loop = true;
    activeAudio.play();
  }
}

function stopSound() {
  if (activeAudio) {
    if (activeAudio.pause) activeAudio.pause();
    activeAudio = null;
  }
}

function playChime() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
  osc.start();
  osc.stop(ctx.currentTime + 1);
  activeAudio = { pause: () => { try { osc.stop(); } catch(e) {} } }; 
}

function startFlashing() {
  const sequence = ['black', 'white', 'img1', 'img2'];
  let step = 0;
  
  flashInterval = setInterval(() => {
    const current = sequence[step % sequence.length];
    flashOverlay.classList.remove('active-white', 'active-img');
    flashOverlay.style.backgroundImage = '';
    
    if (current === 'white') {
      flashOverlay.classList.add('active-white');
    } else if (current === 'img1' || current === 'img2') {
      const imgUrl = current === 'img1' ? state.settings.presetImages[0] : state.settings.presetImages[1];
      if (imgUrl) {
        flashOverlay.classList.add('active-img');
        flashOverlay.style.backgroundImage = `url(${imgUrl})`;
      }
    }
    flashOverlay.style.opacity = current === 'black' ? '0' : '1';

    step++;
  }, 500);
}

function stopFlashing() {
  clearInterval(flashInterval);
  flashOverlay.classList.remove('active-white', 'active-img');
  flashOverlay.style.opacity = '0';
  flashOverlay.style.backgroundImage = '';
}

// --- Audio Functions ---
let mediaRecorder;
let audioChunks = [];

async function toggleRecording() {
  const btn = document.getElementById('audio-record');
  if (btn.innerText === '声をろくおんする') {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      state.audioBlob = new Blob(audioChunks, { type: 'audio/ogg; codecs=opus' });
      state.settings.audioSrc = 'blob';
      document.getElementById('audio-status').innerText = 'じょうたい: ろくおんされた こえ';
      saveSettings();
    };
    audioChunks = [];
    mediaRecorder.start();
    btn.innerText = 'ろくおんをとめる';
    btn.style.color = 'red';
  } else {
    mediaRecorder.stop();
    btn.innerText = '声をろくおんする';
    btn.style.color = 'white';
  }
}

function handleAudioUpload(e) {
  const file = e.target.files[0];
  if (file) {
    state.audioBlob = file;
    state.settings.audioSrc = 'file';
    document.getElementById('audio-status').innerText = `じょうたい: ${file.name}`;
    saveSettings();
  }
}

// Start when DOM is fully loaded
window.addEventListener('load', () => {
  try {
    init();
  } catch (err) {
    console.error("Initialization error:", err);
    document.body.style.backgroundColor = "navy";
    alert("アプリの起動に失敗しました。再読み込みしてください。");
  }
});