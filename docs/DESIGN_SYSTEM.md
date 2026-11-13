# RITMO — Design System

> **Status:** proposta para aprovação. Nada aqui foi implementado ainda.
> **Para ver a direção:** abra `docs/design/preview.html` no navegador (tela Meu Dia nos temas escuro e claro, do desktop ao celular, com a folha de tokens logo abaixo). O arquivo é uma referência visual com dados de exemplo, não código do produto.
> **Para quem implementa a Fase 1:** a seção 11 traz o CSS pronto para colar; as seções 5, 6 e 10 dizem o que construir; a seção 13 lista o que ainda depende de resposta do dono do produto.

---

## 1. Direção: tinta, papel e jade

O RITMO é um lugar onde a pessoa abre o dia e fecha o dia. A interface precisa ser calma o bastante para ser vista vinte vezes por dia e clara o bastante para responder, em dois segundos, "o que é agora e o que vem depois".

A direção recomendada tem três materiais:

- **Tinta e papel.** Neutros quentes, quase sem cor: um grafite levemente aquecido no tema escuro (`#171614`) e um papel levemente creme no claro (`#F9F6F2`). Não é o preto-azulado dos painéis inspirados no Linear; é a superfície de um caderno bem cuidado.
- **Jade, um acento só.** `#69D4BE` no escuro, `#066A5B` no claro. O jade tem dois empregos e nenhum outro: marcar **o agora** (a linha do horário atual, o bloco em andamento) e **a ação principal** da tela. Foco de teclado e seleção usam o mesmo tom.
- **Pigmentos para as áreas da vida.** Oito cores de mesma saturação, mais um neutro para "Outros". Aparecem em marcas pequenas (uma barra de 3 px, um quadradinho de 8 px, um fundo a 14%), nunca como cor de texto e nunca sozinhas.

A ideia de ritmo aparece em um elemento próprio, o **compasso do dia**: uma faixa com um segmento por atividade, cada um com largura proporcional à duração, como as notas de um compasso. O que foi feito fica em tinta, o que está acontecendo fica em jade, o que vem depois é só contorno. O mesmo desenho, em miniatura, mostra a semana de cada hábito. O compasso mostra contagem e tempo ("5 de 10 atividades · 4h55 de 8h45") e nunca uma nota ou porcentagem sobre o dia.

Duas famílias tipográficas separam dado de voz: **Instrument Sans** para tudo que é interface e número, **Newsreader** (serifada) só onde o produto ou a pessoa falam — a saudação, a frase do dia, as perguntas de reflexão, o devocional, as citações de livros.

### Princípios

1. **O agora tem uma cor; o resto descansa.** Em telas de execução (Meu Dia, Agenda) há no máximo um ponto forte de jade por vez.
2. **Feito vira tinta.** Tarefa concluída, hábito marcado e segmento cumprido ficam em neutro. Não há verde de recompensa nem vermelho de falha. O dia de ontem não grita.
3. **Linhas antes de caixas.** Agrupar com espaço e fios de 1 px. Um contêiner com borda só quando o grupo é uma unidade (as três prioridades, um diálogo). Números de resumo ficam em linha, não em cards.
4. **Cor é área; forma é estado.** Cor identifica a área da vida. Prioridade, status e tipo usam ícone, peso, contorno ou posição.
5. **Número informa, não avalia.** Contagens e tempos sempre com unidade e contexto. Sem nota, sem ranking, sem medalha.

### O que não fazemos

Degradês decorativos, brilho ou sombra colorida, mais de um acento, cor escolhida livremente pelo usuário para categorias, card em volta de cada número, ícone ou botão sem função, confete, mascote, moeda, ranking, animação que não explique uma mudança de estado.

**Alternativa de acento considerada:** âmbar/mel, que combina com a ideia de luz do dia, mas colide com a cor de aviso e fica marrom ao atender contraste no tema claro. Por isso a recomendação é jade.

---

## 2. Cor

Todos os valores estão em hexadecimal sRGB. Foram desenhados em OKLCH (luminosidade e saturação controladas) e convertidos; a seção 11 traz o bloco completo.

### 2.1 Superfícies e elevação

A elevação é dada primeiro pela superfície (mais clara = mais perto, no tema escuro) e só depois pela sombra.

| Token | Uso | Escuro | Claro |
|---|---|---|---|
| `--sidebar` | Navegação lateral e barra inferior do celular (plano recuado) | `#12110F` | `#F2F0EB` |
| `--background` | Fundo do aplicativo | `#171614` | `#F9F6F2` |
| `--card` | Grupos, blocos, cartões do quadro (nível 1) | `#1F1D1B` | `#FEFDFB` |
| `--popover` | Menus, diálogos, paleta, toasts (nível 2) | `#262422` | `#FEFDFB` |
| `--muted` | Trilhos de progresso, esqueleto de carregamento, áreas rebaixadas | `#262422` | `#EFECE8` |
| `--secondary` / `--accent` | Botão secundário / fundo de hover | `#2C2B28` | `#ECE9E4` |
| `--sidebar-accent` | Item ativo ou em hover na sidebar | `#22201E` | `#E6E3DC` |

No tema claro, `--card` e `--popover` têm o mesmo valor: a diferença de nível vem da sombra (`--elevation-2`/`-3`).

> **Atenção ao nome:** no shadcn/ui, `--accent` é a superfície neutra de hover, não a cor de marca. O acento do RITMO (jade) é `--primary`. Mantivemos a convenção para os componentes do shadcn funcionarem sem alteração.

### 2.2 Texto

| Token | Uso | Escuro | Claro |
|---|---|---|---|
| `--foreground` | Texto principal, títulos, valores | `#EDEBE7` | `#211F1B` |
| `--muted-foreground` | Texto secundário, metadados, itens de navegação em repouso | `#B8B5B0` | `#58554F` |
| `--subtle-foreground` | Texto terciário: horários na margem, sobrelinhas, placeholders | `#9F9C97` | `#68645E` |

Os três níveis atendem AA (4,5:1) em todas as superfícies. Não existe um quarto nível "mais apagado"; texto desabilitado usa opacidade de 45% e é a única exceção permitida pela WCAG.

### 2.3 Contornos

| Token | Uso | Escuro | Claro |
|---|---|---|---|
| `--border` | Fios e divisórias decorativas, contorno de grupos e de botão "contorno" | `#33312E` | `#DFDCD6` |
| `--input` | Limite de controles: campos, marcadores, interruptores, segmentos "a fazer" do compasso | `#7B7874` | `#898680` |
| `--ring` | Anel de foco (igual a `--primary`) | `#69D4BE` | `#066A5B` |

`--border` é decorativo e não precisa de 3:1. Tudo que delimita um controle interativo usa `--input`, que atende 3:1 contra fundo, card e popover.

### 2.4 Acento

| Token | Uso | Escuro | Claro |
|---|---|---|---|
| `--primary` | Botão primário, linha do agora, bloco em andamento, foco, seleção, link | `#69D4BE` | `#066A5B` |
| `--primary-foreground` | Texto e ícone sobre `--primary` | `#011B16` | `#F2FDFA` |
| `--primary-soft` | Fundo de item selecionado, etiqueta "Agora", trecho reconhecido na captura | 14% de `--primary` sobre `--card` | idem |

Regras de uso do jade:

- **Telas de execução** (Meu Dia, Agenda, Tarefas): só o agora e a ação principal. Barras de progresso, marcadores concluídos e segmentos cumpridos usam `--foreground`/`--muted-foreground`.
- **Telas de acompanhamento** (Objetivos, Revisões, Insights, relatórios): o jade (`--chart-1`) é a série principal dos gráficos.
- Um botão primário por tela ou por diálogo. Se há dois candidatos, um deles é secundário.
- No tema escuro o preenchimento é claro com texto escuro; no claro, o contrário. O mesmo vale para o botão destrutivo.

### 2.5 Cores semânticas

| Token | Uso | Escuro | Claro |
|---|---|---|---|
| `--success` | Confirmação de ação ("Salvo", "Concluída") | `#76CF8A` | `#21763C` |
| `--warning` | Conflito de horário, prazo próximo, orçamento perto do limite | `#EDBB64` | `#915C08` |
| `--destructive` | Erro de validação, falha, ação destrutiva | `#F46F68` | `#BA2B28` |
| `--destructive-foreground` | Texto sobre botão destrutivo | `#1B0A09` | `#FFFBFA` |
| `--info` | Dica, novidade, estado neutro informativo | `#86BEEE` | `#2A669F` |

Cada uma tem um fundo suave (`--success-soft`, `--warning-soft`, `--destructive-soft`, `--info-soft`: 14% da cor sobre `--card`). Cor semântica nunca vai sozinha: sempre com ícone e texto. Tarefa atrasada, hábito não feito e meta abaixo do ritmo **não** usam `--destructive` — são fatos, não erros (ver seção 9).

### 2.6 Áreas da vida

| Área | Pigmento | Ícone Lucide | Escuro | Claro |
|---|---|---|---|---|
| Trabalho | azul-ardósia | `briefcase` | `#5381C4` | `#2E5A9A` |
| Estudos | ocre | `graduation-cap` | `#A87E24` | `#805C00` |
| Programação | violeta | `code` | `#9787D6` | `#5D4C95` |
| Inglês | rosa | `languages` | `#AF557B` | `#B95E84` |
| Academia | terracota | `dumbbell` | `#CF7E4B` | `#8D4302` |
| Espiritualidade | azul-céu | `book-heart` | `#008EB3` | `#0084A7` |
| Leitura | musgo | `book-open` | `#668736` | `#48660F` |
| Pessoal | orquídea | `user` | `#BB7BB9` | `#AB6CA9` |
| Outros | neutro | `shapes` | `#767471` | `#5F5D5A` |

Por que não parece aleatório:

