"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTreeActions } from "@/hooks/useTreeActions";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./ui/Icon";
import styles from "./Toast.module.css";

const TONE_ICON: Record<"info" | "success" | "error", IconName> = {
  info: "info",
  success: "check",
  error: "alert",
};

export function Toast() {
  const { state, dismissNotice } = useTreeActions();
  const notice = state.notice;

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {notice ? (
          <motion.div
            key={`${notice.tone}-${notice.text}`}
            className={cx(styles.toast, styles[notice.tone])}
            role={notice.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.icon} aria-hidden="true">
              <Icon name={TONE_ICON[notice.tone]} size={15} />
            </span>
            <p className={styles.text}>{notice.text}</p>
            <button
              type="button"
              className={styles.close}
              aria-label="Fechar aviso"
              onClick={dismissNotice}
            >
              <Icon name="close" size={13} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
