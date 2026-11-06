"use client";

import { useEffect, useRef, useState } from "react";
import { parseInteger, useTreeActions } from "@/hooks/useTreeActions";
import { Button, IconButton } from "./ui/Button";
import { Icon } from "./ui/Icon";
import styles from "./TopBar.module.css";

export function TopBar() {
  const {
    state,
    isBusy,
    canUndo,
    canRedo,
    insert,
    search,
    removeValue,
    clearTree,
    undo,
    redo,
    notify,
  } = useTreeActions();

  const [value, setValue] = useState("");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!confirmingClear) return;
    const timer = window.setTimeout(() => setConfirmingClear(false), 3400);
    return () => window.clearTimeout(timer);
  }, [confirmingClear]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.key.toLowerCase() !== "z") return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (isBusy) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBusy, redo, undo]);

  const run = (action: (parsed: number) => void) => {
    const parsed = parseInteger(value);
    if (parsed === null) {
      notify(
        "error",
        "Digite um número inteiro entre -999.999 e 999.999.",
      );
      inputRef.current?.focus();
      return;
    }
    action(parsed);
    setValue("");
    inputRef.current?.focus();
  };

  const onClear = () => {
    if (state.tree === null || isBusy) return;
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    clearTree();
    setConfirmingClear(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden="true">
          <Icon name="tree" size={21} />
        </span>
        <span className={styles.brandText}>
          <strong>Árvore Binária</strong>
          <span>Visualizador de BST</span>
        </span>
      </div>

      <div className={styles.controls}>
        <div className={styles.valueField}>
          <Icon name="pencil" size={14} className={styles.inputIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                run(insert);
              }
            }}
            placeholder="Valor"
            inputMode="numeric"
            aria-label="Valor inteiro para inserir, buscar ou remover"
            spellCheck={false}
            autoComplete="off"
            disabled={isBusy}
          />
          <kbd className={styles.kbd} aria-hidden="true">
            Enter
          </kbd>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            icon="plus"
            onClick={() => run(insert)}
            disabled={isBusy}
            title={isBusy ? "Finalize a animação atual" : "Inserir valor (Enter)"}
          >
            Inserir
          </Button>
          <Button
            variant="ghost"
            icon="search"
            onClick={() => run(search)}
            disabled={isBusy}
            title={isBusy ? "Finalize a animação atual" : "Buscar valor"}
          >
            Buscar
          </Button>
          <Button
            variant="ghost"
            icon="trash"
            className={styles.removeButton}
            onClick={() => run(removeValue)}
            disabled={isBusy}
            title={isBusy ? "Finalize a animação atual" : "Remover valor"}
          >
            Remover
          </Button>
        </div>
      </div>

      <div className={styles.utilities}>
        <IconButton
          icon="undo"
          label="Desfazer (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
        />
        <IconButton
          icon="redo"
          label="Refazer (Ctrl+Shift+Z)"
          onClick={redo}
          disabled={!canRedo}
        />
        <span className={styles.divider} aria-hidden="true" />
        <Button
          variant={confirmingClear ? "danger" : "ghost"}
          size="sm"
          icon={confirmingClear ? "alert" : "trash"}
          onClick={onClear}
          disabled={state.tree === null || isBusy}
          title="Limpar a árvore"
        >
          {confirmingClear ? "Confirmar?" : "Limpar"}
        </Button>
      </div>
    </header>
  );
}
