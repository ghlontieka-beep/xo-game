const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const resetButton = document.getElementById("reset");

// მოგებული კომბინაციები (უჯრების ინდექსები)
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // ჰორიზონტალური
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // ვერტიკალური
  [0, 4, 8], [2, 4, 6]             // დიაგონალური
];

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameOver = false;

function checkWinner() {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function handleClick(event) {
  const index = Number(event.target.dataset.index);

  if (gameOver || board[index] !== "") {
    return;
  }

  board[index] = currentPlayer;
  event.target.textContent = currentPlayer;

  const winner = checkWinner();

  if (winner) {
    statusText.textContent = `გაიმარჯვა ${winner}-მა! 🎉`;
    gameOver = true;
    cells.forEach(cell => cell.disabled = true);
    return;
  }

  if (!board.includes("")) {
    statusText.textContent = "ფრე!";
    gameOver = true;
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
  cells.forEach(cell => {
    cell.textContent = "";
    cell.disabled = false;
  });
}

cells.forEach(cell => cell.addEventListener("click", handleClick));
resetButton.addEventListener("click", resetGame);
