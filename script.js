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
const winLine = document.getElementById("win-line");
const winPhraseText = document.getElementById("winPhrase");
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

// --- სახალისო ფრაზები გამარჯვებისას ---
const WIN_PHRASES = [
  "ვაშა! სამი უჯრა, ერთი გენიოსი! 🧠",
  "ბრწყინვალე სვლა — ნაპოლეონიც შეშურდებოდა! 🎩",
  "მოწინააღმდეგე ჯერ კიდევ ცდილობს გაიგოს რა მოხდა 🤔",
  "შენ არ თამაშობ — შენ ხელოვნებას ქმნი! 🎨",
  "ეს გამარჯვება ისტორიაში შევა 📜",
  "X და O შენს წინაშე ქედს იხრიან 👑",
  "მოწინააღმდეგე უკვე ტუტორიალს ეძებს 📺",
  "ტვინი ტურბო რეჟიმში! 🚀",
  "განაგრძე ასე — დღეს შენი დღეა! ☀️",
  "სტრატეგია + სიმშვიდე = გამარჯვება 💪",
  "ასეთი სვლები ვარჯიშით მოდის ⚡",
  "დაფაზე შენი ხელწერა ჩანს ✍️"
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

  const result = checkWinner();
  if (result) {
    statusText.textContent =
      (result.player === myMark ? "შენ გაიმარჯვე! 🎉" : "მოწინააღმდეგემ გაიმარჯვა 😔") +
      " (" + result.player + ")";
    gameOver = true;
    addScore(result.player);
    drawWinLine(result.line);
    showWinPhrase(result.line);
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
// აბრუნებს გამარჯვებულ ასოსაც და იმ სამი უჯრის ინდექსებსაც, რომლებმაც მოგება მოიტანა
function checkWinner() {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] !== "" && board[a] === board[b] && board[b] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

// --- გამარჯვების ხაზი ---
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

// --- სახალისო ფრაზა ---
// ფრაზა დეტერმინირებულად ირჩევა, არა შემთხვევით: ონლაინ თამაშში ორივე ბრაუზერი
// ერთსა და იმავე კოდს ასრულებს, ამიტომ Math.random() თითოეულს სხვადასხვა ფრაზას
// მისცემდა. აქ არჩევანი მხოლოდ თამაშის მდგომარეობაზეა დამოკიდებული — ორივესთან ერთნაირად.
function showWinPhrase(line) {
  const movesMade = board.filter(cell => cell !== "").length;
  const lineIndex = WINNING_LINES.indexOf(line);
  const gamesPlayed = score.X + score.O + score.draw;

  const index = (movesMade * 7 + lineIndex * 3 + gamesPlayed) % WIN_PHRASES.length;

  winPhraseText.textContent = WIN_PHRASES[index];
  winPhraseText.classList.add("show");
}

function hideWinPhrase() {
  winPhraseText.textContent = "";
  winPhraseText.classList.remove("show");
}

// --- თავიდან დაწყება ---
function doReset() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  gameOver = false;
  hideWinLine();
  hideWinPhrase();
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
