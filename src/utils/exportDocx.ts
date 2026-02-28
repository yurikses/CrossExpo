import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  SectionType,
  PageOrientation,
  TableLayoutType,
  VerticalAlign,
  HeadingLevel,
} from "docx";
import { saveAs } from "file-saver";
import type { CrosswordResult, Cell } from "../engine/types";
import { gridTo2D } from "../engine/generator";

const CELL_SIZE_TWIPS = 400; // ~0.28 inches per cell
const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "000000",
};
const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

function pluralLetters(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} буква`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} буквы`;
  return `${n} букв`;
}

function buildCrosswordTable(result: CrosswordResult, filled: boolean): Table {
  const grid2D = gridTo2D(result);
  const { width } = result.bounds;

  const tableWidth = width * CELL_SIZE_TWIPS;

  const rows = grid2D.map((rowCells) => {
    const cells = rowCells.map((cell: Cell | null) => {
      if (!cell) {
        // Пустая/чёрная клетка — без рамок, без содержимого
        return new TableCell({
          width: { size: CELL_SIZE_TWIPS, type: WidthType.DXA },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
          },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [],
            }),
          ],
        });
      }

      const children: TextRun[] = [];

      // Номер подсказки в верхнем левом углу клетки
      if (cell.number) {
        children.push(
          new TextRun({
            text: String(cell.number),
            size: 12, // 6pt
            superScript: true,
            font: "Arial",
            color: "555555",
          }),
        );
      }

      if (filled) {
        children.push(
          new TextRun({
            text: cell.letter,
            size: 20, // 10pt
            bold: true,
            font: "Arial",
          }),
        );
      }

      return new TableCell({
        width: { size: CELL_SIZE_TWIPS, type: WidthType.DXA },
        borders: {
          top: BORDER_STYLE,
          bottom: BORDER_STYLE,
          left: BORDER_STYLE,
          right: BORDER_STYLE,
        },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0, line: 240 },
            children,
          }),
        ],
      });
    });

    return new TableRow({
      height: {
        value: CELL_SIZE_TWIPS,
        rule: "exact" as unknown as typeof import("docx").HeightRule.EXACT,
      },
      children: cells,
    });
  });

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: tableWidth, type: WidthType.DXA },
    rows,
  });
}

function buildCluesList(result: CrosswordResult, filled: boolean): Paragraph[] {
  const acrossWords = result.words
    .filter((w) => w.direction === "across")
    .sort((a, b) => a.number - b.number);

  const downWords = result.words
    .filter((w) => w.direction === "down")
    .sort((a, b) => a.number - b.number);

  const paragraphs: Paragraph[] = [];

  // ---- Заголовок «По горизонтали» ----
  paragraphs.push(
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "По горизонтали (\u2192)",
          bold: true,
          size: 22,
          font: "Arial",
        }),
      ],
    }),
  );

  for (const w of acrossWords) {
    const runs: TextRun[] = [
      new TextRun({
        text: `${w.number}. `,
        bold: true,
        size: 20,
        font: "Arial",
      }),
    ];

    // Текст подсказки, если есть; иначе — прочерки
    if (w.clue) {
      runs.push(
        new TextRun({
          text: w.clue,
          size: 20,
          font: "Arial",
        }),
      );
    } else {
      runs.push(
        new TextRun({
          text: "_".repeat(w.word.length),
          size: 20,
          font: "Arial",
        }),
      );
    }

    // Количество букв
    runs.push(
      new TextRun({
        text: ` (${pluralLetters(w.word.length)})`,
        size: 18,
        font: "Arial",
        color: "888888",
      }),
    );

    // В режиме ответов — показать слово-ответ
    if (filled) {
      runs.push(
        new TextRun({
          text: `  [${w.word}]`,
          size: 18,
          font: "Arial",
          bold: true,
          color: "4f46e5",
        }),
      );
    }

    paragraphs.push(
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: runs,
      }),
    );
  }

  // ---- Заголовок «По вертикали» ----
  paragraphs.push(
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({
          text: "По вертикали (\u2193)",
          bold: true,
          size: 22,
          font: "Arial",
        }),
      ],
    }),
  );

  for (const w of downWords) {
    const runs: TextRun[] = [
      new TextRun({
        text: `${w.number}. `,
        bold: true,
        size: 20,
        font: "Arial",
      }),
    ];

    // Текст подсказки, если есть; иначе — прочерки
    if (w.clue) {
      runs.push(
        new TextRun({
          text: w.clue,
          size: 20,
          font: "Arial",
        }),
      );
    } else {
      runs.push(
        new TextRun({
          text: "_".repeat(w.word.length),
          size: 20,
          font: "Arial",
        }),
      );
    }

    // Количество букв
    runs.push(
      new TextRun({
        text: ` (${pluralLetters(w.word.length)})`,
        size: 18,
        font: "Arial",
        color: "888888",
      }),
    );

    // В режиме ответов — показать слово-ответ
    if (filled) {
      runs.push(
        new TextRun({
          text: `  [${w.word}]`,
          size: 18,
          font: "Arial",
          bold: true,
          color: "4f46e5",
        }),
      );
    }

    paragraphs.push(
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: runs,
      }),
    );
  }

  return paragraphs;
}

export async function exportCrosswordDocx(
  result: CrosswordResult,
  filled: boolean,
  filename: string = "кроссворд.docx",
): Promise<void> {
  const { width, height } = result.bounds;

  // Выбираем ориентацию в зависимости от пропорций сетки
  const isLandscape = width > height * 1.3;

  const table = buildCrosswordTable(result, filled);
  const clues = buildCluesList(result, filled);

  const title = new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [
      new TextRun({
        text: filled ? "Кроссворд (ответы)" : "Кроссворд",
        bold: true,
        size: 32,
        font: "Arial",
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: {
              orientation: isLandscape
                ? PageOrientation.LANDSCAPE
                : PageOrientation.PORTRAIT,
              width: isLandscape ? 16838 : 11906, // A4 в twips
              height: isLandscape ? 11906 : 16838,
            },
            margin: {
              top: 567, // ~1 см
              bottom: 567,
              left: 567,
              right: 567,
            },
          },
        },
        children: [title, table, ...clues],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