- **Uma receita só.** Os oito pigmentos têm a mesma saturação (croma OKLCH ≈ 0,115) e variam apenas em matiz e em dois ou três degraus de luminosidade. Bem menos saturados que o acento, então o jade continua sendo a única cor "acesa".
- **Faixa do jade livre.** Nenhuma área usa matizes entre o verde e o ciano (155°–205°), nem o vermelho puro das mensagens de erro.
- **Uso restrito.** Três formas apenas: barra de 3 px no bloco da linha do tempo, quadrado de 8 px ao lado do nome da área, e fundo a 14% sobre `--card` nos compromissos. O texto continua em `--foreground`/`--muted-foreground`.
- **Nunca só cor.** A área vem sempre com nome ou ícone. Isso também cobre daltonismo.
- **Categorias personalizadas** escolhem um dos oito pigmentos (ou o neutro) e um ícone Lucide. Não há seletor de cor livre. *Consequência para o banco:* guardar a chave do pigmento (`ocre`, `violeta`…), não um hexadecimal.

A ordem da tabela é fixa e é a ordem de empilhamento nos gráficos. Ela foi validada para daltonismo (simulação de protanopia e deuteranopia de Machado et al., distância em OKLab × 100):

| Verificação (pares vizinhos na ordem fixa) | Alvo | Escuro | Claro |
|---|---|---|---|
| Pior par sob daltonismo, oito pigmentos | ≥ 8 | 13,6 | 11,7 |
| Pior par em visão típica, oito pigmentos | ≥ 15 | 15,2 | 17,5 |
| Pessoal ↔ Outros sob daltonismo / visão típica | ≥ 8 / ≥ 15 | 11,5 / 16,0 | 13,9 / 18,3 |
| Menor contraste de uma marca de área contra `--card` | ≥ 3:1 | 3,53:1 | 3,79:1 |

### 2.7 Contraste (WCAG 2.1 AA)

Calculado com a fórmula de luminância relativa da WCAG a partir dos hexadecimais finais; nada foi estimado. Mínimos: 4,5:1 para texto, 3:1 para texto grande e limites de controles.

| Par (texto ou elemento / fundo) | Tokens | Mínimo AA | Escuro | Claro |
|---|---|---|---|---|
| Texto principal / fundo | `--foreground` / `--background` | 4,5:1 | 15,19:1 | 15,27:1 |
| Texto principal / card | `--foreground` / `--card` | 4,5:1 | 14,11:1 | 16,18:1 |
| Texto principal / popover | `--foreground` / `--popover` | 4,5:1 | 12,99:1 | 16,18:1 |
| Texto principal / sidebar | `--foreground` / `--sidebar` | 4,5:1 | 15,85:1 | 14,45:1 |
| Texto principal / item ativo da sidebar | `--foreground` / `--sidebar-accent` | 4,5:1 | 13,64:1 | 12,84:1 |
| Texto principal / hover (accent) | `--foreground` / `--accent` | 4,5:1 | 11,89:1 | 13,59:1 |
| Texto secundário / fundo | `--muted-foreground` / `--background` | 4,5:1 | 8,85:1 | 6,89:1 |
| Texto secundário / card | `--muted-foreground` / `--card` | 4,5:1 | 8,22:1 | 7,31:1 |
| Texto secundário / sidebar | `--muted-foreground` / `--sidebar` | 4,5:1 | 9,23:1 | 6,52:1 |
| Texto secundário / muted | `--muted-foreground` / `--muted` | 4,5:1 | 7,57:1 | 6,31:1 |
| Texto secundário / popover | `--muted-foreground` / `--popover` | 4,5:1 | 7,57:1 | 7,31:1 |
| Texto secundário / hover (accent) | `--muted-foreground` / `--accent` | 4,5:1 | 6,93:1 | 6,13:1 |
| Texto terciário / fundo | `--subtle-foreground` / `--background` | 4,5:1 | 6,61:1 | 5,46:1 |
| Texto terciário / card | `--subtle-foreground` / `--card` | 4,5:1 | 6,14:1 | 5,78:1 |
| Texto terciário / sidebar | `--subtle-foreground` / `--sidebar` | 4,5:1 | 6,90:1 | 5,16:1 |
| Texto terciário / popover | `--subtle-foreground` / `--popover` | 4,5:1 | 5,65:1 | 5,78:1 |
| Texto terciário / muted | `--subtle-foreground` / `--muted` | 4,5:1 | 5,65:1 | 4,99:1 |
| Texto do botão primário / acento | `--primary-foreground` / `--primary` | 4,5:1 | 10,06:1 | 6,27:1 |
| Acento como texto / fundo | `--primary` / `--background` | 4,5:1 | 10,13:1 | 6,05:1 |
| Acento como texto / card | `--primary` / `--card` | 4,5:1 | 9,41:1 | 6,41:1 |
| Acento como texto / sidebar | `--primary` / `--sidebar` | 4,5:1 | 10,57:1 | 5,73:1 |
| Anel de foco / fundo | `--ring` / `--background` | 3:1 | 10,13:1 | 6,05:1 |
| Anel de foco / card | `--ring` / `--card` | 3:1 | 9,41:1 | 6,41:1 |
| Anel de foco / sidebar | `--ring` / `--sidebar` | 3:1 | 10,57:1 | 5,73:1 |
| Anel de foco / popover | `--ring` / `--popover` | 3:1 | 8,66:1 | 6,41:1 |
| Contorno de controle (input) / fundo | `--input` / `--background` | 3:1 | 4,12:1 | 3,37:1 |
| Contorno de controle (input) / card | `--input` / `--card` | 3:1 | 3,83:1 | 3,57:1 |
| Contorno de controle (input) / popover | `--input` / `--popover` | 3:1 | 3,52:1 | 3,57:1 |
| Texto do botão destrutivo / destructive | `--destructive-foreground` / `--destructive` | 4,5:1 | 6,69:1 | 5,90:1 |
| Perigo como texto / fundo | `--destructive` / `--background` | 4,5:1 | 6,30:1 | 5,63:1 |
| Perigo como texto / card | `--destructive` / `--card` | 4,5:1 | 5,86:1 | 5,96:1 |
| Sucesso como texto / fundo | `--success` / `--background` | 4,5:1 | 9,53:1 | 5,24:1 |
| Sucesso como texto / card | `--success` / `--card` | 4,5:1 | 8,85:1 | 5,55:1 |
| Aviso como texto / fundo | `--warning` / `--background` | 4,5:1 | 10,24:1 | 5,21:1 |
| Aviso como texto / card | `--warning` / `--card` | 4,5:1 | 9,52:1 | 5,53:1 |
| Info como texto / fundo | `--info` / `--background` | 4,5:1 | 9,14:1 | 5,57:1 |
| Info como texto / card | `--info` / `--card` | 4,5:1 | 8,49:1 | 5,90:1 |
| Série 1 de gráfico / card | `--chart-1` / `--card` | 3:1 | 5,91:1 | 4,55:1 |
| Neutro de gráfico / card | `--chart-neutral` / `--card` | 3:1 | 3,61:1 | 3,30:1 |
| Divisória (decorativa) / fundo | `--border` / `--background` | — (decorativo) | 1,39:1 | 1,27:1 |
| Texto principal / fundo suave de área (pior caso das 9) | `--foreground` / mistura 14% | 4,5:1 | 11,70:1 | 12,96:1 |
| Texto secundário / fundo suave de área (pior caso) | `--muted-foreground` / mistura 14% | 4,5:1 | 6,81:1 | 5,85:1 |
| Acento como texto / `--primary-soft` | `--primary` / `--primary-soft` | 4,5:1 | 7,27:1 | 5,17:1 |
| Sucesso como texto / seu fundo suave | `--success` / `--success-soft` | 4,5:1 | 6,95:1 | 4,57:1 |
| Aviso como texto / seu fundo suave | `--warning` / `--warning-soft` | 4,5:1 | 7,37:1 | 4,55:1 |
| Perigo como texto / seu fundo suave | `--destructive` / `--destructive-soft` | 4,5:1 | 4,87:1 | 4,85:1 |
| Info como texto / seu fundo suave | `--info` / `--info-soft` | 4,5:1 | 6,63:1 | 4,81:1 |
| Texto terciário / hover | `--subtle-foreground` / `--accent` | 4,5:1 | 5,18:1 | 4,85:1 |
| Texto terciário / item ativo da sidebar | `--subtle-foreground` / `--sidebar-accent` | 4,5:1 | 5,94:1 | 4,59:1 |
| Marca de área / card (menor das 9) | `--area-*` / `--card` | 3:1 | 3,53:1 | 3,79:1 |
| Marca de área / fundo (menor das 9) | `--area-*` / `--background` | 3:1 | 3,80:1 | 3,58:1 |

Texto sobre os fundos suaves a 14% foi calculado reproduzindo a mistura em OKLab que o navegador faz com `color-mix()`.

---

## 3. Tipografia

### 3.1 Famílias

| Papel | Família | Licença | Uso |
|---|---|---|---|
| Interface e dados | **Instrument Sans** (variável, peso 400–700) | SIL OFL 1.1 | Tudo, exceto os casos abaixo |
| Voz | **Newsreader** (variável, peso e tamanho óptico) | SIL OFL 1.1 | Saudação, frase do dia, perguntas de reflexão, texto de devocional, citações de leitura, títulos de página de leitura longa |
| Código | pilha monoespaçada do sistema | — | Trechos de código no Dev Space; nenhum download |

Ambas são livres e podem ser empacotadas com o PWA. Na implementação, hospedar os `.woff2` variáveis no próprio app (subconjuntos `latin` e `latin-ext`), com `font-display: swap` e pré-carregamento só da Instrument Sans. Os arquivos das duas fontes foram inspecionados: têm algarismos tabulares (`tnum`) e todos os acentos do português.

Se a fonte não carregar, as pilhas de fallback (`system-ui`/Segoe UI e Palatino/Georgia) mantêm o layout; isso foi testado no preview com o domínio das fontes bloqueado.

