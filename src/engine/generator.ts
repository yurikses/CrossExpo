import type {
  Direction,
  PlacedWord,
  WordEntry,
  Cell,
  Grid,
  CrosswordResult,
} from "./types";

const key = (x: number, y: number): string => `${x},${y}`;

/**
 * Get the letter at a grid position, or undefined if empty.
 */
function getCell(grid: Grid, x: number, y: number): Cell | undefined {
  return grid.get(key(x, y));
}

/**
 * Check whether a word can be placed at (startX, startY) in the given direction.
 * Returns an array of intersection indices (positions in `word` that overlap existing letters)
 * or null if placement is impossible.
 */
function canPlace(
  grid: Grid,
  word: string,
  startX: number,
  startY: number,
  direction: Direction,
): number[] | null {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;
  const intersections: number[] = [];

  // Check the cell just before the word — must be empty (no adjacent word bleeding in)
  const beforeX = startX - dx;
  const beforeY = startY - dy;
  if (getCell(grid, beforeX, beforeY)) return null;

  // Check the cell just after the word — must be empty
  const afterX = startX + word.length * dx;
  const afterY = startY + word.length * dy;
  if (getCell(grid, afterX, afterY)) return null;

  for (let i = 0; i < word.length; i++) {
    const cx = startX + i * dx;
    const cy = startY + i * dy;
    const existing = getCell(grid, cx, cy);

    if (existing) {
      // Must match the letter
      if (existing.letter !== word[i]) return null;
      intersections.push(i);
    } else {
      // Perpendicular neighbours must be empty (so we don't create unintended adjacency)
      const perpDx = direction === "across" ? 0 : 1;
      const perpDy = direction === "down" ? 0 : 1;
      const n1 = getCell(grid, cx + perpDx, cy + perpDy);
      const n2 = getCell(grid, cx - perpDx, cy - perpDy);
      if (n1 || n2) return null;
    }
  }

  return intersections;
}

/**
 * Place a word onto the grid.
 */
function placeWord(
  grid: Grid,
  word: string,
  startX: number,
  startY: number,
  direction: Direction,
): void {
  const dx = direction === "across" ? 1 : 0;
  const dy = direction === "down" ? 1 : 0;

  for (let i = 0; i < word.length; i++) {
    const cx = startX + i * dx;
    const cy = startY + i * dy;
    const k = key(cx, cy);
    if (!grid.has(k)) {
      grid.set(k, { letter: word[i], isLetter: true });
    }
  }
}

interface Candidate {
  x: number;
  y: number;
  direction: Direction;
  intersections: number[];
}

/**
 * Find all valid placements for a word on the current grid.
 */
