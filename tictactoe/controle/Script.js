// ================= DOM =================
const playerText = document.getElementById("playerText");
const restartBtn = document.getElementById("restartBtn");
const difficultySelect = document.getElementById("difficulty");

const aiScoreEl = document.getElementById("aiScore");
const humanScoreEl = document.getElementById("humanScore");
const drawScoreEl = document.getElementById("drawScore");
const streakEl = document.getElementById("streak");

const boxes = Array.from(document.getElementsByClassName("box"));

const winnerIndicator = getComputedStyle(document.body).getPropertyValue(
  "--winning-blocks"
);

// ================= CONSTANTS =================
const HUMAN = "X";
const AI = "O";

const taunts = [
  "Too easy 😈",
  "Predictable human.",
  "You should’ve blocked that.",
  "I already saw this ending.",
  "Another mistake.",
  "Try again 😏",
];

const winningCombos = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

// ================= GAME STATE =================
let spaces = Array(9).fill(null);
let gameEnded = false;
let currentDifficulty = "impossible";

// ================= AI MEMORY =================
let stats = JSON.parse(localStorage.getItem("ttt_stats")) || {
  humanMoves: Array(9).fill(0),
  gamesPlayed: 0,
  humanWins: 0,
  aiWins: 0,
  draws: 0,
  streak: 0,
  bestStreak: 0,
};

// ================= START =================
function startGame() {
  boxes.forEach((box) => box.addEventListener("click", boxClicked));

  difficultySelect.addEventListener("change", (e) => {
    currentDifficulty = e.target.value;
    restart();
  });

  updateScoreboard();

  // AI starts first sometimes
  if (Math.random() < 0.5) {
    playerText.innerHTML = "AI STARTS 😈";
    setTimeout(aiMove, 300);
  } else {
    playerText.innerHTML = "Your turn (X)";
  }
}

// ================= PLAYER MOVE =================
function boxClicked(e) {
  const id = e.target.id;
  if (spaces[id] || gameEnded) return;

  spaces[id] = HUMAN;
  e.target.innerText = HUMAN;

  stats.humanMoves[id]++;
  saveStats();

  const winner = checkWinner(spaces);
  if (winner) return endGame(getWinningCombo(spaces), winner);

  if (isDraw(spaces)) return drawGame();

  playerText.innerHTML = "AI thinking...";
  setTimeout(aiMove, 200);
}

// ================= AI MOVE =================
function aiMove() {
  if (gameEnded) return;

  let move;

  // AI FIRST MOVE
  if (spaces.every((s) => s === null)) {
    move = [4, 0, 2, 6, 8].find((i) => !spaces[i]);
  } else if (currentDifficulty === "easy") {
    move = randomMove();
  } else if (currentDifficulty === "hard") {
    move = minimax(spaces, AI, 0, 3).index;
  } else {
    // Adaptive counter
    if (spaces.filter((s) => s).length === 1) {
      const fav = stats.humanMoves.indexOf(Math.max(...stats.humanMoves));
      if (!spaces[fav]) move = fav;
    }
    if (move === undefined) {
      move = minimax(spaces, AI, 0).index;
    }
  }

  if (move === undefined) move = randomMove();

  spaces[move] = AI;
  boxes[move].innerText = AI;

  const winner = checkWinner(spaces);
  if (winner) return endGame(getWinningCombo(spaces), winner);

  if (isDraw(spaces)) return drawGame();

  playerText.innerHTML = "Your turn (X)";
}

// ================= MINIMAX =================
function minimax(board, player, depth, maxDepth = Infinity) {
  const winner = checkWinner(board);

  if (winner === HUMAN) return { score: depth - 10 };
  if (winner === AI) return { score: 10 - depth };
  if (isDraw(board) || depth === maxDepth) return { score: 0 };

  let moves = [];

  board.forEach((val, idx) => {
    if (!val) {
      board[idx] = player;
      const result = minimax(
        board,
        player === AI ? HUMAN : AI,
        depth + 1,
        maxDepth
      );

      let score = result.score;
      if (player === AI) score -= stats.humanMoves[idx] * 0.05;

      moves.push({ index: idx, score });
      board[idx] = null;
    }
  });

  let bestScore = player === AI ? -Infinity : Infinity;
  let bestMoves = [];

  moves.forEach((m) => {
    if (
      (player === AI && m.score > bestScore) ||
      (player === HUMAN && m.score < bestScore)
    ) {
      bestScore = m.score;
      bestMoves = [m];
    } else if (m.score === bestScore) {
      bestMoves.push(m);
    }
  });

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// ================= HELPERS =================
function checkWinner(board) {
  for (const [a, b, c] of winningCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function getWinningCombo(board) {
  for (const combo of winningCombos) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return combo;
    }
  }
  return null;
}

function randomMove() {
  return spaces.map((v, i) => (v ? null : i)).filter((v) => v !== null)[
    Math.floor(Math.random() * spaces.filter((v) => !v).length)
  ];
}

function isDraw(board) {
  return board.every((cell) => cell !== null);
}

// ================= END STATES =================
function endGame(combo, winner) {
  gameEnded = true;

  combo.forEach((i) => (boxes[i].style.backgroundColor = winnerIndicator));

  stats.gamesPlayed++;

  if (winner === AI) {
    stats.aiWins++;
    stats.streak++;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
    playerText.innerHTML = taunts[Math.floor(Math.random() * taunts.length)];
    playerText.classList.add("taunt");
    navigator.vibrate?.([200, 100, 200]);
  } else {
    stats.humanWins++;
    stats.streak = 0;
    playerText.innerHTML = "You broke the system 😳";
  }

  saveStats();
  updateScoreboard();
}

function drawGame() {
  gameEnded = true;
  stats.draws++;
  stats.streak = 0;
  playerText.innerHTML = "Draw 🤝 Temporary mercy.";
  saveStats();
  updateScoreboard();
}

// ================= SCOREBOARD =================
function updateScoreboard() {
  aiScoreEl.innerText = stats.aiWins;
  humanScoreEl.innerText = stats.humanWins;
  drawScoreEl.innerText = stats.draws;
  streakEl.innerText = stats.streak;
}

function saveStats() {
  localStorage.setItem("ttt_stats", JSON.stringify(stats));
}

// ================= RESTART =================
restartBtn.addEventListener("click", restart);

function restart() {
  spaces.fill(null);
  gameEnded = false;

  boxes.forEach((box) => {
    box.innerText = "";
    box.style.backgroundColor = "";
  });

  playerText.classList.remove("taunt");
  startGame();
}

startGame();
