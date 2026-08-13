const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const resetButton = document.getElementById("reset");
const winLine = document.getElementById("win-line");
const scoreElements = {
  X: document.getElementById("score-x"),
  O: document.getElementById("score-o"),
  draw: document.getElementById("score-draw")
};

// მოგებული კომბინაციები (უჯრების ინდექსები)
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // ჰორიზონტალური
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // ვერტიკალური
  [0, 4, 8], [2, 4, 6]             // დიაგონალური
];

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameOver = false;

// ქულები ინახება მთელი სესიის განმავლობაში (reset-ი არ ანულებს)
const score = { X: 0, O: 0, draw: 0 };

function addScore(key) {
  score[key] += 1;
  scoreElements[key].textContent = score[key];
}

function checkWinner() {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

// უჯრის ცენტრის კოორდინატები დაფის შიგნით
function cellCenter(index) {
  const cell = cells[index];
  return {
    x: cell.offsetLeft + cell.offsetWidth / 2,
    y: cell.offsetTop + cell.offsetHeight / 2
  };
}

function drawWinLine(line) {
  const start = cellCenter(line[0]);
  const end = cellCenter(line[2]);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);        // ხაზის დახრა რადიანებში
  const distance = Math.hypot(dx, dy);     // მანძილი ორ ცენტრს შორის

  const OVERHANG = 14;                     // ცოტათი გავცდეთ უჯრებს ორივე მხარეს

  winLine.style.left = `${start.x - Math.cos(angle) * OVERHANG}px`;
  winLine.style.top = `${start.y - Math.sin(angle) * OVERHANG - 3}px`;
  winLine.style.width = `${distance + OVERHANG * 2}px`;
  winLine.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
  winLine.classList.add("visible");
}

function hideWinLine() {
  winLine.classList.remove("visible");
}

function handleClick(event) {
  const index = Number(event.target.dataset.index);

  if (gameOver || board[index] !== "") {
    return;
  }

  board[index] = currentPlayer;
  event.target.textContent = currentPlayer;

  const result = checkWinner();

  if (result) {
    statusText.textContent = `გაიმარჯვა ${result.player}-მა! 🎉`;
    gameOver = true;
    addScore(result.player);
    drawWinLine(result.line);
    cells.forEach(cell => cell.disabled = true);
    return;
  }

  if (!board.includes("")) {
    statusText.textContent = "ფრე!";
    gameOver = true;
    addScore("draw");
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  statusText.textContent = `ახლა სვლა: ${currentPlayer}`;
}

function resetGame() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  gameOver = false;
  statusText.textContent = "ახლა სვლა: X";
  hideWinLine();
  cells.forEach(cell => {
    cell.textContent = "";
    cell.disabled = false;
  });
}

cells.forEach(cell => cell.addEventListener("click", handleClick));
resetButton.addEventListener("click", resetGame);
