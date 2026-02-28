/** Direction a word is placed on the grid */
export type Direction = "across" | "down";

/** Input entry: a word paired with an optional clue/hint */
export interface WordEntry {
  word: string;
  clue: string;
}

/** A single placed word on the crossword grid */
export interface PlacedWord {
  word: string;
  /** Display label (original casing) */
  label: string;
  /** Clue / hint text for this word */
  clue: string;
  x: number;
  y: number;
  direction: Direction;
  /** 1-based number for the crossword clue */
  number: number;
}

/** A single cell in the crossword grid */
export interface Cell {
  letter: string;
  /** The clue number shown in the top-left of this cell (if any) */
  number?: number;
  /** Whether this cell is part of the crossword (vs a black/empty square) */
  isLetter: true;
}

/** The full crossword grid — sparse 2D array keyed by `${x},${y}` */
export type Grid = Map<string, Cell>;

/** Complete result produced by the crossword generator */
export interface CrosswordResult {
  /** All successfully placed words */
  words: PlacedWord[];
  /** Sparse grid of cells */
  grid: Grid;
  /** Grid bounding box */
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  /** Words that could not be placed */
  unplacedWords: string[];
}
