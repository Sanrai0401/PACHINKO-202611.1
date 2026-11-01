
/* =====================================
   おみくじパチンコ game.js
   演出・BGM連動版
===================================== */

const reels = [0, 1, 2].map(i =>
  document.getElementById(`reel-${i}`)
);

const stopButtons = [0, 1, 2].map(i =>
  document.getElementById(`stop-${i}`)
);

const spinButton = document.getElementById("spin-button");
const holdButton = document.getElementById("hold-button");
const message = document.getElementById("message");
const fortune = document.getElementById("fortune");
const detail = document.getElementById("detail");
const ballsDisplay = document.getElementById("balls");
const modeDisplay = document.getElementById("mode");
const holdDisplay = document.getElementById("hold-count");
const historyList = document.getElementById("history");

const MAX_HOLDS = 4;
const SPIN_COST = 1;

let balls = 100;
let holds = [];
let mode = "通常";
let remainingSpins = 0;
let consecutiveHits = 0;

let isSpinning = false;
let resolving = false;

let stopped = [true, true, true];
let settled = [true, true, true];
let reelTimers = [null, null, null];

let currentNumbers = [1, 1, 1];

let jackpotThisSpin = false;
let reversalThisSpin = false;
let reachThisSpin = false;
let reachPlayed = false;

let currentHold = null;

// =====================================
// 大当たり確率設定
// =====================================

const probabilityPanel = document.createElement("div");
probabilityPanel.className = "probability-panel";

probabilityPanel.innerHTML = `
  <label for="hit-probability">大当たり確率</label>
  <select id="hit-probability">
    <option value="5">5%</option>
    <option value="10" selected>10%</option>
    <option value="20">20%</option>
    <option value="30">30%</option>
    <option value="50">50%</option>
    <option value="70">70%</option>
    <option value="100">100%</option>
  </select>
  <p>※次の抽選から反映されます。</p>
`;

document.querySelector(".status-panel").after(probabilityPanel);

const probabilitySelect =
  document.getElementById("hit-probability");

// =====================================
// 保留表示
// =====================================

const holdPanel = document.createElement("div");
holdPanel.id = "hold-panel";
holdPanel.className = "hold-panel";

holdPanel.innerHTML = `
  <div class="hold-heading">保留ランプ</div>
  <div id="hold-lamps" class="hold-lamps"></div>
`;

document.querySelector(".machine-window").after(holdPanel);

const holdLamps = document.getElementById("hold-lamps");

// =====================================
// 共通処理
// =====================================

function setMessage(text) {
  message.textContent = text;
}

function randomNumber() {
  return Math.floor(Math.random() * 7) + 1;
}

function addHistory(text) {
  const item = document.createElement("li");
  item.textContent = text;
  historyList.prepend(item);

  while (historyList.children.length > 10) {
    historyList.removeChild(historyList.lastChild);
  }
}

function updateStatus() {
  ballsDisplay.textContent = balls;
  modeDisplay.textContent = mode;
  holdDisplay.textContent = `${holds.length} / ${MAX_HOLDS}`;

  spinButton.disabled =
    isSpinning ||
    resolving ||
    (holds.length === 0 && balls < SPIN_COST);

  holdButton.disabled =
    holds.length >= MAX_HOLDS ||
    balls < SPIN_COST;
}

// =====================================
// 保留表示更新
// =====================================

function renderHolds() {
  holdLamps.innerHTML = "";

  for (let i = 0; i < MAX_HOLDS; i++) {
    const lamp = document.createElement("div");
    lamp.className = "hold-lamp";

    if (holds[i]) {
      lamp.classList.add(`hold-${holds[i].color}`);
      lamp.textContent = holds[i].label;
      lamp.title = `${holds[i].label}保留`;
    } else {
      lamp.classList.add("hold-empty");
      lamp.textContent = "空";
    }

    holdLamps.appendChild(lamp);
  }

  updateStatus();
}

// =====================================
// 保留色抽選
// =====================================

function createHold() {
  const r = Math.random();

  if (r < 0.01) {
    return { color: "gold", label: "金" };
  } else if (r < 0.08) {
    return { color: "red", label: "赤" };
  } else if (r < 0.28) {
    return { color: "green", label: "緑" };
  } else if (r < 0.58) {
    return { color: "blue", label: "青" };
  }

  return { color: "normal", label: "白" };
}

// =====================================
// 保留追加
// =====================================

function addHold() {
  if (holds.length >= MAX_HOLDS) {
    setMessage("保留は最大4個です！");
    return;
  }

  if (balls < SPIN_COST) {
    setMessage("持ち玉が足りません！");
    return;
  }

  balls -= SPIN_COST;

  const newHold = createHold();
  holds.push(newHold);

  renderHolds();

  setMessage(`${newHold.label}保留を獲得！`);

  if (typeof playHoldSound === "function") {
    playHoldSound(newHold.color);
  }

  if (
    typeof playPreReadEffect === "function" &&
    newHold.color !== "normal"
  ) {
    playPreReadEffect(newHold.color);
  }
}

// =====================================
// 抽選結果決定
// =====================================

