# Visualizador de Árvore Binária — Plano de Construção

> Documento vivo. Toda decisão de arquitetura, escopo e visual fica registrada aqui antes de ir para o código.

---

## 1. Objetivo

Construir um visualizador interativo de **BST (árvore binária de busca)** com:

- Operações de **inserir, buscar e remover** animadas **passo a passo**.
- **Traversals** animados: em-ordem, pré-ordem, pós-ordem e em nível (BFS).
- **Editor livre**: selecionar nós, editar valores, adicionar/remover filhos.
- **Painel de métricas** sempre atualizado.
- Visual **clean/minimalista claro**, com animações e destaques bem cuidadosos.

### Não-objetivos (por enquanto)

- AVL, Rubro-Negra, Heap e outros tipos de árvore.
- Backend, contas de usuário ou banco de dados.
- Import/export de arquivos (não foi selecionado no escopo inicial).

---

## 2. Stack

| Camada        | Escolha                                              |
| ------------- | ---------------------------------------------------- |
| Framework     | **Next.js 16** (App Router)                          |
| Linguagem     | **TypeScript** (strict)                              |
| UI            | **React 19**                                         |
| Estilo        | **CSS Modules + design tokens** em `globals.css`      |
| Animação      | **Motion (framer-motion)**                            |
| Testes        | **Vitest** (lógica pura)                              |
| Gerenciamento | `useReducer` + Context (sem biblioteca de estado)     |
| Runtime       | Node 24 / npm 11                                      |

**Por que CSS Modules e não Tailwind?** O projeto é pequeno e muito focado em um visual autoral (nós, arestas, canvas e animações). CSS Modules dá controle total com menos ruído e zero configuração extra.

---

## 3. Arquitetura

### 3.1 Modelo de dados imutável

```ts
type NodeId = string;

interface TreeNode {
  id: NodeId;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

type Tree = TreeNode | null;
```

- Toda operação devolve uma **nova árvore** com *structural sharing*.
- IDs estáveis por nó são essenciais para as animações (o React precisa reconhecer "o mesmo nó" se movendo).
- Nunca mutamos a árvore em lugar nenhum.

### 3.2 Lógica pura separada da UI

```ts
// lib/bst.ts
insert(tree, value): { tree, inserted, duplicate }
search(tree, value): { found, path }
remove(tree, value): { tree, removed }
traverse(tree, order): NodeId[]
metrics(tree): Metrics

// lib/operations.ts
insertOperation(tree, value): OperationResult
searchOperation(tree, value): OperationResult
removeOperation(tree, value): OperationResult

// Operação = lista de passos prontos, cada um com snapshot da árvore
interface OperationResult {
  steps: Step[];
  finalTree: Tree;
  outcome: 'success' | 'duplicate' | 'not-found';
}

interface Step {
  tree: Tree;              // snapshot imutável naquele passo
  kind: 'visit' | 'compare' | 'insert' | 'remove' | 'replace' | 'found' | 'not-found' | 'done';
  activeIds: NodeId[];     // nós em destaque (pulso)
  pathIds: NodeId[];       // caminho percorrido até aqui
  message: string;         // texto do passo (aria-live)
  compare?: 'left' | 'right' | 'equal';
}
```

**Decisão-chave:** a operação é **pré-computada** em uma lista de passos. Isso permite:

- Play/pause, avançar/voltar, reiniciar e arrastar a linha do tempo.
- Velocidade ajustável sem recalcular nada.
- Testar a sequência de passos sem renderizar UI.

### 3.3 Layout da árvore

Layout **tidy recursivo** (variação simplificada de Reingold–Tilford):

- Cada subárvore é medida como um bloco.
- O pai fica centralizado entre os centros dos dois filhos.
- Nó com filho único recebe um deslocamento lateral para não virar uma linha vertical reta (importante para árvores degeneradas).
- Coordenadas em "mundo"; o canvas aplica pan/zoom por cima.
- Constantes iniciais: nó 52px, gap horizontal 32px, gap vertical 88px.

Invariantes testadas:

- Irmãos/subárvores não se sobrepõem.
- Nenhum nó filho fica acima do pai.
- Ordem horizontal respeita a ordem simétrica da BST.

### 3.4 Renderização

- **Arestas:** `<svg>` no mundo, cada aresta animada com Motion (`x1/y1/x2/y2`).
- **Nós:** `<div>` absolutos no mundo, animados com Motion (posição, entrada, saída, pulso).
- **Canvas:** grid de pontos, pan por arrastar o fundo, zoom por roda/botões, botão "Ajustar".
- **Escala:** `scale` no container do mundo; nós e textos acompanham o zoom.

