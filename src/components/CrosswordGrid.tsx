import React from "react";
import type { CrosswordResult, Cell } from "../engine/types";
import { gridTo2D } from "../engine/generator";

interface CrosswordGridProps {
  result: CrosswordResult;
  filled: boolean;
}

export const CrosswordGrid: React.FC<CrosswordGridProps> = ({
  result,
  filled,
}) => {
  const grid2D = gridTo2D(result);

  if (grid2D.length === 0) {
    return (
      <div className="crossword-grid__empty">
        Нет кроссворда для отображения.
      </div>
    );
  }

  const acrossWords = result.words
    .filter((w) => w.direction === "across")
    .sort((a, b) => a.number - b.number);

  const downWords = result.words
    .filter((w) => w.direction === "down")
    .sort((a, b) => a.number - b.number);

  return (
    <div className="crossword-grid">
      <div className="crossword-grid__scroll-wrapper">
        <table
          className="crossword-grid__table"
          cellSpacing={0}
          cellPadding={0}
        >
          <tbody>
            {grid2D.map((row: (Cell | null)[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell: Cell | null, colIndex: number) => {
                  if (!cell) {
                    return (
                      <td
                        key={colIndex}
                        className="crossword-grid__cell crossword-grid__cell--black"
                      />
                    );
                  }

                  return (
                    <td
                      key={colIndex}
                      className="crossword-grid__cell crossword-grid__cell--letter"
                    >
                      {cell.number && (
                        <span className="crossword-grid__cell-number">
                          {cell.number}
                        </span>
                      )}
                      {filled && (
                        <span className="crossword-grid__cell-letter">
                          {cell.letter}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.words.length > 0 && (
        <div className="crossword-grid__clues">
          <div className="crossword-grid__clues-column">
            <h3 className="crossword-grid__clues-heading">
              По горизонтали (→)
            </h3>
            <ul className="crossword-grid__clues-list">
              {acrossWords.map((w) => (
                <li key={`across-${w.number}`} className="crossword-grid__clue">
                  <span className="crossword-grid__clue-number">
                    {w.number}.
                  </span>
                  <span className="crossword-grid__clue-content">
                    {w.clue ? (
                      <span className="crossword-grid__clue-text">
                        {w.clue}
                      </span>
                    ) : (
                      <span className="crossword-grid__clue-text crossword-grid__clue-text--empty">
                        (без подсказки)
                      </span>
                    )}
                    {filled ? (
                      <span className="crossword-grid__clue-answer">
                        [{w.label}]
                      </span>
                    ) : (
                      <span className="crossword-grid__clue-length">
                        ({w.word.length} букв)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="crossword-grid__clues-column">
            <h3 className="crossword-grid__clues-heading">По вертикали (↓)</h3>
            <ul className="crossword-grid__clues-list">
              {downWords.map((w) => (
                <li key={`down-${w.number}`} className="crossword-grid__clue">
                  <span className="crossword-grid__clue-number">
                    {w.number}.
                  </span>
                  <span className="crossword-grid__clue-content">
                    {w.clue ? (
                      <span className="crossword-grid__clue-text">
                        {w.clue}
                      </span>
                    ) : (
                      <span className="crossword-grid__clue-text crossword-grid__clue-text--empty">
                        (без подсказки)
                      </span>
                    )}
                    {filled ? (
                      <span className="crossword-grid__clue-answer">
                        [{w.label}]
                      </span>
                    ) : (
                      <span className="crossword-grid__clue-length">
                        ({w.word.length} букв)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {result.unplacedWords.length > 0 && (
        <div className="crossword-grid__unplaced">
          <h4 className="crossword-grid__unplaced-title">
            ⚠️ Не удалось разместить ({result.unplacedWords.length}):
          </h4>
          <p className="crossword-grid__unplaced-words">
            {result.unplacedWords.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
};

export default CrosswordGrid;
