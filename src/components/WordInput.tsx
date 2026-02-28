import React, { useState, useCallback, useRef } from "react";
import type { WordEntry } from "../engine/types";

interface WordInputProps {
  onGenerate: (entries: WordEntry[]) => void;
  isGenerating: boolean;
}

type InputMode = "table" | "text";

const EMPTY_ROW: WordEntry = { word: "", clue: "" };

const EXAMPLE_ENTRIES: WordEntry[] = [
  { word: "СОЛНЦЕ", clue: "Звезда, вокруг которой вращается Земля" },
  { word: "ОБЛАКО", clue: "Скопление водяных капель в атмосфере" },
  { word: "КОСМОС", clue: "Бесконечное пространство за пределами Земли" },
  { word: "ОКЕАН", clue: "Огромный водоём с солёной водой" },
  { word: "КНИГА", clue: "Печатное издание для чтения" },
];

const SEPARATOR = " - ";

const PLACEHOLDER_TEXT = `Введите по одной записи на строку в формате:
слово - подсказка

Например:
СОЛНЦЕ - Звезда, вокруг которой вращается Земля
ОБЛАКО - Скопление водяных капель в атмосфере
КОСМОС - Бесконечное пространство
ОКЕАН - Огромный водоём с солёной водой
КНИГА - Печатное издание для чтения

Если подсказка не нужна, можно написать только слово:
РЕКА
ГОРА`;

/**
 * Преобразовать массив WordEntry в текстовый формат (слово - подсказка).
 */
