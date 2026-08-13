// ===== XO ონლაინ თამაში (PeerJS / WebRTC) =====
// ორი მოთამაშე სხვადასხვა კომპიუტერიდან თამაშობს კოდის გაზიარებით.
// შემქმნელი თამაშობს X-ით (პირველი სვლა), შემოსული — O-თი.

// --- გვერდის ელემენტები ---
const lobby = document.getElementById("lobby");
const gameSection = document.getElementById("game");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const codeInput = document.getElementById("codeInput");
const lobbyStatus = document.getElementById("lobbyStatus");
const codeBanner = document.getElementById("codeBanner");
const statusText = document.getElementById("status");
const cells = document.querySelectorAll(".cell");
const resetButton = document.getElementById("reset");
const scoreElements = {
  X: document.getElementById("score-x"),
  O: document.getElementById("score-o"),
  draw: document.getElementById("score-draw")
};

// --- მოგებული კომბინაციები (უჯრების ინდექსები) ---
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // ჰორიზონტალური
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // ვერტიკალური
  [0, 4, 8], [2, 4, 6]             // დიაგონალური
];

// უნიკალური პრეფიქსი, რომ სხვისი თამაშის კოდს არ დაემთხვეს
const ID_PREFIX = "xogame-9f3a-";

// --- თამაშის მდგომარეობა ---
let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameOver = false;

let peer = null;   // ჩემი PeerJS კავშირი
let conn = null;   // მოწინააღმდეგესთან კავშირი
let myMark = null; // "X" (შემქმნელი) ან "O" (შემოსული)

// --- ქულები (ინახება მთელი სესიის განმავლობაში, reset-ი არ ანულებს) ---
const score = { X: 0, O: 0, draw: 0 };

function addScore(key) {
  score[key] += 1;
  scoreElements[key].textContent = score[key];
}

// --- მოკლე კოდის გენერაცია (5 სიმბოლო, მსგავსი ასოების გარეშე) ---
function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O და 1/I ამოღებულია
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- თამაშის შექმნა (შენ ხარ X) ---
createBtn.addEventListener("click", () => {
  const code = makeCode();
  lobbyStatus.textContent = "იქმნება თამაში...";
  peer = new Peer(ID_PREFIX + code);

  peer.on("open", () => {
    lobbyStatus.textContent = "თამაშის კოდი: " + code + " — გაუზიარე მეგობარს და დაელოდე.";
  });

  // როცა მოწინააღმდეგე შემოვა
  peer.on("connection", (c) => {
    conn = c;
    myMark = "X";
    conn.on("open", () => {
      setupConnection();
      startGame();
    });
  });

  peer.on("error", (err) => {
    lobbyStatus.textContent = "შეცდომა (" + err.type + "). სცადე თავიდან.";
  });
});

// --- თამაშში შესვლა (შენ ხარ O) ---
joinBtn.addEventListener("click", () => {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length < 4) {
    lobbyStatus.textContent = "შეიყვანე სწორი კოდი.";
    return;
  }
  lobbyStatus.textContent = "ვუკავშირდები...";
  peer = new Peer();

  peer.on("open", () => {
    conn = peer.connect(ID_PREFIX + code);
    myMark = "O";
    conn.on("open", () => {
      setupConnection();
      startGame();
    });
  });

  peer.on("error", (err) => {
    lobbyStatus.textContent = "კავშირი ვერ მოხერხდა — შეამოწმე კოდი. (" + err.type + ")";
  });
});

// --- მოწინააღმდეგის შეტყობინებების მოსმენა ---
function setupConnection() {
  conn.on("data", (msg) => {
    if (msg.type === "move") {
      applyMove(msg.index, msg.player);
    } else if (msg.type === "reset") {
      doReset();
    }
  });
  conn.on("close", () => {
    statusText.textContent = "მოწინააღმდეგემ დატოვა თამაში.";
    gameOver = true;
    cells.forEach(cell => cell.disabled = true);
  });
}

// --- თამაშის დაწყება (ლობის დამალვა, დაფის ჩვენება) ---
function startGame() {
  lobby.classList.add("hidden");
  gameSection.classList.remove("hidden");
  doReset();
  codeBanner.textContent = myMark === "X" ? "შენ ხარ X (პირველი სვლა)" : "შენ ხარ O";
}

// --- უჯრაზე დაჭერა ---
function handleClick(event) {
  const index = Number(event.target.dataset.index);
  if (gameOver || board[index] !== "") return;
  if (currentPlayer !== myMark) return; // მხოლოდ შენს სვლაზე შეგიძლია

  applyMove(index, myMark);
  conn.send({ type: "move", index: index, player: myMark });
}

// --- სვლის დადება (ლოკალურ დაჭერაზეც და მოწინააღმდეგისგან მიღებაზეც) ---
function applyMove(index, player) {
  if (gameOver || board[index] !== "") return;

  board[index] = player;
  cells[index].textContent = player;

  const winner = checkWinner();
  if (winner) {
    statusText.textContent =
      (winner === myMark ? "შენ გაიმარჯვე! 🎉" : "მოწინააღმდეგემ გაიმარჯვა 😔") + " (" + winner + ")";
    gameOver = true;
    addScore(winner);
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
  updateStatus();
}

// --- სტატუსის განახლება (ვისი სვლაა) ---
function updateStatus() {
  if (gameOver) return;
  if (currentPlayer === myMark) {
    statusText.textContent = "შენი სვლაა (" + myMark + ")";
  } else {
    statusText.textContent = "მოწინააღმდეგის სვლა (" + currentPlayer + ")";
  }
}

// --- გამარჯვების შემოწმება ---
function checkWinner() {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// --- თავიდან დაწყება ---
function doReset() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  gameOver = false;
  cells.forEach(cell => {
    cell.textContent = "";
    cell.disabled = false;
  });
  updateStatus();
}

// --- ღილაკებზე რეაქცია ---
cells.forEach(cell => cell.addEventListener("click", handleClick));

resetButton.addEventListener("click", () => {
  doReset();
  if (conn && conn.open) {
    conn.send({ type: "reset" });
  }
});

const test = ;   // განზრახ შეცდომა CI-ის საჩვენებლად
