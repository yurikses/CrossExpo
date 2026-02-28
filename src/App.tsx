import React, { useState, useCallback, useRef } from "react";
import type { CrosswordResult, WordEntry } from "./engine/types";
import { generateCrossword } from "./engine/generator";
import WordInput from "./components/WordInput";
import CrosswordGrid from "./components/CrosswordGrid";
import Toolbar from "./components/Toolbar";
import "./App.css";

const App: React.FC = () => {
  const [result, setResult] = useState<CrosswordResult | null>(null);
  const [filled, setFilled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const lastEntriesRef = useRef<WordEntry[]>([]);

  const handleGenerate = useCallback((entries: WordEntry[]) => {
    setIsGenerating(true);
    lastEntriesRef.current = entries;

    // Таймаут, чтобы UI успел обновиться перед генерацией
    setTimeout(() => {
      try {
        const crossword = generateCrossword(entries, 80);
        setResult(crossword);
        setFilled(true);
      } catch (err) {
        console.error("Ошибка генерации кроссворда:", err);
        alert("Не удалось сгенерировать кроссворд. Попробуйте другие слова.");
      } finally {
        setIsGenerating(false);
      }
    }, 50);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (lastEntriesRef.current.length >= 2) {
      handleGenerate(lastEntriesRef.current);
    }
  }, [handleGenerate]);

  const handleToggleFilled = useCallback(() => {
    setFilled((prev) => !prev);
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">✦ CrossExpo</h1>
        <p className="app__subtitle">Генератор кроссвордов</p>
      </header>

      <main className="app__main">
        <aside className="app__sidebar">
          <WordInput onGenerate={handleGenerate} isGenerating={isGenerating} />
        </aside>

        <section className="app__content">
          {result && result.words.length > 0 ? (
            <>
              <Toolbar
                result={result}
                filled={filled}
                onToggleFilled={handleToggleFilled}
                onRegenerate={handleRegenerate}
              />
              <CrosswordGrid result={result} filled={filled} />
            </>
          ) : (
            <div className="app__placeholder">
              <div className="app__placeholder-icon">🧩</div>
              <h2>Кроссворд ещё не создан</h2>
              <p>
                Введите минимум 2 слова с подсказками в панели слева и нажмите{" "}
                <strong>Сгенерировать</strong>, чтобы начать.
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="app__footer">
        <span>CrossExpo — Генератор кроссвордов</span>
      </footer>
    </div>
  );
};

export default App;