**Regra da serifada:** se o texto é uma etiqueta, um valor ou um comando, é sans. Se é uma frase dita à pessoa ou escrita por ela, pode ser serifada. Números grandes (cronômetro, valores) são sempre sans.

### 3.2 Escala

Mantém os nomes do Tailwind para os componentes do shadcn funcionarem sem ajuste. A base da interface é `text-sm` (14 px).

| Papel | Classe | Tamanho / entrelinha | Peso | Observação |
|---|---|---|---|---|
| Saudação | `font-serif text-3xl` | 32 / 40 | 400 | `tracking-tight`; no celular, `text-2xl` (24 / 32) |
| Título de página | `text-2xl` | 24 / 32 | 600 | `tracking-tight` |
| Valor em destaque | `text-xl` | 20 / 28 | 600 | Linha de resumo |
| Cronômetro | `text-4xl` | 40 / 48 | 600 | Tabular; `text-2xl` dentro do bloco ativo |
| Voz e leitura | `font-serif text-lg` | 18 / 28 | 400 | Frase do dia, perguntas, citações; `text-base` no celular |
| Título de seção | `text-base` | 16 / 24 | 600 | "Foco do dia", "Linha do tempo" |
| Texto de leitura | `text-base` | 16 / 24 | 400 | Notas, descrições longas, campos no celular |
| Corpo | `text-sm` | 14 / 20 | 400; ênfase 500 | Padrão da interface |
| Legenda | `text-xs` | 12 / 16 | 400 | Metadados, horários |
| Sobrelinha | `text-2xs` | 11 / 16 | 600 | Caixa alta, `tracking-wide` (+0,06em); rótulos de grupo |

Pesos usados: 400, 500 e 600. Não há 700. Itálico só na Newsreader, para citações.

### 3.3 Números

- `tabular-nums` em tudo que se alinha em coluna ou muda ao vivo: horários na margem da linha do tempo, tabelas, valores em lista, cronômetros, contadores.
- Valores grandes isolados (linha de resumo) usam os algarismos proporcionais padrão.
- Horas: `14:50`, intervalos com meia-risca `14:15–15:45`, durações `45 min`, `1h30`, `2 h`.
- Dinheiro: `R$ 1.250,00`; em resumos, sem centavos (`R$ 6.400`). Sinal no texto (`− R$ 89,90`), não na cor.
- Datas: `quinta-feira, 12 de novembro`; abreviado `12 nov.`; mês e ano `dez. de 2027`.

---

## 4. Espaçamento, raio, contornos, sombra e movimento

### 4.1 Espaçamento

Grade de 4 px (`--spacing: 0.25rem`). Valores usados: **4, 8, 12, 16, 24, 32, 48, 64**.

| Distância | Uso |
|---|---|
| 4 | Entre ícone e texto dentro de uma etiqueta; entre título e metadado |
| 8 | Entre itens de uma lista compacta; entre botões lado a lado |
| 12 | Espaço interno de linhas e blocos; entre marcador e texto |
| 16 | Espaço interno de grupos e cartões; margem lateral no celular |
| 24 | Entre o cabeçalho de uma seção e blocos vizinhos; espaço interno de diálogos |
| 32 | Entre seções; margem superior do conteúdo |
| 48 | Entre colunas; entre grandes blocos de uma página |
| 64 | Respiro final da página |

Regra prática: o espaço entre grupos é pelo menos o dobro do espaço dentro do grupo.

### 4.2 Raio

`--radius: 0.625rem` (10 px), com a escala derivada do shadcn.

| Token | Valor | Uso |
|---|---|---|
| `rounded-sm` | 6 px | Etiquetas de tecla, marcas pequenas |
| `rounded-md` | 8 px | Botões, campos, blocos da linha do tempo, itens de menu e de navegação |
| `rounded-lg` | 10 px | Grupos, cartões do quadro, toasts |
| `rounded-xl` | 14 px | Diálogos, folhas, paleta de comandos |
| `rounded-full` | — | Marcadores de conclusão, avatares, etiquetas, botão de captura no celular |

Um elemento dentro de outro usa o raio um degrau menor.

### 4.3 Contornos

- Fio de 1 px em `--border` para divisórias e grupos.
- 1 px em `--input` para controles; 1,5 px no marcador circular.
- Tracejado só para "espaço vazio que aceita algo": intervalo livre na linha do tempo, destino de arraste no quadro.
- Sem bordas duplas: se dois grupos se tocam, um fio só.

### 4.4 Sombra e elevação

| Nível | Token | Onde |
|---|---|---|
| 0 | — (só fio) | Conteúdo da página |
| 1 | `shadow-sm` → `--elevation-1` | Cartão do quadro em hover |
| 2 | `shadow-md` → `--elevation-2` | Menus, popovers, bloco em andamento, botão de captura no celular |
| 3 | `shadow-lg` → `--elevation-3` | Diálogos, paleta, toasts, cartão sendo arrastado |

Sombras são neutras (nunca coloridas). No tema escuro, a superfície mais clara faz a maior parte do trabalho. Atrás de diálogos, `--overlay`.

### 4.5 Movimento

| Token | Duração | Uso |
|---|---|---|
| `--duration-fast` | 120 ms | Hover, pressionar, marcar e desmarcar |
| `--duration-base` | 200 ms | Menus, abas, expandir e recolher, troca de tema |
| `--duration-slow` | 320 ms | Diálogos, folhas, preenchimento de progresso, reordenação |

Curvas: `ease-out` `(0.2, 0, 0, 1)` para o que entra ou responde ao toque; `ease-in` `(0.4, 0, 1, 1)` para o que sai; `ease-in-out` `(0.4, 0, 0.2, 1)` para o que se move dentro da tela.

Regras:

- Toda animação explica uma mudança de estado. Nada se move sozinho, exceto o ponto da linha do agora (pulsação lenta de opacidade) e o esqueleto de carregamento.
- Anima-se `opacity` e `transform`; evita-se animar `height` em listas longas.
- Ao marcar um item, o marcador preenche em jade por 320 ms e assenta em tinta. Esse é o único "prêmio" visual.
- Entrada de diálogo: opacidade + 8 px de deslocamento. Sem escala elástica, sem quique.
- **`prefers-reduced-motion: reduce`:** transições viram troca instantânea, pulsações param, progresso salta para o valor final, arraste continua funcionando sem animação de acomodação. O bloco base da seção 11 já aplica isso globalmente.

---

## 5. Layout

### 5.1 Pontos de quebra

| Faixa | Shell | Conteúdo |
|---|---|---|
| < 768 px (celular) | Barra superior de 48 px, navegação inferior de 64 px + área segura | Uma coluna, margens de 16 px |
| 768–1023 px (tablet) | Trilho de ícones de 64 px, com rótulo em tooltip; cabeçalho de 56 px | Uma coluna, margens de 32 px |
| 1024–1279 px | Sidebar fixa de 248 px; cabeçalho de 56 px | Uma coluna; painéis laterais descem para baixo em duas colunas |
| ≥ 1280 px | Sidebar fixa de 248 px; cabeçalho de 56 px | Duas colunas no Meu Dia (principal + lateral de 336 px) |

São os pontos de quebra padrão do Tailwind (`md`, `lg`, `xl`). A largura do conteúdo é limitada a 1152 px (`max-w-content`) e centralizada; telas de leitura e formulários longos usam 680 px (`max-w-reading`); quadro Kanban e agenda semanal podem ir a 1440 px (`max-w-wide`).

### 5.2 Sidebar (desktop)

Dezesseis destinos em quatro grupos, para que a lista não vire uma parede de links:

```
RITMO
[ Buscar ou executar…        Ctrl K ]

DIA
  Meu Dia
  Agenda
  Entrada                           3     ← capturas ainda sem classificar

PLANEJAR
  Tarefas                           4     ← em aberto hoje
  Projetos                                ← quadros Kanban
  Objetivos                               ← inclui a Visão do ano
  Hábitos

ÁREAS                               ⌄     ← grupo recolhível
  Estudos
  Programação
  Inglês
  Leitura
  Saúde
  Espiritualidade
  Finanças

ACOMPANHAR
  Revisões                                ← semanal e mensal
  Insights

──────────────────────────────────────
(LM) Lucas Martins                  ⚙
```

- Item: 32 px de altura, ícone de 16 px, rótulo em peso 500, `--muted-foreground` em repouso. Ativo: fundo `--sidebar-accent`, texto `--foreground`, ícone em jade. É o único jade da sidebar.
- Ícones monocromáticos. As cores das áreas não aparecem na navegação.
- Contadores só onde pedem ação (Entrada, Tarefas), em texto terciário, sem bolha colorida.
- O grupo **Áreas** é recolhível e lembra o estado. Módulos desativados nas configurações somem daqui; um grupo sem itens some inteiro.
- Notificações ficam no cabeçalho (sino); configurações e conta ficam no rodapé.
- A lista rola sozinha se a janela for baixa; marca e rodapé ficam fixos.

### 5.3 Cabeçalho (desktop e tablet)

56 px, fixo, com fundo translúcido e fio inferior. Da esquerda para a direita: nome do módulo; controles do contexto (no Meu Dia: dia anterior, "Hoje", próximo dia); espaço; notificações; **Capturar** (botão secundário com a tecla `C`). A saudação não fica no cabeçalho, e sim no conteúdo, onde tem espaço para respirar.

### 5.4 Tablet

A sidebar vira um trilho de 64 px: só ícones, alvos de 40 px, os grupos separados por um fio, rótulos em tooltip. O trilho pode ser expandido como uma folha sobre o conteúdo. O conteúdo usa uma coluna; painéis laterais ficam abaixo, lado a lado.

### 5.5 Celular

