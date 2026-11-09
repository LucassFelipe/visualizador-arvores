"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { balanceFactor } from "@/lib/avl";
import { heightOfB, getPathToBNodeId, isLeaf } from "@/lib/btree";
import {
  ancestorBounds,
  formatInterval,
  getPathToNodeId,
} from "@/lib/bst";
import { BTREE_MAX_KEYS, KIND_INFO, isMultiwayKind } from "@/lib/constants";
import { cx } from "@/lib/cx";
import { parseInteger, useTreeActions } from "@/hooks/useTreeActions";
import { Button, IconButton } from "./ui/Button";
import { Icon } from "./ui/Icon";
import styles from "./SidePanel.module.css";

export function InspectorPanel() {
  const {
    state,
    kind,
    isBusy,
    tree,
    btree,
    selectedNode,
    selectedBNode,
    select,
    beginEdit,
    beginAdd,
    closeEditor,
    editSelected,
    addChild,
    removeSelected,
  } = useTreeActions();

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  const mode = state.editorMode;
  const selectedId = selectedNode?.id ?? null;
  const multiway = isMultiwayKind(kind);
  const info = KIND_INFO[kind];

  useEffect(() => {
    setInput("");
    setError(null);
    if (mode === "idle") return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [mode, selectedId]);

  useEffect(() => {
    if (mode === "idle") return;
    if (!window.matchMedia("(max-width: 860px)").matches) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mode]);

  if (multiway) {
    if (!selectedBNode) {
      return (
        <section className={styles.card} aria-labelledby="inspector-hint-title">
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle} id="inspector-hint-title">
              <Icon name="search" size={14} />
              Inspetor de nós
            </h2>
            <span className={cx(styles.badge, styles.badgeNeutral)}>
              somente leitura
            </span>
          </div>
          <p className={styles.helpText}>
            Clique em um nó para ver suas chaves, profundidade e filhos. Na{" "}
            <strong>{info.label}</strong>, a edição livre fica desativada: use a
            barra superior para inserir, buscar e remover valores.
          </p>
          <div className={styles.legend} aria-label="Legenda de cores">
            <span className={styles.legendItem}>
              <span className={cx(styles.legendDot, styles.legendPath)} />
              Caminho
            </span>
            <span className={styles.legendItem}>
              <span className={cx(styles.legendDot, styles.legendCompare)} />
              Comparação
            </span>
            <span className={styles.legendItem}>
              <span className={cx(styles.legendDot, styles.legendFound)} />
              Encontrado
            </span>
          </div>
          <div className={styles.shortcuts}>
            No B+, as folhas guardam os valores e os nós internos guardam
            separadores.
          </div>
        </section>
      );
    }

    const path = getPathToBNodeId(btree, selectedBNode.id);
    const depth = Math.max(0, path.length - 1);
    const leaf = isLeaf(selectedBNode);

    return (
      <section ref={cardRef} className={styles.card} aria-labelledby="inspector-title">
        <div className={styles.inspectorHeader}>
          <span className={styles.nodeBadge}>
            {selectedBNode.keys.join("·")}
          </span>
          <div>
            <h2 className={styles.inspectorTitle} id="inspector-title">
              Nó selecionado
            </h2>
            <p className={styles.inspectorSubtitle}>
              Profundidade {depth} · {leaf ? "folha" : "nó interno"}
            </p>
          </div>
          <IconButton
            icon="close"
            label="Fechar inspetor"
            size="sm"
            className={styles.closeButton}
            onClick={() => select(null)}
          />
        </div>

        <div className={styles.infoRows}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Chaves</span>
            <span className={cx(styles.infoValue, styles.infoWrap)}>
              {selectedBNode.keys.join(", ")}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Filhos</span>
            <span className={styles.infoValue}>
              {selectedBNode.children.length === 0
                ? "—"
                : selectedBNode.children.length}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Altura da subárvore</span>
            <span className={styles.infoValue}>{heightOfB(selectedBNode)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Ocupação</span>
            <span className={styles.infoValue}>
              {selectedBNode.keys.length} de até {BTREE_MAX_KEYS} chaves
            </span>
          </div>
        </div>

        <p className={styles.helpText} style={{ marginTop: 12 }}>
          Inspetor somente leitura. Para alterar a estrutura, insira ou remova
          valores pela barra superior.
        </p>
      </section>
    );
  }

  if (!selectedNode || isBusy) {
    return (
      <section className={styles.card} aria-labelledby="inspector-hint-title">
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle} id="inspector-hint-title">
            <Icon name="pencil" size={14} />
            Editor livre
          </h2>
        </div>
        <p className={styles.helpText}>
          Clique em um nó para selecionar. <strong>Duplo clique</strong> abre a
          edição do valor, e os botões <strong>+</strong> ao redor do nó criam
          filhos.
          {kind === "avl"
            ? " Na AVL, cada alteração é seguida de rebalanceamento automático."
            : ""}
        </p>
        <div className={styles.legend} aria-label="Legenda de cores">
          <span className={styles.legendItem}>
            <span className={cx(styles.legendDot, styles.legendPath)} />
            Caminho
          </span>
          <span className={styles.legendItem}>
            <span className={cx(styles.legendDot, styles.legendCompare)} />
            Comparação
          </span>
          <span className={styles.legendItem}>
            <span className={cx(styles.legendDot, styles.legendFound)} />
            Encontrado
          </span>
        </div>
        <div className={styles.shortcuts}>
          <kbd>Ctrl</kbd> + <kbd>Z</kbd> desfaz
          <span aria-hidden="true"> · </span>
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> refaz
        </div>
      </section>
    );
  }

  const path = getPathToNodeId(tree, selectedNode.id);
  const bounds = ancestorBounds(path);
  const depth = Math.max(0, path.length - 1);
  const leaf = !selectedNode.left && !selectedNode.right;
  const factor = balanceFactor(selectedNode);

  const formBounds =
    mode === "add-left"
      ? { lower: bounds.lower, upper: Math.min(bounds.upper, selectedNode.value) }
      : mode === "add-right"
        ? {
            lower: Math.max(bounds.lower, selectedNode.value),
            upper: bounds.upper,
          }
        : bounds;

  const formTitle =
    mode === "edit"
      ? "Novo valor"
      : mode === "add-left"
        ? "Filho à esquerda"
        : "Filho à direita";

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = parseInteger(input);
    if (parsed === null) {
      setError("Use um número inteiro entre -999.999 e 999.999.");
      inputRef.current?.focus();
      return;
    }
    setError(null);
    if (mode === "edit") editSelected(parsed);
    else if (mode === "add-left") addChild("left", parsed);
    else if (mode === "add-right") addChild("right", parsed);
  };

  return (
    <section
      ref={cardRef}
      className={styles.card}
      aria-labelledby="inspector-title"
    >
      <div className={styles.inspectorHeader}>
        <span className={styles.nodeBadge}>{selectedNode.value}</span>
        <div>
          <h2 className={styles.inspectorTitle} id="inspector-title">
            Nó selecionado
          </h2>
          <p className={styles.inspectorSubtitle}>
            Profundidade {depth} · {leaf ? "folha" : "nó interno"}
          </p>
        </div>
        <IconButton
          icon="close"
          label="Fechar inspetor"
          size="sm"
          className={styles.closeButton}
          onClick={() => select(null)}
        />
      </div>

      <div className={styles.infoRows}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Filho esquerdo</span>
          <span className={styles.infoValue}>
            {selectedNode.left?.value ?? "—"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Filho direito</span>
          <span className={styles.infoValue}>
            {selectedNode.right?.value ?? "—"}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Limites</span>
          <span className={cx(styles.infoValue, styles.infoWrap)}>
            {formatInterval(bounds.lower, bounds.upper)}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Fator de balanceamento</span>
          <span className={styles.infoValue}>
            {factor > 0 ? "+" : ""}
            {factor}
          </span>
        </div>
      </div>

      <div className={styles.inspectorActions}>
        <Button
          variant="secondary"
          size="sm"
          icon="plus"
          onClick={() => beginAdd(selectedNode.id, "left")}
          disabled={Boolean(selectedNode.left)}
          title={
            selectedNode.left
              ? `Já existe o filho ${selectedNode.left.value} à esquerda`
              : "Adicionar filho à esquerda"
          }
        >
          Filho esq.
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon="plus"
          onClick={() => beginAdd(selectedNode.id, "right")}
          disabled={Boolean(selectedNode.right)}
          title={
            selectedNode.right
              ? `Já existe o filho ${selectedNode.right.value} à direita`
              : "Adicionar filho à direita"
          }
        >
          Filho dir.
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon="pencil"
          onClick={() => beginEdit(selectedNode.id)}
        >
          Editar
        </Button>
        <Button
          variant="dangerGhost"
          size="sm"
          icon="trash"
          onClick={removeSelected}
        >
          Remover
        </Button>
      </div>

      {mode !== "idle" ? (
        <form className={styles.editForm} onSubmit={submit}>
          <label className={styles.fieldLabel} htmlFor="editor-value">
            {formTitle}
          </label>
          <input
            ref={inputRef}
            id="editor-value"
            className={styles.fieldInput}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeEditor();
              }
            }}
            placeholder="Valor inteiro"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby="editor-range"
          />
          <p className={styles.fieldHint} id="editor-range">
            Permitido: {formatInterval(formBounds.lower, formBounds.upper)}
            {mode === "edit"
              ? kind === "avl"
                ? " · a subárvore será reconstruída e rebalanceada."
                : " · a subárvore será reconstruída."
              : "."}
          </p>
          {error ? (
            <p className={styles.fieldError} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.formActions}>
            <Button type="submit" variant="primary" size="sm">
              {mode === "edit" ? "Aplicar" : "Adicionar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeEditor}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
