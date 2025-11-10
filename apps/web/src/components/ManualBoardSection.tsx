"use client";

import { cn } from "../lib/cn";
import type { GuessSnapshot, TileEvaluation } from "../lib/types";
import { GameBoard } from "./GameBoard";

interface ManualBoardSectionProps {
  rows: GuessSnapshot[];
  activeRowIndex: number;
  editableRowIndex: number | null;
  pendingGuess: string | null;
  pendingPattern: TileEvaluation[];
  onTileClick: (tileIndex: number) => void;
  onSubmit: () => void;
  onResetPattern: () => void;
  onClearHistory: () => void;
  onUndoLast?: () => void;
  hasHistory: boolean;
  disableSubmit: boolean;
  loading: boolean;
  wordLength: number;
  formError?: string | null;
}

export function ManualBoardSection({
  rows,
  activeRowIndex,
  editableRowIndex,
  pendingGuess,
  pendingPattern,
  onTileClick,
  onSubmit,
  onResetPattern,
  onClearHistory,
  onUndoLast,
  hasHistory,
  disableSubmit,
  loading,
  wordLength,
  formError,
}: ManualBoardSectionProps) {
  const hasPendingGuess = Boolean(pendingGuess);
  const pendingStatusMessage = !hasPendingGuess
    ? "Алдымен ұсыныстар тізімінен сөзді таңдаңыз."
    : `Таңдалған сөз: ${pendingGuess}`;

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Ход кестесі</h2>
        <p className="text-sm text-white/60">
          Әр жол Wordle ойыныңыздағы нақты жүрісті бейнелейді. Соңғы жолды
          таңдаулы сөз үшін өрнек кодын көрсету мақсатында қолданыңыз.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <GameBoard
          rows={rows}
          activeRowIndex={activeRowIndex}
          status="playing"
          message={null}
          editableRowIndex={editableRowIndex}
          onRowTileClick={(_, tileIdx) => onTileClick(tileIdx)}
        />

        <div className="flex flex-col items-center gap-2 text-sm text-white/70">
          <span>{pendingStatusMessage}</span>
          <span className="text-xs text-white/50">
            Ұяшықты басу арқылы таңдауды {cycleLegend(pendingPattern.length, wordLength)}.
          </span>
        </div>
      </div>

      {formError ? (
        <p className="text-sm text-red-300">{formError}</p>
      ) : (
        <p className="text-xs text-white/50">
          Сөз ұзындығы {wordLength} әріп. Әр ұяшықтың күйін белгілеу үшін 0 (⬜),
          1 (🟨) және 2 (🟩) кезектесіп шығады.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              "rounded-full border border-white/20 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-white/10",
              loading && "cursor-not-allowed opacity-60",
            )}
            onClick={onResetPattern}
            disabled={loading}
          >
            Үлгіні тазарту
          </button>
          {onUndoLast ? (
            <button
              type="button"
              className={cn(
                "rounded-full border border-white/20 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-white/10",
                (loading || !hasHistory) && "cursor-not-allowed opacity-60",
              )}
              onClick={onUndoLast}
              disabled={loading || !hasHistory}
            >
              Соңғысын жою
            </button>
          ) : null}
          <button
            type="button"
            className={cn(
              "rounded-full border border-white/20 px-4 py-2 font-semibold uppercase tracking-wide text-white transition hover:bg-white/10",
              (loading || !hasHistory) && "cursor-not-allowed opacity-60",
            )}
            onClick={onClearHistory}
            disabled={loading || !hasHistory}
          >
            Барлығын өшіру
          </button>
        </div>
        <button
          type="button"
          className={cn(
            "rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:bg-white/80",
            disableSubmit &&
              "cursor-not-allowed bg-white/30 text-black/50 hover:bg-white/30",
          )}
          onClick={onSubmit}
          disabled={disableSubmit}
        >
          {loading ? "Есептелуде..." : "Ходты сақтау"}
        </button>
      </div>
    </section>
  );
}

function cycleLegend(length: number, expectedLength: number): string {
  if (length !== expectedLength) return "жаңартыңыз";
  return "циклдеуге болады: ⬜ → 🟨 → 🟩";
}