```
┌───────────────────────────────┐
│ Meu Dia                    🔔 │  barra superior, 48 px
├───────────────────────────────┤
│                               │
│          conteúdo             │
│                               │
├───────────────────────────────┤
│ Meu Dia  Agenda  (+)  Tarefas  Mais │  64 px + área segura
└───────────────────────────────┘
```

- **Quatro destinos e a captura.** Meu Dia, Agenda e Tarefas são o que se abre várias vezes ao dia. O centro é o botão de **captura rápida** (48 px, jade), sempre ao alcance do polegar. Hábitos não ganham aba porque são marcados direto no Meu Dia.
- **Mais** abre uma folha de baixo para cima com os mesmos grupos da sidebar (Planejar, Áreas, Acompanhar), busca no topo, e configurações no fim.
- A captura abre como folha inferior com o teclado já ativo.
- Diálogos viram folhas inferiores; menus de contexto viram folhas de ações.
- Toasts aparecem acima da navegação inferior.
- Tudo que é tocável tem pelo menos 44 × 44 px (seção 7.7).

---

## 6. Componentes

### 6.1 shadcn/ui sem alteração (só recebem os tokens)

Dialog, AlertDialog, Sheet, Drawer, Popover, DropdownMenu, ContextMenu, Tooltip, Tabs, Select, Switch, RadioGroup, Label, Form, Textarea, Separator, ScrollArea, Collapsible, Avatar, Skeleton, Calendar (seletor de data), Table, Command, Sonner.

### 6.2 shadcn/ui com variante RITMO

| Componente | O que muda |
|---|---|
| **Button** | Variantes `primary`, `secondary`, `outline` (borda em `--border`), `ghost`, `destructive` (texto em `--destructive-foreground`, não branco). Tamanhos: `sm` 32 px, padrão 36 px, `touch` 44 px (usado abaixo de 768 px). Peso 500. Sem sombra. |
| **Input / Textarea / Select** | Borda de 1 px em `--input`, fundo `--background`, raio `md`. Foco: borda `--ring` + halo de 3 px a 30%. Erro: borda `--destructive` + mensagem com ícone. Fonte de 16 px em telas de toque. |
| **Checkbox** | Ganha a forma **Marcador**: círculo de 20 px (24 px no celular) para tarefas e hábitos. A caixa quadrada fica para formulários e seleção múltipla. |
| **Badge** | Neutra (`--secondary`), semânticas (fundo suave + texto na cor + ícone), "Agora" (`--primary-soft`), e **etiqueta de área** (quadrado de 8 px + nome, sem fundo). |
| **Card** | Sem sombra, borda `--border`, raio `lg`, espaço interno 16–20 px. Usar pouco (princípio 3). |
| **Progress** | Barra de 4 px, trilho `--muted`, preenchimento `--foreground` em telas de execução e `--chart-1` em acompanhamento. Sem porcentagem dentro da barra. |
| **Sidebar** | Largura 15,5 rem, trilho de 4 rem, grupos com sobrelinha, item ativo como em 5.2. |
| **Tooltip** | Invertido (fundo `--foreground`, texto `--background`), `text-xs`, mostra o atalho quando existe. |
| **Sonner (toast)** | Superfície `--popover`, `--elevation-3`, ícone semântico, uma ação no máximo. |
| **Command** | Base da paleta de comandos e da captura rápida (6.3). |

### 6.3 Componentes próprios do produto

**Compasso do dia** (`DayMeasure`)
- *Anatomia:* sobrelinha + contagem ("5 de 10 atividades"); faixa de 12 px com um segmento por atividade planejada, largura proporcional à duração (mínimo 6 px), 3 px de vão; rodapé com início, tempo dedicado de planejado, e fim.
- *Estados:* segmento feito (`--foreground`), em andamento (`--primary`), a fazer (contorno `--input`), não realizado em dia encerrado (permanece contorno). Dia vazio: faixa única tracejada.
- *Comportamento:* passar o cursor ou focar um segmento mostra a atividade; clicar rola até ela na linha do tempo. Nunca mostra porcentagem nem muda de cor conforme o "desempenho".

**Bloco da linha do tempo** (`TimelineBlock`)
- *Anatomia:* horário de início na margem (tabular); barra de 3 px na cor da área; à esquerda, marcador (tarefa) ou ícone de agenda (compromisso); título; metadados (área · duração · vínculo com objetivo, hábito ou projeto); intervalo de horário à direita. Altura cresce com a duração (mínimo 44 px, máximo 92 px).
- *Estados:* **compromisso** (fundo da área a 14%); **tarefa flexível** (fundo `--card` + contorno); **em andamento** (contorno jade, `--elevation-2`, cronômetro, barra de tempo, ações Concluir e Pausar); **concluído** (uma linha de 36 px, texto secundário, marcador preenchido); **conflito** (contorno e ícone de aviso + texto "Coincide com…"); **arrastando** (`--elevation-3`); **intervalo livre** (linha tracejada com "Livre · 2h45" e "Planejar").
- *Comportamento:* blocos concluídos antes do agora se recolhem em uma linha ("5 concluídas antes de agora · 4h20") que expande ao clicar. "Reorganizar" ativa o arraste (dnd-kit) com alças; pelo teclado, `Espaço` pega, setas movem em passos de 15 min, `Enter` solta, `Esc` cancela. Compromissos mostram um cadeado e pedem confirmação para mudar de horário.

**Foco do dia** (`FocusList`)
- *Anatomia:* um grupo com até três linhas de 60 px: número, marcador, título em 16 px, etiqueta de área, e estado à direita (horário, "Em andamento", "Concluída às 08:02").
- *Estados:* a fazer, em andamento (marcador com ponto jade, estado em jade), concluída (texto secundário); posição vazia ("Escolher prioridade", tracejada).
- *Comportamento:* a quarta prioridade não entra: a interface pede para trocar uma das três. Reordenável por arraste.

**Linha de hábito e semana em compasso** (`HabitRow`, `WeekBeats`)
- *Anatomia:* marcador, nome, etiqueta de área com horário e meta, sete traços de 4 × 14 px (segunda a domingo) e contagem "2/3" (feitos / previstos até hoje).
- *Estados dos traços:* feito (tinta), previsto e não feito (contorno), hoje pendente (contorno jade), dia futuro ou sem previsão (ponto baixo).
- *Comportamento:* marcar registra na hora, com "Desfazer" no toast. Segurar (ou menu) oferece "Registrar parcial", "Dia excepcional" e "Pausar hábito".

**Calendário de consistência** (`ConsistencyCalendar`)
- *Anatomia:* grade de semanas em colunas e dias em linhas, células de 14 px com 3 px de vão, rótulos de dia à esquerda, legenda abaixo, resumo em texto ("31 de 39 dias previstos em 12 semanas").
- *Estados da célula:* feito (tinta cheia), parcial (tinta a 45%), previsto e não feito (contorno vazio — nunca vermelho), sem previsão (`--muted`), dia excepcional (hachura), pausado (contorno tracejado), hoje (anel jade).
- *Comportamento:* cada célula tem tooltip e foco de teclado com data e registro; clicar abre o dia. A sequência atual aparece como texto simples; perder a sequência não muda nenhuma cor.

**Progresso de objetivo** (`GoalProgress`)
- *Anatomia:* título; à direita, a medida natural do objetivo ("3 de 8 marcos", "R$ 6.400 de R$ 10.000"); barra de 4 px; linha de contexto ("até dez. de 2027 · avançou hoje").
- *Estados:* em andamento, sem movimentação recente (contexto diz "sem registros há 3 semanas", sem cor de alerta), pausado (barra tracejada), concluído (barra cheia + data).
- *Comportamento:* a linha inteira é um link para o objetivo. Na página do objetivo, a barra ganha um marcador do ritmo esperado para a data.

**Cartão do quadro** (`KanbanCard`)
- *Anatomia:* título (até duas linhas); linha de metadados com etiqueta de área, prioridade (ícone de bandeira + palavra), prazo, checklist "2/5" e estimativa. Só aparecem os campos preenchidos.
- *Estados:* repouso (contorno), hover (`--elevation-1`), foco, arrastando (`--elevation-3`, contorno `--input`), destino (retângulo tracejado na coluna), concluído (título em texto secundário).
- *Comportamento:* arraste entre colunas e dentro da coluna (dnd-kit), com alternativa por teclado e por menu "Mover para…". Clique abre o detalhe em folha lateral (desktop) ou tela cheia (celular).

**Linha de resumo** (`StatLine`)
- *Anatomia:* de três a cinco medidas em uma faixa entre dois fios, separadas por fios verticais; cada uma com rótulo (12 px), valor (20 px, peso 600) e complemento (12 px).
- *Estados:* carregando (esqueleto no lugar do valor), vazio ("—" com complemento explicando).
- *Comportamento:* abaixo de 1024 px mostra as três primeiras; cada medida pode ser link para o módulo.

**Cronômetro de sessão** (`SessionTimer`)
- *Anatomia:* área e conteúdo da sessão; tempo decorrido em 40 px tabular; "de 30 min planejados"; barra de 3 px; ações Finalizar (primária) e Pausar.
- *Estados:* parado, em andamento, pausado (tempo em texto secundário + "Pausado há 2 min"), além do planejado ("+12 min além do planejado", sem cor de alerta), finalizando (campo de observação).
- *Comportamento:* continua contando com o app em segundo plano; a sessão ativa aparece como uma pílula no cabeçalho em qualquer tela. Fechar o app com sessão ativa não a perde.

**Captura rápida** (`QuickCapture`)
- *Anatomia:* um campo único; linha de tipos (Tarefa, Compromisso, Despesa, Ideia, Anotação, Objetivo); rodapé com atalhos. Trechos reconhecidos no texto ("amanhã 9h", "#pessoal", "R$ 45") ganham fundo `--primary-soft`.
- *Estados:* vazio (placeholder "O que você quer guardar?"), digitando, salvando, salvo (fecha e mostra toast com "Abrir"), erro (mantém o texto e mostra mensagem no próprio painel).
- *Comportamento:* `C` abre de qualquer tela; `Enter` salva na Entrada sem exigir mais nada; `Tab` troca o tipo; `Shift+Enter` salva e mantém aberto; `Esc` fecha (pergunta antes só se há texto). No celular é uma folha inferior.

