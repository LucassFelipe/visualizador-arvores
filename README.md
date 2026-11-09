# Visualizador de Árvores

Interativo visualizador de **árvore de busca** — BST, AVL, B, B\* e B+ — com operações animadas **passo a passo**, percurssos, editor, painel de métricas, undo/redo e tema claro/escuro. Construído com Next.js 16, React 19 e TypeScript em modo estrito.

![Next.js](https://img.shields.io/badge/Next.js-16.4.5-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19.3.1-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Testes](https://img.shields.io/badge/testes-131%20passando-4bb34a)
![Licença](https://img.shields.io/badge/licença-MIT-2a9d8f)

## Estruturas

| Estrutura  | Descrição                                                                        |
| ---------- | -------------------------------------------------------------------------------- |
| **BST**    | árvore binária de busca clássica                                                 |
| **AVL**    | BST auto-balanceada — rotações LL, RR, LR e RL narradas na linha do tempo        |
| **B**      | árvore B de ordem 4 — até 3 chaves por nó, splits, empréstimo e mesclagem        |
| **B\***    | variante B\* — redistribui com o irmão **antes** de dividir (e divisão 2→3)      |
| **B+**     | folhas encadeadas por elos tracejados, separadores recalculados, percurso Folhas |

## Funcionalidades

- **Operações animadas passo a passo** — inserir, buscar e remover em qualquer estrutura, com linha do tempo navegável (play/pause, avançar/voltar, scrub e velocidade de 0.25× a 4×) e narração de cada passo.
- **Percursos adaptados** — em-ordem, pré-ordem, pós-ordem e em-nível; no B+ o em-ordem vira a varredura encadeada **Folhas**.
- **Editor livre (BST/AVL)** — selecione um nó para editar o valor, adicionar filhos ou remover; no AVL a subárvore é rebalanceada automaticamente. Valores duplicados são rejeitados com aviso. Na família B, o painel mostra um inspetor **somente leitura** (a estrutura deriva das chaves).
- **Painel de métricas** — nós internos e folhas, chaves, valores, ocupação (mín/máx), ordem da árvore e, no AVL, fator de balanceamento por nó.
- **Undo/redo** — até 50 estados, com histórico **independente por estrutura** (trocar no seletor preserva o estado e o undo de todas). Atalhos: `Ctrl+Z` / `Ctrl+Shift+Z`.
- **Autosave** — estado persistido em `localStorage` (`arvore-binaria:v2`), com migração automática do formato legado `v1` e descarte de payloads corrompidos.
- **Tema claro/escuro** persistente, aplicado sem flash de layout e respeitando `prefers-color-scheme` e `prefers-reduced-motion`.
- **Canvas interativo** — arraste o fundo para navegar, zoom pela roda e botão de ajustar a árvore à tela.

## Stack

| Camada        | Tecnologia                                          |
| ------------- | --------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)                  |
| UI            | React 19 + TypeScript 5.9 (strict)                  |
| Estilos       | CSS Modules + tema por atributo `data-theme`         |
| Animações     | Motion 14                                           |
| Testes        | Vitest 5 — 131 testes em 8 arquivos                 |
| Persistência  | `localStorage` com versionamento de payload         |

## Como rodar

Requisitos: **Node.js ≥ 20.9** (testado na v24) e npm.

```bash
git clone https://github.com/LucassFelipe/visualizador-arvores.git
cd visualizador-arvores
npm install
npm run dev
```

Abra <http://localhost:3000> — se a porta estiver ocupada, use `npm run dev -- -p 3002`.

### Scripts

| Comando               | Descrição                              |
| --------------------- | -------------------------------------- |
| `npm run dev`         | servidor de desenvolvimento            |
| `npm run build`       | build de produção                      |
| `npm start`           | serve o build de produção              |
| `npm run typecheck`   | verifica os tipos (`tsc --noEmit`)     |
| `npm test`            | roda a suíte de testes                 |
| `npm run test:watch`  | testes em modo watch                   |

## Arquitetura

```
app/          → layout (tema aplicado sem FOT) e página única
components/   → canvas da árvore, painéis, linha do tempo, tema (CSS Modules)
hooks/        → useTreeStore (estado, histórico, playback) + useTreeActions
lib/          → bst.ts (núcleo binário), avl.ts, btree.ts (ordem 4),
                operations, traversals, layout, metrics, persistence
test/         → 131 testes cobrindo todas as estruturas e a persistência
```

**Modelo híbrido** — BST/AVL compartilham o núcleo binário `TreeNode`; B/B\*/B+ usam `BNode { id, keys, children }`. Um único `Step` carrega os dois snapshots (`tree` e `btree`), então a mesma linha do tempo funciona para qualquer estrutura, e cada estrutura tem seu próprio estado e histórico.

**Métricas sempre válidas** — o painel lê a árvore **commitada**, não os snapshots transitórios do playback (durante um split um nó pode ter 4 chaves por alguns passos — inválido por design).

**Transições fora do playback são instantâneas** — durante o passo a passo nós e arestas animam com spring/0.42 s; undo/redo, editor e troca de estrutura aplicam o estado de imediato, evitando o "flash" de arestas trocando de posição.

O escopo completo, as decisões de design e o checklist de implementação estão documentados em [`PLAN.md`](./PLAN.md).

## Testes

```bash
npm test
# Test Files   8 passed (8)
# Tests      131 passed (131)
```

A suíte cobre rotações AVL (LL/RR/LR/RL), invariantes das árvores B (inserção e remoção de 1..30 nas duas ordens, empréstimo, mesclagem e redistribuição B\*), separadores e ordem global de folhas do B+, layout sem sobreposição, métricas, percurssos, dispatchers por estrutura e a persistência (migração v1→v2 e payloads corrompidos).

## Licença

Distribuído sob a licença **MIT** — veja o arquivo [`LICENSE`](./LICENSE).