function findCandidates(grid: Grid, word: string): Candidate[] {
  const candidates: Candidate[] = [];

  // For each cell in the grid, try to place the word through that cell
  grid.forEach((cell, k) => {
    const [xStr, yStr] = k.split(",");
    const gx = parseInt(xStr, 10);
    const gy = parseInt(yStr, 10);

    for (let i = 0; i < word.length; i++) {
      if (word[i] !== cell.letter) continue;

      // Try across: the word would start so that position i lands on (gx, gy)
      const ax = gx - i;
      const ay = gy;
      const acrossResult = canPlace(grid, word, ax, ay, "across");
      if (acrossResult && acrossResult.length > 0) {
        candidates.push({
          x: ax,
          y: ay,
          direction: "across",
          intersections: acrossResult,
        });
      }

      // Try down
      const dx = gx;
      const dy = gy - i;
      const downResult = canPlace(grid, word, dx, dy, "down");
      if (downResult && downResult.length > 0) {
        candidates.push({
          x: dx,
          y: dy,
          direction: "down",
          intersections: downResult,
        });
      }
    }
  });

  // Deduplicate
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const id = `${c.x},${c.y},${c.direction}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Score a candidate placement — higher is better.
 * Prefers more intersections and more central placements.
 */
function scoreCandidate(candidate: Candidate): number {
  let score = candidate.intersections.length * 100;
  // Small bonus for positions closer to origin (keeps grid compact)
  score -= (Math.abs(candidate.x) + Math.abs(candidate.y)) * 0.1;
  return score;
}

/**
 * Compute the bounding box of all cells in the grid.
 */
function computeBounds(grid: Grid) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  grid.forEach((_cell, k) => {
    const [xStr, yStr] = k.split(",");
    const x = parseInt(xStr, 10);
    const y = parseInt(yStr, 10);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 1, height: 1 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Assign clue numbers to placed words.
 * Numbers are assigned in reading order (top-to-bottom, left-to-right).
 */
function assignNumbers(words: PlacedWord[], grid: Grid): void {
  // Collect all starting positions
  const starts = new Map<string, PlacedWord[]>();
  for (const w of words) {
    const k = key(w.x, w.y);
    if (!starts.has(k)) starts.set(k, []);
    starts.get(k)!.push(w);
  }

  // Sort starting positions by reading order (y first, then x)
  const sortedKeys = Array.from(starts.keys()).sort((a, b) => {
    const [ax, ay] = a.split(",").map(Number);
    const [bx, by] = b.split(",").map(Number);
    if (ay !== by) return ay - by;
    return ax - bx;
  });

  let num = 1;
  for (const k of sortedKeys) {
    const group = starts.get(k)!;
    for (const w of group) {
      w.number = num;
    }
    // Set the number on the grid cell too
    const cell = grid.get(k);
    if (cell) {
      cell.number = num;
    }
    num++;
  }
}

/**
 * Shuffle an array (Fisher-Yates) — returns a new array.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Normalised internal entry used during generation.
 */
interface NormalisedEntry {
  upper: string;
  original: string;
  clue: string;
}

/**
 * Main crossword generator.
 * Takes an array of WordEntry objects (word + clue) and attempts to arrange them
 * into a crossword. Uses a greedy approach with multiple random restarts to find
 * a good layout.
 */
export function generateCrossword(
  inputEntries: WordEntry[],
  maxAttempts: number = 50,
): CrosswordResult {
  // Normalise words: uppercase, trim, filter empty/single-char, remove duplicates
  const seen = new Set<string>();
  const entries: NormalisedEntry[] = [];
  for (const entry of inputEntries) {
    const trimmed = entry.word.trim();
    if (trimmed.length < 2) continue;
    const upper = trimmed.toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/gi, "");
    if (upper.length < 2) continue;
    if (seen.has(upper)) continue;
    seen.add(upper);
    entries.push({ upper, original: trimmed, clue: entry.clue.trim() });
  }

  if (entries.length === 0) {
    return {
      words: [],
      grid: new Map(),
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      unplacedWords: inputEntries
        .map((e) => e.word.trim())
        .filter((w) => w.length > 0),
    };
  }

  // Sort longest first as base ordering (longer words are harder to place later)
  const sorted = [...entries].sort((a, b) => b.upper.length - a.upper.length);

  let bestResult: {
    placed: PlacedWord[];
    grid: Grid;
    unplaced: string[];
  } | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ordering = attempt === 0 ? sorted : shuffle(sorted);
    const grid: Grid = new Map();
    const placed: PlacedWord[] = [];
    const unplaced: string[] = [];

    for (let wi = 0; wi < ordering.length; wi++) {
      const { upper: word, original, clue } = ordering[wi];

      if (grid.size === 0) {
        // Place first word horizontally at origin
        const dir: Direction = Math.random() < 0.5 ? "across" : "down";
        placeWord(grid, word, 0, 0, dir);
        placed.push({
          word,
          label: original,
          clue,
          x: 0,
          y: 0,
          direction: dir,
          number: 0,
        });
        continue;
      }

      // Find all candidate placements
      const candidates = findCandidates(grid, word);
      if (candidates.length === 0) {
        unplaced.push(original);
        continue;
      }

      // Score and pick the best (with slight randomness for variety)
      candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));

      // Pick from top candidates with some randomness on non-first attempts
      let pick = candidates[0];
      if (attempt > 0 && candidates.length > 1) {
        const topN = Math.min(3, candidates.length);
        pick = candidates[Math.floor(Math.random() * topN)];
      }

      placeWord(grid, word, pick.x, pick.y, pick.direction);
      placed.push({
        word,
        label: original,
        clue,
        x: pick.x,
        y: pick.y,
        direction: pick.direction,
        number: 0,
      });
    }

    // Is this the best result so far?
    if (!bestResult || placed.length > bestResult.placed.length) {
      bestResult = {
        placed: [...placed],
        grid: new Map(grid),
        unplaced: [...unplaced],
      };
      // If we placed everything, stop early
      if (unplaced.length === 0) break;
    }
  }

  if (!bestResult) {
    return {
      words: [],
      grid: new Map(),
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
      unplacedWords: entries.map((e) => e.original),
    };
  }

  // Assign clue numbers
  assignNumbers(bestResult.placed, bestResult.grid);

  const bounds = computeBounds(bestResult.grid);

  return {
    words: bestResult.placed,
    grid: bestResult.grid,
    bounds,
    unplacedWords: bestResult.unplaced,
  };
}

/**
 * Convert the sparse grid Map into a 2D array for easier rendering.
 * Returns null for empty (black) cells.
 */
export function gridTo2D(result: CrosswordResult): (Cell | null)[][] {
  const { grid, bounds } = result;
  const rows: (Cell | null)[][] = [];

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    const row: (Cell | null)[] = [];
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const cell = grid.get(key(x, y));
      row.push(cell ?? null);
    }
    rows.push(row);
  }

  return rows;
}