**Estado vazio** (`EmptyState`)
- *Anatomia:* ícone de 20 px em texto terciário, título de 16 px, uma frase, uma ação primária e, no máximo, uma secundária.
- *Variantes:* primeiro uso (explica para que serve o módulo), sem resultados (oferece limpar filtros), tudo feito (frase curta, sem ação).
- *Comportamento:* nunca usa ilustração nem exclamação; a ação leva direto ao fluxo de criação.

---

## 7. Padrões

### 7.1 Estados de dados

| Estado | Padrão |
|---|---|
| **Carregando** | Esqueleto com a forma do conteúdo final (linhas e blocos em `--muted`, pulsação lenta). Aparece só depois de 200 ms. Em recarga, mantém o conteúdo anterior a 60% de opacidade, sem piscar esqueleto. Botões em espera mostram um giro e travam, mantendo a largura. |
| **Vazio** | `EmptyState` (6.3). Listas dentro de uma tela cheia usam uma linha de texto em vez do bloco inteiro. |
| **Erro de carregamento** | No lugar do conteúdo: ícone de alerta, "Não foi possível carregar [o quê].", botão "Tentar de novo". Sem código técnico na frente; detalhes em "Ver detalhes". |
| **Sem conexão** | Faixa fina no topo: "Sem conexão. Suas alterações serão enviadas quando a internet voltar." |
| **Sucesso** | A própria interface muda (o item aparece, o marcador preenche). Toast só quando o resultado não está visível ou quando há "Desfazer". |

### 7.2 Retorno das ações

| Ação | Retorno |
|---|---|
| Marcar tarefa ou hábito | Imediato na linha (atualização otimista) + toast "Tarefa concluída." com **Desfazer** por 5 s |
| Criar pela captura rápida | Painel fecha + toast "Guardado na Entrada." com **Abrir** |
| Salvar formulário | Fecha o diálogo e o item atualizado aparece; sem toast se o resultado está visível |
| Mover, arrastar, reordenar | O item fica onde foi solto; se falhar, volta com toast de erro |
| Edição em linha (título, nota) | Salva ao sair do campo; "Salvo" discreto ao lado por 2 s |
| Erro de validação | Em linha, abaixo do campo, com ícone; foco vai para o primeiro campo com erro |
| Falha do servidor | Toast persistente com **Tentar de novo**; o que a pessoa digitou não se perde |
| Excluir | Confirmação (7.4) ou toast com **Desfazer**, conforme o caso |
| Ação longa (exportar, backup) | Progresso em linha no próprio botão ou painel; toast ao terminar |

Toasts: canto inferior direito no desktop, acima da navegação no celular; um por vez visível, os demais em fila; 5 s (8 s se tiver ação); pausam ao passar o cursor; erros ficam até serem fechados.

### 7.3 Formulários

- Rótulo sempre visível acima do campo. Placeholder só como exemplo ("Ex.: 45 min"), nunca como rótulo.
- Uma coluna. Dois campos lado a lado só quando formam um par (início e fim, valor e conta).
- Só o título é obrigatório na maioria das criações. Campos opcionais não levam "(opcional)"; os obrigatórios é que levam indicação quando são mais de um.
- Validar ao sair do campo e ao enviar, não a cada tecla. Mensagem diz como corrigir ("Informe um valor maior que zero.").
- Campos avançados (recorrência, checklist, vínculos) ficam atrás de "Mais opções".
- Botões no rodapé, alinhados à direita no desktop: secundário "Cancelar", primário com o verbo da ação ("Criar tarefa", "Salvar alterações"). No celular, primário em largura total, acima do cancelar.
- Datas e horas aceitam digitação ("amanhã", "sex 14h") além do seletor.
- Valores em dinheiro: teclado numérico, máscara `R$`, alinhados à direita em tabelas.

### 7.4 Ações destrutivas

- **Reversível** (excluir tarefa, hábito, movimentação, anotação): executa na hora e oferece **Desfazer** por 8 s. Sem diálogo.
- **Irreversível ou em cascata** (excluir objetivo com marcos, projeto com tarefas, conta com movimentações, apagar a conta de usuário): `AlertDialog` que diz o que será perdido em números ("Isso também exclui 12 tarefas e 3 marcos."), botão destrutivo com o verbo exato ("Excluir projeto") e "Cancelar" como foco inicial.
- **Apagar todos os dados ou a conta:** exige digitar o nome do item ou a senha.
- Sempre que fizer sentido, oferecer a alternativa mais leve antes: "Arquivar" ou "Pausar".
- O botão destrutivo nunca é o primário de uma tela; só aparece dentro da confirmação ou em menus.

### 7.5 Teclado

| Atalho | Ação |
|---|---|
| `Ctrl K` (`⌘ K` no macOS) | Paleta de comandos: ir para qualquer módulo, buscar itens, executar ações |
| `C` | Captura rápida |
| `G` e depois `D` / `A` / `T` / `O` / `H` | Ir para Meu Dia / Agenda / Tarefas / Objetivos / Hábitos |
| `T` | No Meu Dia e na Agenda: voltar para hoje |
| `←` `→` | Dia (ou semana, mês) anterior e próximo |
| `J` `K` ou `↑` `↓` | Mover a seleção em listas |
| `Espaço` | Marcar ou desmarcar o item selecionado |
| `Enter` | Abrir o item selecionado |
| `E` | Editar o item selecionado |
| `Esc` | Fechar diálogo, folha, paleta; sair do modo de reorganização |
| `?` | Mostrar a lista de atalhos |

Atalhos de uma tecla só valem fora de campos de texto. Cada atalho aparece no tooltip do controle correspondente e na paleta. Todo fluxo funciona só com teclado, inclusive arraste (dnd-kit com sensor de teclado e anúncios para leitor de tela).

### 7.6 Foco

- Anel de 2 px em `--ring`, com 2 px de afastamento, em todo elemento interativo, só em `:focus-visible`.
- Campos de texto: borda `--ring` + halo de 3 px a 30% (o anel externo se confundiria com a borda).
- Nunca remover o contorno sem substituto. O anel atende 3:1 em todas as superfícies (seção 2.7).
- Diálogos prendem o foco e o devolvem ao elemento de origem ao fechar. Ao abrir, o foco vai para o primeiro campo, ou para "Cancelar" em confirmações destrutivas.
- Primeiro elemento da página: link "Pular para o conteúdo".

### 7.7 Toque

- Alvo mínimo de **44 × 44 px** abaixo de 768 px, com 8 px entre alvos vizinhos. Controles visualmente menores (marcador de 24 px, ícone de 20 px) ampliam a área tocável com espaço interno.
- Itens da navegação inferior: 64 px de altura, um quinto da largura.
- Linhas de lista: no mínimo 48 px.
- Nada depende só de hover: ações secundárias de uma linha ficam em um menu "…" sempre visível no celular.
- Gestos (deslizar para concluir, segurar para opções) são atalhos, nunca o único caminho.
- No desktop, alvos de ponteiro têm no mínimo 32 px.

### 7.8 Ícones

Lucide, traço de 1,75. Tamanhos: 16 px em linhas, botões e navegação; 20 px na navegação inferior e em estados vazios; 12 px dentro de etiquetas. A cor é a do texto ao lado. Ícone sozinho como botão tem sempre `aria-label` e tooltip.

---

## 8. Gráficos

Recharts, com estas regras:

- **Primeiro, perguntar se é um gráfico.** Um número só é uma linha de resumo. Parte de um todo com até seis partes é uma barra segmentada. Gráfico só quando há comparação ou evolução.
- **Poucas séries.** Uma série: `--chart-1` (jade). Duas, para "planejado e realizado" ou "este mês e o anterior": `--chart-neutral` + `--chart-1`. Por área da vida: as cores das áreas, na ordem fixa da seção 2.6. Séries sem relação com áreas (por exemplo, contas financeiras): `--chart-1` a `--chart-5`, nessa ordem, no máximo cinco; o resto vira "Outros".
- **Cor segue a entidade.** Trabalho é azul-ardósia em qualquer gráfico e com qualquer filtro.
- **Rótulo direto.** Valor na ponta da barra, nome ao lado da linha. Com duas ou mais séries há legenda; com uma, o título já diz o que é. Nunca um número em cada ponto: rotula-se o último, o maior ou o que importa.
- **Texto em tinta.** Rótulos, valores e legendas usam as cores de texto, não a cor da série.
- **Marcas finas.** Barras de até 12–16 px com ponta arredondada de 4 px e base reta; linhas de 2 px; pontos de 8 px só no último valor ou no foco; área preenchida a 10% de opacidade.
- **Sem enfeite.** Sem grade vertical, sem moldura, sem sombra, sem 3D, sem degradê. Grade horizontal só quando não há rótulo direto, em fio contínuo `--border`. Eixos sem linha; só os valores, em `text-xs` e texto terciário.
- **Um eixo só.** Duas medidas de escalas diferentes viram dois gráficos pequenos.
- **Sem juízo na cor.** Receitas em jade e despesas em neutro, com sinal no texto. Vermelho só para estouro de orçamento, com ícone e texto.
- **Interação.** Tooltip ao passar o cursor e ao focar pelo teclado, com os mesmos valores do rótulo; nunca é o único jeito de ler um valor.
- **Acessibilidade.** Todo gráfico tem um resumo em texto ("Trabalho 31h30, Programação 6h…") e a opção "Ver como tabela".
- **Vazio e pouco dado.** Menos de dois pontos: mostra o número e a frase "Ainda não há dados suficientes para um gráfico."