function entriesToText(entries: WordEntry[]): string {
  return entries
    .map((e) => {
      const word = e.word.trim();
      const clue = e.clue.trim();
      if (!word && !clue) return "";
      if (!clue) return word;
      return `${word}${SEPARATOR}${clue}`;
    })
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Распарсить текст в массив WordEntry.
 * Формат каждой строки: «слово» или «слово - подсказка».
 * Разделитель — первое вхождение « - » (пробел-тире-пробел).
 */
function textToEntries(text: string): WordEntry[] {
  const lines = text.split("\n");
  const entries: WordEntry[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;

    const separatorIndex = line.indexOf(SEPARATOR);
    if (separatorIndex !== -1) {
      const word = line.substring(0, separatorIndex).trim();
      const clue = line.substring(separatorIndex + SEPARATOR.length).trim();
      entries.push({ word, clue });
    } else {
      entries.push({ word: line, clue: "" });
    }
  }

  return entries;
}

function pluralWords(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "слово";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "слова";
  return "слов";
}

export const WordInput: React.FC<WordInputProps> = ({
  onGenerate,
  isGenerating,
}) => {
  const [mode, setMode] = useState<InputMode>("table");
  const [entries, setEntries] = useState<WordEntry[]>([
    { ...EMPTY_ROW },
    { ...EMPTY_ROW },
  ]);
  const [text, setText] = useState("");

  // Флаг, чтобы не зацикливать синхронизацию при переключении
  const switchingRef = useRef(false);

  // --- Синхронизация при переключении режима ---
  const switchMode = useCallback(
    (newMode: InputMode) => {
      if (newMode === mode) return;
      switchingRef.current = true;

      if (newMode === "text") {
        // Таблица → Текст
        setText(entriesToText(entries));
      } else {
        // Текст → Таблица
        const parsed = textToEntries(text);
        setEntries(
          parsed.length >= 2
            ? parsed
            : [
                ...parsed,
                ...Array(2 - parsed.length)
                  .fill(null)
                  .map(() => ({ ...EMPTY_ROW })),
              ],
        );
      }

      setMode(newMode);
      // Сбросить флаг в следующем тике
      requestAnimationFrame(() => {
        switchingRef.current = false;
      });
    },
    [mode, entries, text],
  );

  // --- Валидный счётчик слов (единый для обоих режимов) ---
  const validEntries =
    mode === "table"
      ? entries.filter((e) => e.word.trim().length > 0)
      : textToEntries(text).filter((e) => e.word.trim().length > 0);
  const validCount = validEntries.length;

  // ========================
  //   Табличный режим
  // ========================
  const updateEntry = useCallback(
    (index: number, field: keyof WordEntry, value: string) => {
      setEntries((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const addRow = useCallback(() => {
    setEntries((prev) => [...prev, { ...EMPTY_ROW }]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setEntries((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleTableKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && index === entries.length - 1) {
      e.preventDefault();
      addRow();
    }
  };

  // ========================
  //   Общие действия
  // ========================
  const handleGenerate = () => {
    const valid =
      mode === "table"
        ? entries.filter((e) => e.word.trim().length > 0)
        : textToEntries(text).filter((e) => e.word.trim().length > 0);

    if (valid.length < 2) {
      alert("Введите минимум 2 слова для генерации кроссворда.");
      return;
    }
    onGenerate(valid);
  };

  const handleClear = () => {
    if (mode === "table") {
      setEntries([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
    } else {
      setText("");
    }
  };

  const handleLoadExample = () => {
    if (mode === "table") {
      setEntries(EXAMPLE_ENTRIES.map((e) => ({ ...e })));
    } else {
      setText(entriesToText(EXAMPLE_ENTRIES));
    }
  };

  const isEmpty =
    mode === "table"
      ? entries.every((e) => e.word === "" && e.clue === "")
      : text.trim() === "";

  // ========================
  //   Рендер
  // ========================
  return (
    <div className="word-input">
      <div className="word-input__top-row">
        <h2 className="word-input__title">📝 Слова и подсказки</h2>
        <div className="word-input__mode-toggle">
          <button
            className={`word-input__mode-btn ${mode === "table" ? "word-input__mode-btn--active" : ""}`}
            onClick={() => switchMode("table")}
            title="Табличный ввод"
          >
            ☰ Таблица
          </button>
          <button
            className={`word-input__mode-btn ${mode === "text" ? "word-input__mode-btn--active" : ""}`}
            onClick={() => switchMode("text")}
            title="Текстовый ввод (слово - подсказка)"
          >
            ¶ Текст
          </button>
        </div>
      </div>

      <p className="word-input__hint">
        {mode === "table"
          ? "Введите слова и подсказки к ним. Необходимо минимум 2 слова."
          : "Формат: «слово - подсказка» по одной на строку. Разделитель: « - »."}
      </p>

      {/* ========== ТАБЛИЧНЫЙ РЕЖИМ ========== */}
      {mode === "table" && (
        <div className="word-input__list">
          <div className="word-input__list-header">
            <span className="word-input__list-header-num">№</span>
            <span className="word-input__list-header-word">Слово</span>
            <span className="word-input__list-header-clue">Подсказка</span>
            <span className="word-input__list-header-actions" />
          </div>

          <div className="word-input__list-body">
            {entries.map((entry, index) => (
              <div className="word-input__row" key={index}>
                <span className="word-input__row-num">{index + 1}</span>
                <input
                  className="word-input__field word-input__field--word"
                  type="text"
                  value={entry.word}
                  onChange={(e) => updateEntry(index, "word", e.target.value)}
                  placeholder="Слово"
                  spellCheck={false}
                  autoComplete="off"
                />
                <input
                  className="word-input__field word-input__field--clue"
                  type="text"
                  value={entry.clue}
                  onChange={(e) => updateEntry(index, "clue", e.target.value)}
                  onKeyDown={(e) => handleTableKeyDown(e, index)}
                  placeholder="Подсказка (необязательно)"
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  className="word-input__row-remove"
                  onClick={() => removeRow(index)}
                  disabled={entries.length <= 2}
                  title="Удалить строку"
                  aria-label={`Удалить слово ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button className="word-input__add-btn" onClick={addRow}>
            + Добавить слово
          </button>
        </div>
      )}

      {/* ========== ТЕКСТОВЫЙ РЕЖИМ ========== */}
      {mode === "text" && (
        <textarea
          className="word-input__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER_TEXT}
          spellCheck={false}
          autoComplete="off"
        />
      )}

      {/* ========== ПОДВАЛ ========== */}
      <div className="word-input__footer">
        <span className="word-input__count">
          {validCount} {pluralWords(validCount)}
        </span>
        <div className="word-input__actions">
          <button
            className="btn btn--secondary btn--sm"
            onClick={handleLoadExample}
            title="Загрузить пример"
          >
            💡 Пример
          </button>
          <button
            className="btn btn--secondary btn--sm"
            onClick={handleClear}
            disabled={isEmpty}
          >
            Очистить
          </button>
          <button
            className="btn btn--primary"
            onClick={handleGenerate}
            disabled={isGenerating || validCount < 2}
          >
            {isGenerating ? (
              <>
                <span className="spinner" /> Генерация…
              </>
            ) : (
              "⚡ Сгенерировать"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordInput;
