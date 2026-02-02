const BOARD_SIZE = 8;
const QUEEN_COUNT = 8;
const STEP_DELAY = 650;

const boardEl = document.getElementById("board");
const poolEl = document.getElementById("queenPool");
const statusEl = document.getElementById("status");
const verifyBtn = document.getElementById("verifyBtn");
const simulateBtn = document.getElementById("simulateBtn");
const resetBtn = document.getElementById("resetBtn");

const queens = Array.from({ length: QUEEN_COUNT }, (_, id) => ({
  id,
  position: null,
}));

let selectedQueenId = null;
let isSimulating = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createBoard() {
  boardEl.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const square = document.createElement("div");
      square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
      square.dataset.row = row;
      square.dataset.col = col;
      square.addEventListener("click", () => handleSquareClick(row, col));
      square.addEventListener("dragover", (event) => event.preventDefault());
      square.addEventListener("drop", (event) => handleDrop(event, row, col));
      boardEl.appendChild(square);
    }
  }
}

function createQueenPool() {
  poolEl.innerHTML = "";
  queens.forEach((queen) => {
    const item = document.createElement("div");
    item.className = "queen";
    item.textContent = "♛";
    item.dataset.queenId = queen.id;
    item.draggable = true;
    item.addEventListener("dragstart", (event) => handleDragStart(event, queen.id));
    item.addEventListener("click", () => handleQueenClick(queen.id));
    poolEl.appendChild(item);
  });
}

function renderQueens() {
  document.querySelectorAll(".square").forEach((square) => {
    square.textContent = "";
    square.classList.remove("highlight", "conflict");
  });

  queens.forEach((queen) => {
    const poolItem = poolEl.querySelector(`[data-queen-id=\"${queen.id}\"]`);
    if (poolItem) {
      poolItem.classList.toggle("selected", queen.id === selectedQueenId);
    }

    if (queen.position) {
      const { row, col } = queen.position;
      const square = getSquare(row, col);
      if (square) {
        square.textContent = "♛";
      }
    }
  });

  if (selectedQueenId !== null) {
    document.querySelectorAll(".square").forEach((square) => square.classList.add("highlight"));
  }
}

function getSquare(row, col) {
  return boardEl.querySelector(`[data-row=\"${row}\"][data-col=\"${col}\"]`);
}

function handleQueenClick(queenId) {
  if (isSimulating) {
    return;
  }
  selectedQueenId = selectedQueenId === queenId ? null : queenId;
  renderQueens();
}

function handleSquareClick(row, col) {
  if (isSimulating) {
    return;
  }
  if (selectedQueenId === null) {
    const queenId = findQueenAt(row, col);
    selectedQueenId = queenId;
    renderQueens();
    return;
  }

  placeQueen(selectedQueenId, row, col);
  selectedQueenId = null;
  renderQueens();
}

function handleDragStart(event, queenId) {
  if (isSimulating) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData("text/plain", String(queenId));
}

function handleDrop(event, row, col) {
  if (isSimulating) {
    return;
  }
  const queenId = Number(event.dataTransfer.getData("text/plain"));
  if (Number.isNaN(queenId)) {
    return;
  }
  placeQueen(queenId, row, col);
  selectedQueenId = null;
  renderQueens();
}

function placeQueen(queenId, row, col) {
  const queen = queens.find((item) => item.id === queenId);
  if (!queen) {
    return;
  }
  queen.position = { row, col };
}

function findQueenAt(row, col) {
  const queen = queens.find((item) => item.position?.row === row && item.position?.col === col);
  return queen ? queen.id : null;
}

function clearConflicts() {
  document.querySelectorAll(".square").forEach((square) => square.classList.remove("conflict"));
}

function showConflicts(conflicts) {
  conflicts.forEach(({ row, col }) => {
    const square = getSquare(row, col);
    if (square) {
      square.classList.add("conflict");
    }
  });
}