`--chart-1` é um degrau mais profundo do jade que `--primary`, para que preenchimentos grandes não brilhem. A sequência `--chart-1…5` foi validada para daltonismo: pior par vizinho 10,6 (escuro) e 12,4 (claro), contra o alvo de 8.

---

## 9. Voz

O RITMO fala como um bom caderno falaria: curto, calmo, concreto. Em português do Brasil, tratando a pessoa por "você".

### Princípios

1. **Descreva, não julgue.** Diga o que aconteceu e o que pode ser feito. Sem "você falhou", "você deveria", "cuidado".
2. **Fatos com unidade.** "3 de 5 hábitos", "há 3 semanas", "R$ 240 acima do limite". Sem "muito", "pouco", "ótimo", "ruim".
3. **A próxima ação é um convite.** "Você pode mover para amanhã." em vez de "Reagende agora!".
4. **Sem exclamação, sem emoji, sem caixa alta para ênfase.** Elogio também é juízo: no lugar de "Parabéns!", o fato ("7 dias seguidos de leitura.").
5. **Verbo no botão.** "Criar tarefa", "Mover para amanhã", "Excluir projeto". Nunca "OK", "Sim", "Enviar".
6. **Mesma palavra para a mesma coisa.** Entrada, compromisso, tarefa, hábito, objetivo, marco, área, reserva, aporte, sequência. Não alternar com "inbox", "evento", "meta", "streak".
7. **Erro é do sistema até prova em contrário.** "Não foi possível salvar." em vez de "Você digitou errado."
8. **Frase inteira, ponto final.** Rótulos e botões sem ponto; mensagens com ponto.

### Antes e depois

| Situação | Evitar | Usar |
|---|---|---|
| Sequência interrompida | "Você perdeu sua sequência de 12 dias! 😢" | "Sequência anterior: 12 dias. Uma nova começa quando você quiser." |
| Tarefas atrasadas | "Você tem 4 tarefas atrasadas!" | "4 tarefas ficaram de dias anteriores. Quer trazer alguma para hoje?" |
| Dia sem nada planejado | "Você não planejou nada. Comece agora!" | "Dia em branco. Você pode puxar algo da Entrada ou deixar o dia livre." |
| Dia encerrado com pouco feito | "Só 22% concluído. Dia improdutivo." | "Hoje rendeu menos que o plano, e tudo bem. O que ficou pode ir para outro dia." |
| Hábito não feito | "Você falhou em Estudar inglês ontem." | "Estudar inglês não foi registrado ontem. Marcar agora ou deixar como está?" |
| Objetivo parado | "Atenção: objetivo abandonado há 3 semanas." | "Sem registros em “Reserva de emergência” há 3 semanas." |
| Orçamento estourado | "Você estourou o orçamento de Alimentação!" | "Alimentação passou R$ 240 do limite de novembro." |
| Agenda cheia demais | "Erro: horário indisponível." | "Hoje já tem 9h30 planejadas. Dá para encaixar, mas o dia fica sem folga." |
| Conflito de horário | "Conflito detectado!!" | "Coincide com “Dentista”, das 16:30 às 17:00." |
| Tudo concluído | "Parabéns, você arrasou! 🎉" | "Tudo o que estava planejado para hoje foi feito." |
| Erro ao salvar | "Erro 500. Falha na requisição." | "Não foi possível salvar. Sua alteração continua aqui. Tentar de novo" |
| Excluir com cascata | "Tem certeza? Esta ação é irreversível!" | "Excluir “Site pessoal”? Isso também exclui 12 tarefas. Não dá para desfazer." |
| Semana abaixo da meta de estudo | "Você estudou menos do que deveria." | "Estudo nesta semana: 4h de 6h planejadas." |
| Reflexão do dia | "Como você avalia seu desempenho hoje?" | "Como foi o seu dia?" |

### Saudação e frase do dia

- Saudação por horário: "Bom dia" (5h–11h59), "Boa tarde" (12h–17h59), "Boa noite" (18h–4h59), seguida do primeiro nome e ponto final.
- A frase do dia é gerada por regras a partir de dados reais, em uma ou duas frases curtas, sempre descritivas: "Cinco atividades já ficaram para trás. A tarde ainda tem quase três horas livres." Se não houver nada a dizer, não aparece.
- Nunca usar frases motivacionais genéricas nem atribuir sentimentos à pessoa.

---

## 10. Tela "Meu Dia"

É a tela inicial. Em dois segundos precisa responder: *como está o dia, o que é agora, o que vem depois.*

### 10.1 Hierarquia

1. **Agora** — o bloco em andamento, com a linha do horário atual. Único ponto forte de jade e a única ação primária ("Concluir").
2. **Foco do dia** — as três prioridades, em texto maior (16 px), acima da linha do tempo.
3. **Saudação e compasso** — contexto: que dia é, como o dia está indo. Maior em tamanho, mas sem cor.
4. **O que vem** — próximos blocos e intervalos livres.
5. **Hábitos, objetivos, reflexão** — apoio, na coluna lateral (ou abaixo, no celular).
6. **O que passou** — recolhido em uma linha.

### 10.2 Desktop (1440 × 900)

```
┌────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐
│ ▂█▅ RITMO      │ Meu Dia   ‹ Hoje ›                                              (sino)  [+ Capturar C] │ 1
│ [Buscar… CtrlK]├────────────────────────────────────────────────────────────────────────────────────────┤
│                │ QUINTA-FEIRA, 12 DE NOVEMBRO                        COMPASSO DO DIA    5 de 10 atividades│
│ DIA            │ Boa tarde, Lucas.                             2     ▰▰▰▰▰▰▰▰▰▰▰▰▰▰ ▰▰▰▰ ▱▱ ▱▱▱▱ ▱ ▱   3 │
│ ▸ Meu Dia      │ Cinco atividades já ficaram para trás. A tarde…     06:30   4h55 de 8h45 planejadas 22:25│
│   Agenda       │ ────────────────────────────────────────────────────────────────────────────────────── │
│   Entrada    3 │ Compromissos        │ Tarefas              │ Hábitos           │ Objetivos ativos    4 │
│                │ 3  próximo às 18:30 │ 4  em aberto · 3 conc.│ 2 de 5  3 ainda hoje│ 3  1 avançou hoje    │
│ PLANEJAR       │ ────────────────────────────────────────────────────────────────────────────────────── │
│   Tarefas    4 │                                                                                        │
│   Projetos     │ Foco do dia                      3 de 3 definidas │ Hábitos de hoje        semana atual │
│   Objetivos    │ ┌──────────────────────────────────────────────┐  │ (✓) Devocional         ▮▮▮▮···  4/4 │
│   Hábitos      │ │ 1 (✓) Treino B — costas e bíceps   Concluída │5 │ (✓) Academia           ▮▯▮▮···  3/4 │ 8
│                │ │ 2 (•) Corrigir bug no relatório  Em andamento│  │ ( ) Estudar inglês     ▮▮▯▯···  2/3 │
│ ÁREAS        ⌄ │ │ 3 ( ) Aula de conversação em inglês    18:30 │  │ ( ) Programar          ▮▮▮▯···  3/3 │
│   Estudos      │ └──────────────────────────────────────────────┘  │ ( ) Ler                ▯▮▮▯···  2/3 │
│   Programação  │                                                   │                                    │
│   Inglês       │ Linha do tempo                     ⠿ Reorganizar  │ Objetivos em andamento   Ver todos │
│   Leitura      │  06:30  › 5 concluídas antes de agora       4h20 6│ Conversar em inglês…  3 de 8 marcos│
│   Saúde        │  14:50 ●───────────────────────────────────────  7│ ━━━━━━━──────────────              │ 9
│   Espiritual.  │  14:15 ┌─────────────────────────────────────────┐│ Reserva de emergência  R$ 6.400 de…│
│   Finanças     │        │▌(•) Corrigir bug no relatório…   35:12  ││ ━━━━━━━━━━━━━────────              │
│                │        │▌    Trabalho · 14:15–15:45       de 1h30││ ─────────────────────── dobra ──── │
│ ACOMPANHAR     │        │▌    ━━━━━━━━───────────────────────     ││ Publicar o RITMO v1    2 de 6 marcos│
│   Revisões     │        │▌    [✓ Concluir]  [Ⅱ Pausar]            ││                                    │
│   Insights     │        └─────────────────────────────────────────┘│ ┌────────────────────────────────┐ │
│                │  15:45 ┄┄ Livre · 2h45 ┄┄┄┄┄┄┄┄┄┄┄┄┄ + Planejar ┄┄ │ │ Reflexão do dia              10│ │
│ ────────────── │  18:30 ▌ Aula de conversação em inglês 18:30–19:15│ │ Fica disponível às 20h…        │ │
│ (LM) Lucas M. ⚙│  19:45 ▌ RITMO — API de autenticação   19:45–21:15│ │ Escrever agora                 │ │
└────────────────┴───────────────────────────────────────────────────┴─┴────────────────────────────────┴─┘
   248 px            coluna principal (flexível)            48 px         coluna lateral, 336 px
```

1. **Cabeçalho** (56 px, fixo): módulo, navegação de dia, notificações, captura rápida (secundário, tecla `C`).
2. **Saudação**: sobrelinha com a data; saudação serifada de 32 px; frase do dia serifada de 18 px em texto secundário.
3. **Compasso do dia** (400 px, alinhado à base da saudação): único indicador de progresso do dia.
4. **Linha de resumo**: quatro medidas entre dois fios. O tempo não se repete aqui porque já está no compasso.
5. **Foco do dia**: um grupo, três linhas de 60 px.
6. **Passado recolhido**: uma linha de 36 px; expande no lugar.
7. **Linha do agora e bloco em andamento**: sempre acima da dobra em 900 px de altura. Ao abrir a tela depois das 12h, a linha do tempo já começa aqui.
8. **Hábitos de hoje**: só os previstos para hoje, na ordem do horário.
9. **Objetivos em andamento**: até três, priorizando os que têm atividade hoje.
10. **Reflexão do dia**: bloco discreto durante o dia (10.4).

