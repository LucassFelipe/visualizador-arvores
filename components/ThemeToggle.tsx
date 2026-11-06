"use client";

import { useEffect, useState } from "react";
import { IconButton } from "./ui/Button";
import styles from "./ThemeToggle.module.css";

const STORAGE_KEY = "arvore-binaria:theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem persistência o tema ainda funciona durante a sessão.
    }
    setTheme(next);
  };

  const isDark = theme === "dark";

  return (
    <IconButton
      icon={isDark ? "sun" : "moon"}
      label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={toggle}
      className={styles.toggle}
      data-theme-state={theme ?? undefined}
    />
  );
}
