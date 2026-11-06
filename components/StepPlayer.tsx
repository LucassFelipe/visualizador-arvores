"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { useTreeActions } from "@/hooks/useTreeActions";
import { SPEEDS } from "@/lib/constants";
import { cx } from "@/lib/cx";
import { IconButton } from "./ui/Button";
import { Icon } from "./ui/Icon";
import styles from "./StepPlayer.module.css";

function formatSpeed(speed: number): string {
  return Number.isInteger(speed) ? `${speed}×` : `${speed}×`;
}

export function StepPlayer() {
  const {
    state,
    currentStep,
    closePlayback,
    setIndex,
    play,
    pause,
    next,
    prev,
    setSpeed,
  } = useTreeActions();

  const playback = state.playback;

  if (!playback) return null;

  const last = playback.steps.length - 1;
  const index = Math.min(playback.index, last);
  const step = currentStep;
  const atStart = index <= 0;
  const atEnd = index >= last;
  const singleStep = last <= 0;
  const progress = last <= 0 ? 0 : (index / last) * 100;

  return (
    <AnimatePresence>
      <motion.div
        key="step-player"
        className={styles.player}
        role="region"
        aria-label="Controle da animação"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.head}>
          <span
            className={cx(
              styles.kindBadge,
              playback.kind === "traversal"
                ? styles.kindTraversal
                : styles.kindOperation,
            )}
          >
            <Icon
              name={playback.kind === "traversal" ? "tree" : "sparkles"}
              size={11}
            />
            {playback.kind === "traversal" ? "Percurso" : "Operação"}
          </span>

          <strong className={styles.title}>{playback.title}</strong>

          <span className={styles.counter} aria-hidden="true">
            {index + 1} / {playback.steps.length}
          </span>

          <IconButton
            icon="close"
            label="Fechar animação"
            size="sm"
            className={styles.close}
            onClick={closePlayback}
          />
        </div>

        <p className={styles.message} aria-live="polite" aria-atomic="true">
          <Icon
            name={
              step?.kind === "found"
                ? "check"
                : step?.kind === "not-found" ||
                    step?.kind === "duplicate"
                  ? "alert"
                  : "info"
            }
            size={14}
            className={styles.messageIcon}
          />
          <span>{step?.message ?? "A animação terminou."}</span>
        </p>

        <div className={styles.controls}>
          <div className={styles.transport}>
            <IconButton
              icon="restart"
              label="Reiniciar animação"
              size="sm"
              onClick={() => setIndex(0)}
              disabled={atStart && !playback.playing}
            />
            <IconButton
              icon="prev"
              label="Passo anterior"
              size="sm"
              onClick={prev}
              disabled={atStart}
            />
            <button
              type="button"
              className={cx(styles.playButton, playback.playing && styles.isPlaying)}
              aria-label={playback.playing ? "Pausar animação" : "Reproduzir animação"}
              title={playback.playing ? "Pausar" : "Reproduzir"}
              onClick={playback.playing ? pause : play}
              disabled={singleStep}
            >
              <Icon name={playback.playing ? "pause" : "play"} size={17} />
            </button>
            <IconButton
              icon="next"
              label="Próximo passo"
              size="sm"
              onClick={next}
              disabled={atEnd}
            />
          </div>

          <div className={styles.timeline}>
            <input
              className={styles.range}
              type="range"
              min={0}
              max={Math.max(0, last)}
              step={1}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
              aria-label="Linha do tempo da animação"
              aria-valuetext={`Passo ${index + 1} de ${playback.steps.length}`}
              disabled={singleStep}
              style={{ "--progress": `${progress}%` } as CSSProperties}
            />
          </div>

          <label className={styles.speed}>
            <span className={styles.speedLabel}>Velocidade</span>
            <select
              className={styles.speedSelect}
              value={playback.speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              aria-label="Velocidade da animação"
            >
              {SPEEDS.map((speed) => (
                <option key={speed} value={speed}>
                  {formatSpeed(speed)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