**Acima da dobra (1440 × 900):** saudação, compasso, resumo, as três prioridades, o bloco em andamento com suas ações, os cinco hábitos e dois objetivos.

### 10.3 Celular (390 × 844)

```
┌──────────────────────────────────────┐
│ Meu Dia                       (sino) │  barra superior, 48 px
├──────────────────────────────────────┤
│ QUINTA-FEIRA, 12 DE NOVEMBRO         │
│ Boa tarde, Lucas.                    │  serifada, 24 px
│ Cinco atividades já ficaram para     │  serifada, 16 px
│ trás. A tarde ainda tem quase três…  │
│                                      │
│ COMPASSO DO DIA    5 de 10 atividades│
│ ▰▰▰▰▰▰▰▰▰▰▰▰▰ ▰▰▰▰ ▱▱ ▱▱▱▱ ▱ ▱     │  largura total
│ 06:30   4h55 de 8h45 planejadas 22:25│
│ ──────────────────────────────────── │
│ Compromissos │ Tarefas    │ Hábitos  │  três medidas
│ 3            │ 4          │ 2 de 5   │
│ ──────────────────────────────────── │
│ Foco do dia          3 de 3 definidas│
│ ┌──────────────────────────────────┐ │
│ │1 (✓) Treino B — costas e bíceps  │ │
│ │      Academia   Concluída às 08:02│ │
│ │2 (•) Corrigir bug no relatório…  │ │
│ │      Trabalho        Em andamento│ │
│ │3 ( ) Aula de conversação em ingl.│ │
│ │      Inglês                 18:30│ │
│ └──────────────────────────────────┘ │
│ Linha do tempo         ⠿ Reorganizar │ ← dobra (844 px)
│ 06:30 › 5 concluídas antes de agora  │
│ 14:50 ●───────────────────────────── │
│ 14:15 ┌─────────────────────────────┐│
│       │▌(•) Corrigir bug no         ││
│       │▌    relatório de estoque    ││
│       │▌    Trabalho · 14:15–15:45  ││
│       │▌    35:12  de 1h30          ││
│       │▌    ━━━━━━━━────────────    ││
│       │▌    [✓ Concluir] [Ⅱ Pausar] ││  botões de 44 px, largura dividida
│       └─────────────────────────────┘│
│ 15:45 ┄ Livre · 2h45 ┄┄┄ + Planejar ┄│
│ 18:30 ▌ Aula de conversação em inglês│
│ …                                    │
│ Hábitos de hoje                      │
│ Objetivos em andamento               │
│ Reflexão do dia                      │
├──────────────────────────────────────┤
│ Meu Dia   Agenda   (+)   Tarefas  Mais│  fixa, 64 px + área segura
└──────────────────────────────────────┘
```

- Mesma ordem do desktop, em uma coluna. A coluna lateral desce para depois da linha do tempo.
- **Acima da dobra:** saudação, compasso, resumo e as três prioridades, com a navegação e a captura sempre visíveis. A linha do tempo começa logo abaixo, já no agora.
- O intervalo de horário à direita dos blocos some (o início está na margem e a duração nos metadados); títulos quebram em duas linhas em vez de cortar.
- No bloco em andamento, o cronômetro fica entre os metadados e a barra; os botões dividem a largura.
- A linha de resumo mostra três medidas.
- Tocar no botão central abre a captura rápida como folha inferior.

### 10.4 Reflexão do dia

| Momento | Como aparece |
|---|---|
| Durante o dia | Bloco discreto no fim da coluna lateral: "Fica disponível às 20h. Se o dia terminar antes, você pode começar quando quiser." + "Escrever agora" |
| A partir das 20h (configurável), ou quando o último bloco termina | Sobe para o topo da coluna principal, acima do Foco do dia, com a primeira pergunta em serifada e o botão primário "Encerrar o dia" |
| Ao escrever | Tela de leitura (680 px), uma pergunta por vez, em serifada: "O que você conseguiu fazer?", "O que ficou pendente?", "O que você aprendeu?", "O que pode ser melhor amanhã?", "Como foi o seu dia?" (cinco opções em palavras, sem carinhas nem nota). Todas opcionais. O que ficou pendente já vem listado, com "Mover para amanhã" em cada item |
| Depois de registrada | Volta a ser um bloco discreto: "Reflexão registrada às 21:40." + "Ver" |

### 10.5 Outros estados da tela

- **Manhã, antes da primeira atividade:** o compasso é todo contorno; a frase do dia resume o plano ("Dez atividades hoje, a primeira às 06:30."); a linha do tempo começa do início.
- **Dia sem nada planejado:** `EmptyState` no lugar da linha do tempo ("Dia em branco."); foco do dia com três posições vazias; compasso tracejado.
- **Dia passado:** sem linha do agora; compasso final; reflexão no topo, se houver; tudo somente leitura, com "Mover para hoje" nos itens pendentes.
- **Dia cheio demais:** ao planejar além de um limite configurável de horas, aviso em linha, sem bloquear: "Hoje já tem 9h30 planejadas. Dá para encaixar, mas o dia fica sem folga."
- **Carregando:** esqueleto com a mesma estrutura (saudação, faixa do compasso, três linhas de foco, quatro blocos).
- **Erro:** saudação e navegação continuam; o conteúdo dá lugar à mensagem com "Tentar de novo".

---

## 11. Tokens

Bloco pronto para `src/index.css` (Tailwind v4 + shadcn/ui). `:root` é o tema claro e `.dark` o escuro, como o shadcn espera; o app inicia com a classe `dark` no `<html>` (aplicada por um script em linha antes da primeira pintura, lendo a preferência salva e, na falta dela, o sistema).

Os valores de `:root`, `.dark` e `@theme` são exatamente os usados em `docs/design/preview.html`.

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* 1. Valores por tema ------------------------------------------------------ */

/* Tema claro */
:root {
  color-scheme: light;
  --radius: 0.625rem;
  /* Movimento */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;
  /* Superfícies */
  --background: #f9f6f2;
  --card: #fefdfb;
  --popover: #fefdfb;
  --muted: #efece8;
  --secondary: #ece9e4;
  --accent: #ece9e4;
  /* Texto */
  --foreground: #211f1b;
  --card-foreground: #211f1b;
  --popover-foreground: #211f1b;
  --secondary-foreground: #211f1b;
  --accent-foreground: #211f1b;
  --muted-foreground: #58554f;
  --subtle-foreground: #68645e;
  /* Contornos */
  --border: #dfdcd6;
  --input: #898680;
  --ring: #066a5b;
  /* Acento (jade) */
  --primary: #066a5b;
  --primary-foreground: #f2fdfa;
  /* Semânticas */
  --destructive: #ba2b28;
  --destructive-foreground: #fffbfa;
  --success: #21763c;
  --warning: #915c08;
  --info: #2a669f;
  /* Sidebar */
  --sidebar: #f2f0eb;
  --sidebar-foreground: #211f1b;
  --sidebar-primary: #066a5b;
  --sidebar-primary-foreground: #f2fdfa;
  --sidebar-accent: #e6e3dc;
  --sidebar-accent-foreground: #211f1b;
  --sidebar-border: #e2dfda;
  --sidebar-ring: #066a5b;
  /* Áreas da vida */
  --area-trabalho: #2e5a9a;
  --area-estudos: #805c00;
  --area-programacao: #5d4c95;
  --area-ingles: #b95e84;
  --area-academia: #8d4302;
  --area-espiritualidade: #0084a7;
  --area-leitura: #48660f;
  --area-pessoal: #ab6ca9;
  --area-outros: #5f5d5a;
  /* Gráficos */
  --chart-1: #008472;
  --chart-2: #8d4302;
  --chart-3: #2e5a9a;
  --chart-4: #805c00;
  --chart-5: #ab6ca9;
  --chart-neutral: #8f8c87;
  /* Tons suaves (fundo de seleção, avisos, bloco ativo) */
  --primary-soft: color-mix(in oklab, var(--primary) 14%, var(--card));
  --success-soft: color-mix(in oklab, var(--success) 14%, var(--card));
  --warning-soft: color-mix(in oklab, var(--warning) 14%, var(--card));
  --destructive-soft: color-mix(in oklab, var(--destructive) 14%, var(--card));
  --info-soft: color-mix(in oklab, var(--info) 14%, var(--card));
  /* Elevação */
  --elevation-1: 0 1px 2px rgb(33 31 27 / 0.06);
  --elevation-2: 0 1px 2px rgb(33 31 27 / 0.05), 0 6px 16px -4px rgb(33 31 27 / 0.10);
  --elevation-3: 0 2px 4px rgb(33 31 27 / 0.05), 0 20px 48px -12px rgb(33 31 27 / 0.22);
  --overlay: rgb(33 31 27 / 0.32);
}