### 3.5 Estado

```ts
interface AppState {
  tree: Tree;
  mode: 'idle' | 'playing' | 'editing';
  operation: OperationResult | null;
  playback: { index: number; playing: boolean; speed: number; order: TraversalOrder | null };
  selectedId: NodeId | null;
  notice: { tone: 'info' | 'success' | 'error'; text: string } | null;
}
```

- Um único reducer + Context.
- Enquanto uma operação roda, o editor fica bloqueado (evita estados impossíveis).
- `notice` para duplicado, inválido, "não encontrado", etc.

### 3.6 Estrutura de arquivos

```
app/
  layout.tsx
  page.tsx
  globals.css              # tokens, reset, tipografia, utilidades
components/
  TreeWorkspace.tsx        # composição da tela
  TreeCanvas.tsx           # mundo, pan/zoom, arestas e nós
  TreeNode.tsx
  TreeEdge.tsx
  Toolbar.tsx              # inserir / buscar / remover / limpar
  TraversalBar.tsx         # os 4 traversals
  StepPlayer.tsx           # play, pause, prev, next, velocidade, timeline
  MetricsPanel.tsx
  TraversalPanel.tsx       # sequência de visita
  NodeInspector.tsx        # editar / excluir nó selecionado
  ui/                      # Button, IconButton, Badge, Field, Toast
hooks/
  useTreeStore.ts
  usePlayback.ts
lib/
  bst.ts
  layout.ts
  operations.ts
  traversals.ts
  metrics.ts
  types.ts
  constants.ts
test/
  bst.test.ts
  layout.test.ts
  operations.test.ts
```

---

## 4. Comportamento detalhado

### 4.1 Inserir

1. Desce comparando com cada nó (passos de `compare`).
2. Se o valor já existe → **rejeitado** com aviso e shake no nó.
3. Se não existe → cria folha no slot correto.
4. Passo final destaca o novo nó (pop + verde).

### 4.2 Buscar

1. Destaca o caminho percorrido e o nó atual.
2. Mostra a comparação (`valor < nó` / `valor > nó` / `igual`).
3. Final: nó encontrado em verde ou mensagem "não encontrado" em âmbar.

### 4.3 Remover (3 casos, com passos)

- **Folha:** remove direto.
- **Um filho:** substitui o nó pelo filho.
- **Dois filhos:** encontra o **sucessor em ordem** (menor da subárvore direita), copia o valor e remove o sucessor — tudo narrado nos passos.

### 4.4 Traversals

- Em-ordem, pré-ordem, pós-ordem e BFS.
- Cada visita acende o nó e adiciona o valor na **sequência** exibida no painel.
- Cores diferentes para "atual", "já visitado" e "próximo" (fila/pilha pode ser mostrada em uma faixa, se couber no polimento).

### 4.5 Editor livre

- Clique no nó → seleciona → inspetor abre.
- Editar valor: validado contra os limites da BST naquele ponto (`min < valor < max`). Inválido é rejeitado com explicação.
- Adicionar filho: slots `+` aparecem nos lados vazios do nó selecionado.
- Excluir: mesmo algoritmo de remoção, sem animação longa.
- **Arrastar o fundo = pan**; nós não são arrastáveis (o layout é derivado da estrutura, não de posições manuais).
- Histórico de undo/redo (ver extras).

### 4.6 Métricas

- Total de nós, folhas, nós internos.
- Altura (em níveis: vazia = 0, folha = 1) e profundidade média.
- Mínimo, máximo e raiz.
- **AVL-balanceada?** (todo nó com `|alturaEsq − alturaDir| ≤ 1`).
- Fator de balanceamento da raiz.
- Indicador "BST válida ✓".

### 4.7 Playback

- Play/pause, passo anterior/próximo, reiniciar, velocidade (0.5×–4×).
- Timeline clicável com um marcador por passo.
- Mensagem do passo em `aria-live="polite"`.
- Atalhos: `Espaço` play/pause, `←`/`→` passos, `Esc` cancela seleção, `Enter` no input = inserir.
- Respeita `prefers-reduced-motion`: sem pulsos/transições longas.

---

## 5. Visual

### 5.1 Direção

Clean/minimalista claro, com personalidade:

