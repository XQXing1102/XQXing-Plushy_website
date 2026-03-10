document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const timeDisplay = document.getElementById('time-display');
  const modeDisplay = document.getElementById('mode-display');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resetBtn = document.getElementById('reset-btn');
  const modeBtns = document.querySelectorAll('.mode-btn');
  
  const timerContainer = document.querySelector('.timer-container');
  const progressCircle = document.getElementById('progress-circle');
  const glowRing = document.querySelector('.glow-ring');
  
  const pomodorosCountEl = document.getElementById('pomodoros-count');
  const focusTimeEl = document.getElementById('focus-time');
  
  const settingsModal = document.getElementById('settings-modal');
  const settingsOpenBtn = document.getElementById('settings-open-btn');
  const settingsCloseBtn = document.getElementById('settings-close-x');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  
  const settingPomodoro = document.getElementById('setting-pomodoro');
  const settingShortBreak = document.getElementById('setting-shortBreak');
  const settingLongBreak = document.getElementById('setting-longBreak');

  // SVG Circle calculation setup
  // Wait a small bit to ensure bounding box is calculated if needed,
  // but we hardcoded r=135 for desktop. Let's get r dynamically:
  const getRadius = () => parseFloat(progressCircle.getAttribute('r'));
  let circumference = 2 * Math.PI * getRadius();
  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = 0;

  // Window resize handler to update circumference
  window.addEventListener('resize', () => {
    circumference = 2 * Math.PI * getRadius();
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    updateProgressRing();
  });

  // State
  let timerInterval = null;
  let timeLeft = 0; // in seconds
  let totalTime = 0; // target time in seconds
  let currentMode = 'pomodoro';
  let isRunning = false;
  
  // Settings (in minutes)
  const MODES = {
    pomodoro: { time: 25, color: '#ff6b6b', label: 'Focus Mode' },
    shortBreak: { time: 5, color: '#4ecdc4', label: 'Short Break' },
    longBreak: { time: 15, color: '#45b7d1', label: 'Long Break' }
  };
  
  // Stats
  let stats = {
    pomodorosToday: 0,
    focusMinutesToday: 0,
    lastDate: new Date().toDateString()
  };

  // Audio Context for beep sound
  let audioCtx = null;

  function init() {
    loadSettings();
    loadStats();
    setMode('pomodoro');
    setupEventListeners();
  }

  function setupEventListeners() {
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    
    modeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (isRunning) {
          if(!confirm("Timer is running. Are you sure you want to switch modes?")) return;
        }
        setMode(e.target.dataset.mode);
      });
    });

    settingsOpenBtn.addEventListener('click', openSettings);
    settingsCloseBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
  }

  function setMode(modeId) {
    pauseTimer();
    currentMode = modeId;
    
    // Update UI Buttons
    modeBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-mode="${modeId}"]`).classList.add('active');
    
    const modeConfig = MODES[modeId];
    modeDisplay.textContent = modeConfig.label;
    
    // Set Theme colors
    progressCircle.style.stroke = modeConfig.color;
    glowRing.style.background = modeConfig.color;
    
    // Reset Time
    totalTime = modeConfig.time * 60;
    timeLeft = totalTime;
    
    updateDisplay();
    updateProgressRing();
  }

  function updateDisplay() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    timeDisplay.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    document.title = `${timeDisplay.textContent} - POMODORO`;
  }

  function updateProgressRing() {
    const offset = circumference - (timeLeft / totalTime) * circumference;
    progressCircle.style.strokeDashoffset = offset;
  }

  function startTimer() {
    if (isRunning) return;
    
    // Initialize Audio Context on first user interactively
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    isRunning = true;
    timerContainer.classList.add('is-running');
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'block';
    
    timerInterval = setInterval(() => {
      timeLeft--;
      updateDisplay();
      updateProgressRing();
      
      if (timeLeft <= 0) {
        timerCompleted();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    isRunning = false;
    timerContainer.classList.remove('is-running');
    clearInterval(timerInterval);
    startBtn.style.display = 'block';
    startBtn.textContent = 'RESUME';
    pauseBtn.style.display = 'none';
  }

  function resetTimer() {
    pauseTimer();
    startBtn.textContent = 'START';
    setMode(currentMode);
  }

  function timerCompleted() {
    pauseTimer();
    playBeepSound();
    
    if (currentMode === 'pomodoro') {
      // Update stats
      stats.pomodorosToday++;
      stats.focusMinutesToday += MODES.pomodoro.time;
      saveStats();
      updateStatsDisplay();
      
      // Auto switch to short break (or long break if div 4)
      if (stats.pomodorosToday > 0 && stats.pomodorosToday % 4 === 0) {
        setMode('longBreak');
      } else {
        setMode('shortBreak');
      }
    } else {
      setMode('pomodoro');
    }
  }

  // --- Audio ---
  function playBeepSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime); // 800 Hz
    osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }

  // --- Settings ---
  function loadSettings() {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if(parsed.pomodoro) MODES.pomodoro.time = parsed.pomodoro;
      if(parsed.shortBreak) MODES.shortBreak.time = parsed.shortBreak;
      if(parsed.longBreak) MODES.longBreak.time = parsed.longBreak;
    }
    
    settingPomodoro.value = MODES.pomodoro.time;
    settingShortBreak.value = MODES.shortBreak.time;
    settingLongBreak.value = MODES.longBreak.time;
  }

  function openSettings() {
    pauseTimer();
    settingsModal.style.display = 'flex';
    // Small delay to allow CSS transition
    setTimeout(() => settingsModal.classList.add('active'), 10);
  }

  function closeSettings() {
    settingsModal.classList.remove('active');
    setTimeout(() => {
      settingsModal.style.display = 'none';
      if(startBtn.textContent === 'RESUME') {
        // If it was paused, maybe start it back? Let user hit start manually.
      }
    }, 300);
  }

  function saveSettings() {
    let pTime = parseInt(settingPomodoro.value);
    let sTime = parseInt(settingShortBreak.value);
    let lTime = parseInt(settingLongBreak.value);
    
    if (pTime > 0) MODES.pomodoro.time = pTime;
    if (sTime > 0) MODES.shortBreak.time = sTime;
    if (lTime > 0) MODES.longBreak.time = lTime;
    
    localStorage.setItem('pomodoroSettings', JSON.stringify({
      pomodoro: MODES.pomodoro.time,
      shortBreak: MODES.shortBreak.time,
      longBreak: MODES.longBreak.time
    }));
    
    closeSettings();
    setMode(currentMode); // Reset current timer with new time
  }

  // --- Stats ---
  function loadStats() {
    const saved = localStorage.getItem('pomodoroStats');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.lastDate === new Date().toDateString()) {
        stats = parsed;
      } else {
        // New day, reset
        saveStats();
      }
    }
    updateStatsDisplay();
  }

  function saveStats() {
    stats.lastDate = new Date().toDateString();
    localStorage.setItem('pomodoroStats', JSON.stringify(stats));
  }

  function updateStatsDisplay() {
    pomodorosCountEl.textContent = stats.pomodorosToday;
    
    let hours = Math.floor(stats.focusMinutesToday / 60);
    let mins = stats.focusMinutesToday % 60;
    
    if (hours > 0) {
      focusTimeEl.textContent = `${hours}h ${mins}m`;
    } else {
      focusTimeEl.textContent = `${mins}m`;
    }
  }

  // Init
  init();
});