/* Tema escuro (principal) */
.dark {
  color-scheme: dark;
  /* Superfícies */
  --background: #171614;
  --card: #1f1d1b;
  --popover: #262422;
  --muted: #262422;
  --secondary: #2c2b28;
  --accent: #2c2b28;
  /* Texto */
  --foreground: #edebe7;
  --card-foreground: #edebe7;
  --popover-foreground: #edebe7;
  --secondary-foreground: #edebe7;
  --accent-foreground: #edebe7;
  --muted-foreground: #b8b5b0;
  --subtle-foreground: #9f9c97;
  /* Contornos */
  --border: #33312e;
  --input: #7b7874;
  --ring: #69d4be;
  /* Acento (jade) */
  --primary: #69d4be;
  --primary-foreground: #011b16;
  /* Semânticas */
  --destructive: #f46f68;
  --destructive-foreground: #1b0a09;
  --success: #76cf8a;
  --warning: #edbb64;
  --info: #86beee;
  /* Sidebar */
  --sidebar: #12110f;
  --sidebar-foreground: #edebe7;
  --sidebar-primary: #69d4be;
  --sidebar-primary-foreground: #011b16;
  --sidebar-accent: #22201e;
  --sidebar-accent-foreground: #edebe7;
  --sidebar-border: #242320;
  --sidebar-ring: #69d4be;
  /* Áreas da vida */
  --area-trabalho: #5381c4;
  --area-estudos: #a87e24;
  --area-programacao: #9787d6;
  --area-ingles: #af557b;
  --area-academia: #cf7e4b;
  --area-espiritualidade: #008eb3;
  --area-leitura: #668736;
  --area-pessoal: #bb7bb9;
  --area-outros: #767471;
  /* Gráficos */
  --chart-1: #31ab95;
  --chart-2: #cf7e4b;
  --chart-3: #5381c4;
  --chart-4: #a87e24;
  --chart-5: #bb7bb9;
  --chart-neutral: #767471;
  /* Tons suaves (fundo de seleção, avisos, bloco ativo) */
  --primary-soft: color-mix(in oklab, var(--primary) 14%, var(--card));
  --success-soft: color-mix(in oklab, var(--success) 14%, var(--card));
  --warning-soft: color-mix(in oklab, var(--warning) 14%, var(--card));
  --destructive-soft: color-mix(in oklab, var(--destructive) 14%, var(--card));
  --info-soft: color-mix(in oklab, var(--info) 14%, var(--card));
  /* Elevação */
  --elevation-1: 0 1px 2px rgb(0 0 0 / 0.30);
  --elevation-2: 0 1px 2px rgb(0 0 0 / 0.30), 0 8px 20px -6px rgb(0 0 0 / 0.50);
  --elevation-3: 0 2px 4px rgb(0 0 0 / 0.30), 0 24px 56px -12px rgb(0 0 0 / 0.65);
  --overlay: rgb(0 0 0 / 0.56);
}

/* 2. Tokens estáticos (viram utilitários do Tailwind) ---------------------- */

@theme {
  /* Famílias */
  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-serif: "Newsreader", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
  --font-mono: "Cascadia Mono", "SF Mono", Menlo, Consolas, "Liberation Mono", ui-monospace, monospace;
  /* Escala tipográfica (tamanho + entrelinha) */
  --text-2xs: 0.6875rem;
  --text-2xs--line-height: 1rem;
  --text-xs: 0.75rem;
  --text-xs--line-height: 1rem;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.25rem;
  --text-base: 1rem;
  --text-base--line-height: 1.5rem;
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.75rem;
  --text-xl: 1.25rem;
  --text-xl--line-height: 1.75rem;
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 2rem;
  --text-3xl: 2rem;
  --text-3xl--line-height: 2.5rem;
  --text-4xl: 2.5rem;
  --text-4xl--line-height: 3rem;
  /* Pesos */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  /* Espaçamento entre letras */
  --tracking-tight: -0.015em;
  --tracking-normal: 0em;
  --tracking-wide: 0.06em;
  /* Curvas de animação */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  /* Grade de 4 px e medidas do shell */
  --spacing: 0.25rem;
  --spacing-sidebar: 15.5rem;
  --spacing-rail: 4rem;
  --spacing-header: 3.5rem;
  --spacing-bottom-nav: 4rem;
  --spacing-aside: 21rem;
  --spacing-touch: 2.75rem;
  /* Larguras de conteúdo */
  --container-reading: 42.5rem;
  --container-content: 72rem;
  --container-wide: 90rem;
}

/* 3. Mapeamento das variáveis de tema para utilitários -------------------- */

@theme inline {
  --color-background: var(--background);
  --color-card: var(--card);
  --color-popover: var(--popover);
  --color-muted: var(--muted);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  --color-foreground: var(--foreground);
  --color-card-foreground: var(--card-foreground);
  --color-popover-foreground: var(--popover-foreground);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-accent-foreground: var(--accent-foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-subtle-foreground: var(--subtle-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-area-trabalho: var(--area-trabalho);
  --color-area-estudos: var(--area-estudos);
  --color-area-programacao: var(--area-programacao);
  --color-area-ingles: var(--area-ingles);
  --color-area-academia: var(--area-academia);
  --color-area-espiritualidade: var(--area-espiritualidade);
  --color-area-leitura: var(--area-leitura);
  --color-area-pessoal: var(--area-pessoal);
  --color-area-outros: var(--area-outros);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-neutral: var(--chart-neutral);
  --color-primary-soft: var(--primary-soft);
  --color-success-soft: var(--success-soft);
  --color-warning-soft: var(--warning-soft);
  --color-destructive-soft: var(--destructive-soft);
  --color-info-soft: var(--info-soft);
  --color-overlay: var(--overlay);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --shadow-sm: var(--elevation-1);
  --shadow-md: var(--elevation-2);
  --shadow-lg: var(--elevation-3);
}

/* 4. Base ------------------------------------------------------------------ */

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans text-sm antialiased;
  }
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Notas de uso:

- **Cores:** `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary text-primary-foreground`, `text-subtle-foreground`, `bg-primary-soft`, `bg-area-trabalho`…
- **Fundo suave de área:** o componente recebe `--area` por atributo (por exemplo `style={{ "--area": "var(--area-ingles)" }}`) e usa `bg-[color-mix(in_oklab,var(--area)_14%,var(--card))]`. Vale encapsular em um utilitário `@utility area-soft`.
- **Durações:** não existe espaço de nomes de duração no `@theme` do Tailwind v4; usar `duration-(--duration-fast)`, `duration-(--duration-base)`, `duration-(--duration-slow)`.
- **Medidas do shell:** `w-sidebar`, `w-rail`, `h-header`, `h-bottom-nav`, `w-aside`, `min-h-touch`, `max-w-content`, `max-w-reading`, `max-w-wide`.
- **Sidebar do shadcn:** ajustar as constantes do componente para `15.5rem` (aberta) e `4rem` (trilho).
- **Ícones:** `strokeWidth={1.75}` como padrão global do Lucide.
- **Recharts** lê as cores por `var(--chart-1)` etc.; nenhuma cor fica escrita em componente.
- Nenhum hexadecimal aparece fora deste bloco. Se um componente precisar de uma cor que não existe aqui, a discussão é sobre o token, não sobre o componente.

---

## 12. Como isto foi verificado

- **Contraste:** todas as razões da seção 2.7 foram calculadas por script (luminância relativa WCAG 2.1) a partir dos hexadecimais finais. Nenhum par exigido ficou abaixo do mínimo.
- **Paleta das áreas e dos gráficos:** validada por script para faixa de luminosidade, saturação mínima, separação sob protanopia e deuteranopia, separação em visão típica e contraste contra a superfície, nos dois temas.
- **Fontes:** os arquivos da Instrument Sans e da Newsreader foram baixados do repositório do Google Fonts e inspecionados: ambos têm `tnum` e os glifos do português.
- **Preview:** aberto no Chrome real (modo headless, controlado pelo protocolo DevTools) e conferido por captura de tela nos temas escuro e claro em 1440 × 900 e 390 × 844, além de 820, 1100 e 1920 px de largura. Em cada um foram verificados por script: ausência de rolagem horizontal, ausência de texto cortado, e alvos de toque de pelo menos 44 px no celular. Também foram testados o alternador de tema, o comportamento com as web fonts bloqueadas e com `prefers-reduced-motion`.
- **Igualdade dos tokens:** um script compara cada declaração de `:root`, `.dark` e `@theme` deste documento com o `preview.html`.
- **Não verificado:** Safari e Firefox, um aparelho físico (as larguras de celular foram emuladas), leitor de tela, e os estados de hover e arraste em uso real (aparecem como amostras estáticas). Tailwind e shadcn/ui ainda não foram instalados, então o bloco da seção 11 segue a documentação atual das duas ferramentas, mas não passou por um build.

---

## 13. Perguntas em aberto para o dono do produto

1. **Acento jade.** Aprovado? A alternativa considerada foi âmbar (ver seção 1), com custo no tema claro.
2. **Serifada para a voz.** A Newsreader na saudação, na frase do dia e nas reflexões dá identidade, mas é uma segunda família para carregar. Manter, ou tudo em sans?
3. **"Feito vira tinta."** Itens concluídos e barras de progresso ficam em neutro nas telas do dia a dia, e o jade fica só para o agora. Se preferir ver o concluído em jade, muda a regra da seção 2.4.
4. **Nomes dos módulos em português.** A proposta usa Entrada, Projetos, Estudos, Programação, Inglês, Leitura, Saúde, Espiritualidade, Finanças, Revisões e Insights, no lugar de Study Center, Dev Space, English Center etc. do brief. Confirma? Em especial "Entrada" (caixa das capturas) e "Saúde" (o brief chama a categoria de "Academia").
5. **Navegação inferior do celular.** Meu Dia · Agenda · Capturar · Tarefas · Mais. Trocaria Tarefas por Hábitos?
6. **Categorias personalizadas sem cor livre.** Escolhem um dos oito pigmentos e um ícone. Isso mantém a paleta controlada, mas limita a personalização (e muda o que o banco guarda).
7. **Finanças sem verde e vermelho.** Receitas em jade, despesas em neutro, sinal no texto; vermelho só para estouro de orçamento. Ou prefere a convenção verde/vermelho?
8. **Ícone e tom da Espiritualidade.** `book-heart` (neutro) ou `cross`? O módulo usa a serifada e menos elementos que os outros.
9. **Frase do dia.** Só frases geradas a partir dos seus dados, ou também um espaço opcional para o versículo ou a referência do dia no Meu Dia?
10. **Densidade.** Texto base de 14 px e itens de 32 px na sidebar (padrão de Linear e Things). Se preferir mais folgado, sobe-se um degrau em toda a escala.
11. **Horário da reflexão.** 20h como padrão, configurável. Algum outro gatilho (por exemplo, "depois do último compromisso")?