- Fundo off-white quente, grid de pontos sutil.
- Nós brancos, borda fina, sombra baixa e tipografia tabular.
- Arestas finas e discretas; caminho ativo em índigo.
- Estados com cor sem exagero: índigo (ativo), esmeralda (sucesso), âmbar (comparação), rosa (remoção).
- Microinterações: hover com leve elevação, foco visível, entrada/saída suave.

### 5.2 Tokens iniciais

| Token             | Valor      |
| ----------------- | ---------- |
| `--bg`            | `#F7F7F5`  |
| `--surface`       | `#FFFFFF`  |
| `--ink`           | `#18181B`  |
| `--muted`         | `#71717A`  |
| `--border`        | `#E4E4E7`  |
| `--accent`        | `#4F46E5`  |
| `--accent-soft`   | `#EEF2FF`  |
| `--success`       | `#059669`  |
| `--warning`       | `#D97706`  |
| `--danger`        | `#E11D48`  |
| `--radius`        | `12px`     |
| `--shadow`        | suave, 2 níveis |

Tipografia: pilha do sistema (`ui-sans-serif`, `-apple-system`, `Segoe UI`, `Inter`, sans-serif) para não depender de download de fontes no build.

### 5.3 Layout da tela

```
┌──────────────────────────────────────────────────────────────┐
│  Header: marca + input + Inserir/Buscar/Remover + Limpar      │
├───────────────────────────────────────────┬──────────────────┤
│                                           │  Métricas        │
│                                           │  ─────────────   │
│              CANVAS                       │  Sequência       │
│         (grid, pan, zoom)                 │  ─────────────   │
│                                           │  Passo a passo   │
│                                           │                  │
├───────────────────────────────────────────┴──────────────────┤
│  Player: ⏮ ▶ ⏭  velocidade  ─────●────  mensagem do passo    │
└──────────────────────────────────────────────────────────────┘
```

- Sidebar de ~340px; em telas menores vira painel inferior.
- Canvas ocupa o restante e tem altura mínima confortável.

---

## 6. Testes e critérios de aceite

### Lógica (`lib/`)

- Inserção em árvore vazia, esquerda, direita, e duplicados rejeitados.
- Busca encontrada/não encontrada, caminho correto.
- Remoção: folha, um filho (esq/dir), dois filhos, raiz, árvore de 1 nó.
- Traversals: ordem correta em árvores conhecidas.
- Métricas: altura, folhas, min/max, balanceamento.
- Layout: sem sobreposição, pai acima dos filhos, ordem horizontal correta.

### Operações

- Cada operação termina com a árvore esperada.
- Snapshots dos passos são consistentes (a árvore nunca "pula" estados).
- Passos com mensagens não vazias e IDs válidos.

### Manual

- Inserir sequência, remover todos os casos, rodar os 4 traversals.
- Pan/zoom, ajustar, redimensionar a janela.
- Teclado e `prefers-reduced-motion`.

---

## 7. Fases e commits

Cada fase termina com o app funcionando e um commit convencional.

| # | Fase                                                        | Commit sugerido                                  |
| - | ----------------------------------------------------------- | ------------------------------------------------ |
| 0 | Repositório + plano                                          | `chore: init repo and document plan`             |
| 1 | Scaffold Next + TS + tokens + layout base                    | `chore: scaffold next app and design tokens`     |
| 2 | BST pura, métricas e testes                                  | `feat: add bst core, metrics and tests`          |
| 3 | Layout tidy + canvas animado (nós e arestas)                 | `feat: add tidy layout and animated tree canvas` |
| 4 | Engine de passos + inserir/buscar/remover                    | `feat: add step engine for tree operations`      |
| 5 | Traversals animados + painel de sequência                    | `feat: add animated traversals`                  |
| 6 | Editor livre + inspetor de nó                                | `feat: add free tree editor`                     |
| 7 | Métricas, player e polimento visual                          | `feat: add metrics panel and playback polish`    |
| 8 | Acessibilidade, teclado, reduced motion, QA final            | `chore: improve accessibility and final qa`      |

---

## 8. Decisões pendentes (confirmar antes da fase 2)

1. **Duplicados:** rejeitar com aviso (padrão) ou permitir à esquerda/direita?
2. **Edição de valor:** só permitir se a BST continuar válida (padrão) ou reconstruir a subárvore automaticamente?
3. **Extras:** incluir undo/redo, autosave em `localStorage` e atalhos de teclado?
4. **Arrastar nó:** manter pan no fundo (padrão) ou tentar posicionamento manual dos nós?

> Qualquer mudança nestas respostas altera as fases 4 e 6; o restante do plano segue igual.