function decideResult() {
  const hitRate = Number(probabilitySelect.value);

  jackpotThisSpin = Math.random() * 100 < hitRate;

  reversalThisSpin = false;

  if (jackpotThisSpin) {
    const symbol = randomNumber();
    currentNumbers = [symbol, symbol, symbol];
  } else {
    do {
      currentNumbers = [
        randomNumber(),
        randomNumber(),
        randomNumber()
      ];
    } while (
      currentNumbers[0] === currentNumbers[1] &&
      currentNumbers[1] === currentNumbers[2]
    );

    // ハズレ時に8%で逆転チャンス
    reversalThisSpin = Math.random() < 0.08;
  }

  reachThisSpin =
    currentNumbers[0] === currentNumbers[1] ||
    currentNumbers[1] === currentNumbers[2] ||
    currentNumbers[0] === currentNumbers[2];

  reachPlayed = false;
}

// =====================================
// 抽選開始
// =====================================

function startSpin() {
  if (isSpinning || resolving) return;

  if (holds.length === 0 && balls < SPIN_COST) {
    setMessage("持ち玉がありません！");
    return;
  }

  currentHold = null;

  // 保留を消費
  if (holds.length > 0) {
    currentHold = holds.shift();
    renderHolds();
  } else {
    balls -= SPIN_COST;
  }

  decideResult();

  isSpinning = true;
  resolving = false;

  stopped = [false, false, false];
  settled = [false, false, false];

  fortune.textContent = "抽選中...";
  detail.textContent = "好きなタイミングでリールを止めよう！";

  setMessage("リール回転中！！");

  if (typeof playStartSound === "function") {
    playStartSound();
  }

  // モードに合わせてBGMを開始
  if (typeof changeBGM === "function") {
    changeBGM(mode === "通常" ? "normal" : "rush");
  } else if (typeof startBGM === "function") {
    startBGM();
  }

  updateStatus();

  for (let i = 0; i < 3; i++) {
    stopButtons[i].disabled = false;

    reels[i].classList.remove("stopping");
    reels[i].classList.add("spinning");

    reelTimers[i] = setInterval(() => {
      reels[i].textContent = randomNumber();
    }, 65);
  }
}

// =====================================
// リール停止
// =====================================

function stopReel(index) {
  if (!isSpinning || stopped[index]) return;

  stopped[index] = true;
  stopButtons[index].disabled = true;

  clearInterval(reelTimers[index]);

  setMessage("リール減速中……");

  if (typeof playStopSound === "function") {
    playStopSound();
  }

  const otherIndexes = [0, 1, 2].filter(i => i !== index);

  const canShowSequence =
    jackpotThisSpin &&
    otherIndexes.every(i =>
      settled[i] &&
      Number(reels[i].textContent) === currentNumbers[i]
    );

  const target = currentNumbers[index];
  let step = 0;

  reels[index].classList.add("stopping");

  function animate() {
    if (canShowSequence) {
      reels[index].textContent = (step % target) + 1;
    } else {
      reels[index].textContent = randomNumber();
    }

    step++;

    if (step < 9) {
      setTimeout(animate, 65 + step * 18);
    } else {
      reels[index].textContent = target;

      reels[index].classList.remove(
        "spinning",
        "stopping"
      );

      settled[index] = true;

      const stoppedCount = settled.filter(Boolean).length;

      setMessage(`${stoppedCount} / 3 リール停止！`);

      // リーチ演出
      if (stoppedCount === 2 && reachThisSpin) {
        const values = reels.map(reel =>
          Number(reel.textContent)
        );

        const pairExists =
          values[0] === values[1] ||
          values[1] === values[2] ||
          values[0] === values[2];

        if (pairExists && !reachPlayed) {
          reachPlayed = true;

          setMessage("リーチ！！");

          const strong =
            currentHold &&
            ["red", "gold"].includes(currentHold.color);

          if (typeof playReachEffect === "function") {
            playReachEffect(strong);
          }

          if (typeof playReachSound === "function") {
            playReachSound();
          }

          if (typeof changeBGM === "function") {
            changeBGM("reach");
          }
        }
      }

      if (settled.every(Boolean)) {
        finishSpin();
      }
    }
  }

  animate();
}

// =====================================
// 全リール停止後
// =====================================

function finishSpin() {
  isSpinning = false;
  resolving = true;

  stopButtons.forEach(button => {
    button.disabled = true;
  });

  updateStatus();

  if (jackpotThisSpin) {
    showJackpot(currentNumbers[0]);
    return;
  }

  if (reversalThisSpin) {
    showReversalChance();
    return;
  }

  showNormalResult();
}

// =====================================
// 大当たり
// =====================================

