
/* =====================================
   おみくじパチンコ sound.js
   オリジナルBGM・効果音
===================================== */

let audioContext = null;
let soundEnabled = true;
let bgmTimer = null;
let bgmIndex = 0;
let currentBGM = "normal";

// =====================================
// 音声初期化
// =====================================

function initializeAudio() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume();
  }
}

// =====================================
// 基本音
// =====================================

function playTone(
  frequency,
  duration,
  type = "sine",
  volume = 0.1
) {
  if (!soundEnabled) return;

  initializeAudio();
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  const now = audioContext.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + duration
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

// =====================================
// スタート音
// =====================================

function playStartSound() {
  playTone(330, 0.12, "sawtooth", 0.07);

  setTimeout(() => {
    playTone(660, 0.15, "square", 0.06);
  }, 100);
}

// =====================================
// 停止音
// =====================================

function playStopSound() {
  playTone(520, 0.09, "square", 0.08);
  playTone(260, 0.12, "triangle", 0.04);
}

// =====================================
// 保留音
// =====================================

function playHoldSound(color = "blue") {
  const notes = {
    normal: [330],
    blue: [440, 554],
    green: [523, 659],
    red: [659, 784, 988],
    gold: [784, 988, 1175, 1568]
  };

  const selected = notes[color] || notes.blue;

  selected.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.16, "triangle", 0.09);
    }, index * 100);
  });
}

// =====================================
// リーチ音
// =====================================

function playReachSound() {
  const notes = [523, 659, 784, 988];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.22, "square", 0.07);
    }, index * 150);
  });
}

// =====================================
// 大当たりファンファーレ
// =====================================

function playJackpotSound() {
  const notes = [
    523, 659, 784, 1046,
    784, 1046, 1318, 1568
  ];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.42, "triangle", 0.14);
    }, index * 130);
  });
}

// =====================================
// 777専用ファンファーレ
// =====================================

function play777Sound() {
  const notes = [
    784, 988, 1175, 1568,
    1175, 1568, 1760, 2093,
    1760, 2093, 2349
  ];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.48, "triangle", 0.16);
    }, index * 145);
  });
}

// =====================================
// RUSH突入音
// =====================================

function playRushSound() {
  const notes = [
    392, 523, 659, 784,
    988, 1175, 1318
  ];

  notes.forEach((note, index) => {
    setTimeout(() => {
      playTone(note, 0.3, "sawtooth", 0.10);
    }, index * 130);
  });
}

// =====================================
// 逆転チャンス音
// =====================================

function playReversalSound() {
  playTone(180, 0.55, "sawtooth", 0.13);

  setTimeout(() => {
    playTone(440, 0.3, "square", 0.09);
  }, 350);

  setTimeout(() => {
    playTone(880, 0.4, "square", 0.11);
  }, 650);

  setTimeout(() => {
    playTone(1175, 0.55, "triangle", 0.13);
  }, 950);
}

// =====================================
// BGMパターン
// =====================================

const bgmPatterns = {
  // 通常時：落ち着いた電子音
  normal: {
    notes: [262, 330, 392, 330, 294, 349, 440, 349],
    interval: 420,
    type: "triangle",
    volume: 0.035,
    duration: 0.34
  },

  // リーチ：緊張感のある高音
  reach: {
    notes: [523, 659, 784, 988, 784, 988, 1175, 1318],
    interval: 260,
    type: "square",
    volume: 0.045,
    duration: 0.22
  },

  // 大当たり：明るく華やか
  jackpot: {
    notes: [523, 659, 784, 1046, 988, 784, 1046, 1318],
    interval: 220,
    type: "triangle",
    volume: 0.055,
    duration: 0.25
  },

  // 777：豪華な特別BGM
  special: {
    notes: [784, 988, 1175, 1568, 1318, 1568, 1760, 2093],
    interval: 180,
    type: "triangle",
    volume: 0.065,
    duration: 0.28
  },

  // RUSH：勢いのあるBGM
  rush: {
    notes: [392, 523, 659, 784, 659, 784, 988, 1175],
    interval: 230,
    type: "sawtooth",
    volume: 0.045,
    duration: 0.25
  }
};

// =====================================
// BGM開始・切り替え
// =====================================

function startBGM(type = "normal") {
  if (!soundEnabled) return;

  initializeAudio();

  if (!audioContext) return;

  if (!bgmPatterns[type]) {
    type = "normal";
  }

  stopBGM();

  currentBGM = type;
  bgmIndex = 0;

  const pattern = bgmPatterns[type];

  const playNext = () => {
    if (!soundEnabled || currentBGM !== type) return;

    const note =
      pattern.notes[bgmIndex % pattern.notes.length];

    playTone(
      note,
      pattern.duration,
      pattern.type,
      pattern.volume
    );

    bgmIndex++;
  };

  playNext();

  bgmTimer = setInterval(
    playNext,
    pattern.interval
  );
}

function changeBGM(type) {
  if (currentBGM === type && bgmTimer !== null) return;

  startBGM(type);
}

function stopBGM() {
  if (bgmTimer !== null) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

// =====================================
// サウンド ON / OFF
// =====================================

function toggleSound() {
  soundEnabled = !soundEnabled;

  const button = document.getElementById("sound-button");

  if (soundEnabled) {
    button.textContent = "🔊 サウンド ON";
    initializeAudio();
    playTone(600, 0.15);
  } else {
    button.textContent = "🔇 サウンド OFF";
    stopBGM();
  }
}

// =====================================
// 初期設定
// =====================================

const soundButton = document.getElementById("sound-button");

soundButton.addEventListener("click", toggleSound);

document.addEventListener("click", initializeAudio, {
  once: true
});