function findConflicts(positions) {
  const conflicts = [];
  const byRow = new Map();
  const byCol = new Map();
  const byDiag1 = new Map();
  const byDiag2 = new Map();

  positions.forEach(({ row, col }) => {
    const diag1 = row - col;
    const diag2 = row + col;

    if (byRow.has(row)) {
      conflicts.push({ row, col });
      conflicts.push(byRow.get(row));
    }
    if (byCol.has(col)) {
      conflicts.push({ row, col });
      conflicts.push(byCol.get(col));
    }
    if (byDiag1.has(diag1)) {
      conflicts.push({ row, col });
      conflicts.push(byDiag1.get(diag1));
    }
    if (byDiag2.has(diag2)) {
      conflicts.push({ row, col });
      conflicts.push(byDiag2.get(diag2));
    }

    byRow.set(row, { row, col });
    byCol.set(col, { row, col });
    byDiag1.set(diag1, { row, col });
    byDiag2.set(diag2, { row, col });
  });

  return conflicts;
}

function getPlacedQueens() {
  return queens.filter((queen) => queen.position !== null).map((queen) => ({
    id: queen.id,
    row: queen.position.row,
    col: queen.position.col,
  }));
}

function setStatus(message) {
  statusEl.textContent = message;
}

function toggleControls(disabled) {
  verifyBtn.disabled = disabled;
  simulateBtn.disabled = disabled;
  resetBtn.disabled = disabled;
}

async function verifyBoard() {
  clearConflicts();
  const placed = getPlacedQueens();
  const conflicts = findConflicts(placed);
  if (conflicts.length) {
    showConflicts(conflicts);
    setStatus("Conflicts found. Fix clashes to continue.");
    return false;
  }
  setStatus("No conflicts. You can simulate.");
  return true;
}

function buildFixedMap(placed) {
  return new Map(placed.map((q) => [q.col, q.row]));
}

function isSafe(row, col, current) {
  for (const [c, r] of current.entries()) {
    if (r === row || c === col || Math.abs(r - row) === Math.abs(c - col)) {
      return false;
    }
  }
  return true;
}

async function simulate() {
  if (isSimulating) {
    return;
  }

  const ok = await verifyBoard();
  if (!ok) {
    return;
  }

  const placed = getPlacedQueens();
  const fixed = buildFixedMap(placed);
  const current = new Map(fixed);

  isSimulating = true;
  toggleControls(true);
  setStatus("Simulation running...");

  const columns = Array.from({ length: BOARD_SIZE }, (_, col) => col);

  const dfs = async (colIndex) => {
    if (colIndex >= columns.length) {
      return true;
    }

    const col = columns[colIndex];
    if (fixed.has(col)) {
      return dfs(colIndex + 1);
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      if (!isSafe(row, col, current)) {
        continue;
      }

      current.set(col, row);
      const queenId = findAvailableQueen();
      if (queenId === null) {
        current.delete(col);
        return false;
      }
      placeQueen(queenId, row, col);
      renderQueens();
      await sleep(STEP_DELAY);

      if (await dfs(colIndex + 1)) {
        return true;
      }

      current.delete(col);
      removeQueenAt(row, col);
      renderQueens();
      await sleep(STEP_DELAY);
    }

    return false;
  };

  const success = await dfs(0);
  if (success) {
    setStatus("Simulation complete. Solution found.");
  } else {
    setStatus("No solution found with current fixed queens.");
  }

  isSimulating = false;
  toggleControls(false);
}

function findAvailableQueen() {
  const available = queens.find((queen) => queen.position === null);
  return available ? available.id : null;
}

function removeQueenAt(row, col) {
  const queen = queens.find((item) => item.position?.row === row && item.position?.col === col);
  if (queen) {
    queen.position = null;
  }
}

function resetAll() {
  if (isSimulating) {
    return;
  }
  queens.forEach((queen) => {
    queen.position = null;
  });
  selectedQueenId = null;
  clearConflicts();
  setStatus("Ready.");
  renderQueens();
}

verifyBtn.addEventListener("click", verifyBoard);
simulateBtn.addEventListener("click", simulate);
resetBtn.addEventListener("click", resetAll);

createBoard();
createQueenPool();
renderQueens();