function showJackpot(symbol) {
  if (typeof stopBGM === "function") {
    stopBGM();
  }

  consecutiveHits++;

  const title = symbol === 7
    ? "超大当たり！！"
    : "大当たり！！";

  const chainText = consecutiveHits > 1
    ? `${consecutiveHits}連チャン！！`
    : "BONUS START";

  // 777専用演出
  if (symbol === 7) {
    if (typeof play777Effect === "function") {
      play777Effect();
    } else if (typeof playJackpotEffect === "function") {
      playJackpotEffect(title, chainText);
    }

    if (typeof play777Sound === "function") {
      play777Sound();
    } else if (typeof playJackpotSound === "function") {
      playJackpotSound();
    }
  } else {
    if (typeof playJackpotEffect === "function") {
      playJackpotEffect(title, chainText);
    }

    if (typeof playJackpotSound === "function") {
      playJackpotSound();
    }
  }

  fortune.textContent = title;
  detail.textContent =
    `図柄 ${symbol}${symbol}${symbol} ／ ${chainText}`;

  setMessage(title);

  balls += symbol === 7 ? 500 : 300;

  addHistory(
    `${symbol}${symbol}${symbol}：${title}（${consecutiveHits}連）`
  );

  updateStatus();

  // ファンファーレ後に大当たりBGMへ
  setTimeout(() => {
    if (typeof changeBGM === "function") {
      changeBGM(symbol === 7 ? "special" : "jackpot");
    }
  }, 1500);

  setTimeout(() => {
    enterNextMode();
  }, 3000);
}

// =====================================
// 逆転チャンス
// =====================================

function showReversalChance() {
  if (typeof stopBGM === "function") {
    stopBGM();
  }

  fortune.textContent = "逆転チャンス！！";
  detail.textContent = "ハズレを覆せるか……！";
  setMessage("逆転チャンス発生！！");

  if (typeof playDopagakiEffect === "function") {
    playDopagakiEffect();
  }

  if (typeof playReversalSound === "function") {
    playReversalSound();
  }

  // 逆転チャンス発生時は逆転成功
  setTimeout(() => {
    const symbol = randomNumber();

    currentNumbers = [symbol, symbol, symbol];

    // リールもゾロ目に変化
    reels.forEach(reel => {
      reel.textContent = symbol;
    });

    jackpotThisSpin = true;
    resolving = false;

    setMessage("逆転成功！！");

    showJackpot(symbol);
  }, 3000);
}

// =====================================
// 通常結果
// =====================================

function showNormalResult() {
  const result = currentNumbers.join("");

  const average =
    currentNumbers.reduce((a, b) => a + b, 0) / 3;

  const rounded = Math.max(
    1,
    Math.min(7, Math.round(average))
  );

  const fortunes = {
    1: "大凶",
    2: "凶",
    3: "末吉",
    4: "小吉",
    5: "中吉",
    6: "吉",
    7: "大吉"
  };

  const resultFortune = fortunes[rounded];

  fortune.textContent = resultFortune;

  detail.textContent =
    `出目：${result} ／ 平均値：${average.toFixed(2)}`;

  setMessage(`${resultFortune}！`);

  addHistory(`${result}：${resultFortune}`);

  consecutiveHits = 0;

  finishModeSpin();

  // モード終了後、通常BGMに戻す
  if (typeof changeBGM === "function") {
    changeBGM(mode === "通常" ? "normal" : "rush");
  }

  resolving = false;
  updateStatus();
}

// =====================================
// モード突入
// =====================================

function enterNextMode() {
  // 通常時の大当たりでモード抽選
  if (mode === "通常") {
    const r = Math.random();

    if (r < 0.10) {
      mode = "上位RUSH";
      remainingSpins = Infinity;
    } else if (r < 0.35) {
      mode = "確変";
      remainingSpins = Infinity;
    } else if (r < 0.70) {
      mode = "ST";
      remainingSpins = 10;
    } else {
      mode = "時短";
      remainingSpins = 5;
    }
  } else {
    // すでにモード中なら、そのモードを継続
    if (remainingSpins !== Infinity) {
      remainingSpins =
        mode === "ST" ? 10 : 5;
    }
  }

  fortune.textContent = `${mode}突入！！`;

  detail.textContent =
    `${consecutiveHits}連チャン中！さらに大当たりを目指せ！`;

  setMessage(`${mode}突入！！`);

  if (typeof playRushEffect === "function") {
    playRushEffect(mode, consecutiveHits);
  }

  if (typeof playRushSound === "function") {
    playRushSound();
  }

  if (typeof changeBGM === "function") {
    changeBGM("rush");
  }

  addHistory(`モード移行：${mode}`);

  resolving = false;
  updateStatus();
}

// =====================================
// モード回数管理
// =====================================

function finishModeSpin() {
  if (mode === "通常") return;

  if (remainingSpins !== Infinity) {
    remainingSpins--;

    if (remainingSpins <= 0) {
      mode = "通常";
      remainingSpins = 0;
      consecutiveHits = 0;

      setMessage("モード終了。通常状態に戻りました。");

      addHistory("通常モードに戻りました");
    } else {
      setMessage(`${mode} 残り${remainingSpins}回`);
    }
  }
}

// =====================================
// ボタン設定
// =====================================

spinButton.addEventListener("click", startSpin);
holdButton.addEventListener("click", addHold);

stopButtons.forEach((button, index) => {
  button.disabled = true;

  button.addEventListener("click", () => {
    stopReel(index);
  });
});

// =====================================
// 初期化
// =====================================

renderHolds();
updateStatus();

setMessage("スタートを押してゲーム開始！");
