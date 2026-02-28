import React from "react";
import type { CrosswordResult } from "../engine/types";
import { exportCrosswordDocx } from "../utils/exportDocx";

interface ToolbarProps {
  result: CrosswordResult | null;
  filled: boolean;
  onToggleFilled: () => void;
  onRegenerate: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  result,
  filled,
  onToggleFilled,
  onRegenerate,
}) => {
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async (exportFilled: boolean) => {
    if (!result || result.words.length === 0) return;
    setExporting(true);
    try {
      const suffix = exportFilled ? "ответы" : "кроссворд";
      await exportCrosswordDocx(
        result,
        exportFilled,
        `кроссворд-${suffix}.docx`,
      );
    } catch (err) {
      console.error("Ошибка экспорта:", err);
      alert("Не удалось экспортировать DOCX. Подробности в консоли.");
    } finally {
      setExporting(false);
    }
  };

  const hasResult = result !== null && result.words.length > 0;

  return (
    <div className="toolbar">
      <div className="toolbar__group">
        <button
          className="btn btn--outline"
          onClick={onRegenerate}
          disabled={!hasResult}
          title="Сгенерировать заново с теми же словами"
        >
          🔄 Заново
        </button>

        <button
          className={`btn btn--toggle ${filled ? "btn--toggle-active" : ""}`}
          onClick={onToggleFilled}
          disabled={!hasResult}
          title="Переключить между заполненным и пустым видом"
        >
          {filled ? "🔤 С ответами" : "⬜ Без ответов"}
        </button>
      </div>

      <div className="toolbar__group">
        <button
          className="btn btn--secondary"
          onClick={() => handleExport(false)}
          disabled={!hasResult || exporting}
          title="Экспортировать пустой кроссворд в DOCX"
        >
          {exporting ? (
            <>
              <span className="spinner" /> Экспорт…
            </>
          ) : (
            "📄 Экспорт пустого (.docx)"
          )}
        </button>

        <button
          className="btn btn--secondary"
          onClick={() => handleExport(true)}
          disabled={!hasResult || exporting}
          title="Экспортировать кроссворд с ответами в DOCX"
        >
          {exporting ? (
            <>
              <span className="spinner" /> Экспорт…
            </>
          ) : (
            "📄 Экспорт с ответами (.docx)"
          )}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
