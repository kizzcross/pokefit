# Prova de treino + amigos + timeline + calendário

Proposta de como encaixar **foto de conclusão**, **sistema de amizade**, **timeline do amigo** e **calendário gamificado de treinos** no Pokefit, em cima do fluxo atual (treino → finish → encontro → captura).

---

## Visão geral

```
Treino (draft) → exercícios → foto de prova → finalizar
                                    ↓
         Calendário (mapa do mês) ← treino registrado
                                    ↓
              Timeline (sua + amigos) → encontro Pokémon
```

| Pilar | Objetivo |
|--------|----------|
| **Foto de prova** | Confiança social: “eu realmente treinei” |
| **Amizade** | Ver progresso de quem você segue |
| **Timeline** | Feed cronológico de treinos (e capturas) |
| **Calendário** | Visão mensal **estilo jogo** — streak, dias “conquistados”, histórico visual |

---

## 1. Foto de prova no final do treino

### Momento no fluxo

Inserir **antes** de `POST …/finish/` (ou como parte do finish em multipart):

1. Usuário adiciona exercícios (como hoje).
2. Tela **“Provar treino”**: abre câmera ou galeria (mobile-first).
3. Preview + opcional legenda curta (“perna morta hoje”).
4. **Finalizar** só habilita com foto anexada (configurável depois).

Depois do finish → encontro Pokémon (inalterado).

### Modelo (sugestão)

Estender `Workout` (já existe `validation_type`):

| Campo | Tipo | Notas |
|--------|------|--------|
| `proof_photo` | `ImageField` | Obrigatório no MVP se `validation_type=photo` |
| `proof_caption` | `CharField(140)` | Opcional |
| `proof_uploaded_at` | `DateTimeField` | Auto |
| `validation_type` | choice | Novo valor: `photo` (além de `manual`, etc.) |

Regras:

- Só aceitar upload em treino `draft` do próprio usuário.
- Ao finalizar: exigir `proof_photo` se política ativa.
- Foto **privada por padrão**; visível na timeline só para **amigos** (ver §3).

### API (rascunho)

- `POST /api/workouts/{id}/proof/` — multipart (`photo`, `caption?`)
- `POST /api/workouts/{id}/finish/` — valida foto + gera encontro (como hoje)

### UX (pixel / mobile)

- Botão grande “Tirar foto” + miniatura após captura.
- Aviso: “Amigos podem ver esta foto na timeline”.
- Compressão no client (ex. max 1280px, JPEG 0.8) antes do upload.

### Privacidade e moderação (MVP+)

- Denunciar foto em treino de amigo.
- Staff: ocultar foto (`proof_photo` null + flag) sem apagar treino.
- Futuro: blur automático de rosto (opcional).

---

## 2. Sistema de amizade

### Conceito

Relação **direcional com confirmação** (estilo solicitação aceita), não “seguir” público no MVP.

```
A envia pedido → B aceita → amizade ativa
A bloqueia B → não aparecem timelines / pedidos
```

### Modelo (sugestão)

`Friendship` (ou `UserConnection`):

| Campo | Valores |
|--------|---------|
| `from_user` | FK User |
| `to_user` | FK User |
| `status` | `pending` \| `accepted` \| `declined` \| `blocked` |
| `created` / `modified` | timestamps |

Constraint: único par `(from_user, to_user)`; busca de amizade aceita em ambos os sentidos.

### API (rascunho)

| Método | Endpoint | Ação |
|--------|----------|------|
| `GET` | `/api/friends/` | Lista amigos aceitos |
| `GET` | `/api/friends/requests/` | Pendentes recebidos / enviados |
| `POST` | `/api/friends/requests/` | `{ "username" ou "user_id" }` |
| `POST` | `/api/friends/requests/{id}/accept/` | |
| `POST` | `/api/friends/requests/{id}/decline/` | |
| `DELETE` | `/api/friends/{user_id}/` | Remover amizade |
| `POST` | `/api/friends/{user_id}/block/` | |

### Telas

- **Amigos** (`/friends`): lista + busca por username/email.
- **Pedidos**: badge no “Mais” ou aba dedicada.
- Perfil mínimo: avatar, nome, streak, último treino.

### Limites MVP

- Máx. 50 amigos (evitar spam).
- Não listar usuários que bloquearam você.

---

## 3. Timeline do amigo

### O que aparece no feed

Cada **evento** na timeline (ordenado por data, paginado):

| Tipo | Origem | Conteúdo no card |
|------|--------|------------------|
| `workout_finished` | `Workout` finished | Tipo de treino, volume, esforço, **foto de prova** (thumb), horário |
| `pokemon_captured` | `UserPokemon` + `source_workout` | Sprite, nome, shiny, treino ligado |
| (futuro) `mission_done` | missões | — |

Só treinos `finished` entram. Rascunhos e cancelados: fora.

### Quem vê o quê

| Viewer | Vê |
|--------|-----|
| Você | Sua timeline completa (`/timeline` ou dashboard) |
| Amigo aceito | Timeline dele em `/friends/:id/timeline` |
| Não-amigo | 403 ou perfil público vazio (MVP: 403) |

Foto de prova: **somente amigos** (e você). Nunca no ranking global sem opt-in.

### API (rascunho)

- `GET /api/timeline/` — seu feed (agregado: seus treinos + opcional amigos recentes).
- `GET /api/users/{id}/timeline/?cursor=` — feed de um amigo (checa amizade `accepted`).
- Resposta por item:

```json
{
  "type": "workout_finished",
  "at": "2026-05-20T18:30:00Z",
  "actor": { "id": 1, "display_name": "Kizz" },
  "workout": {
    "id": 42,
    "workout_type": "chest_triceps",
    "total_volume": "1250.00",
    "perceived_effort": 8,
    "proof_photo_url": "https://...",
    "proof_caption": "fechou o peito"
  },
  "encounter": { "species_name": "Pikachu", "status": "captured" }
}
```

### UX

- **Minha timeline**: cards empilhados estilo pixel, pull-to-refresh.
- **Timeline do amigo**: header com nome + “último treino há X dias”; mesmos cards, sem botão de editar.
- Toque no card de treino → detalhe read-only (exercícios + foto grande).
- Toque em captura → sprite / ficha (read-only).

### Performance

- Paginação cursor-based (`?cursor=`).
- Thumbnail da foto (versão reduzida no storage ou `ImageField` + resize no save).

---

## 4. Calendário gamificado de treinos

> **Não é Google Calendar.** É um **mapa de progresso** estilo RPG / Pokédex de dias — pixel, cores do tema, recompensas visuais.

### Conceito (“Jornada de treino”)

O calendário responde: *“Em quais dias eu treinei? Qual minha sequência? O que rolou naquele dia?”*

Cada dia do mês é um **tile** (quadrado pixelado), não uma célula de agenda corporativa.

### Estados visuais do dia (tile)

| Estado | Visual (pixel) | Condição |
|--------|----------------|----------|
| **Vazio** | Tile escuro, borda tracejada | Sem treino `finished` no dia |
| **Conquistado** | Tile dourado + ícone `workout` | ≥1 treino `finished` |
| **Conquistado + captura** | Tile dourado + mini sprite do Pokémon | Treino finished + `encounter_status=captured` |
| **Shiny day** | Borda brilhante + ícone `shiny` | Captura shiny naquele dia |
| **Hoje** | Pulso / borda `accent` animada | Data atual |
| **Streak ativo** | Corrente de tiles ligados (linha pixel entre dias seguidos) | Dias consecutivos com treino |
| **Rascunho** | Ícone pequeno “!” cinza | Só `draft` no dia (não conta streak) |

Cores: `--color-game-accent` (ouro), `--color-game-success`, `--color-game-danger` (quebrou streak), fundo `--color-game-panel`.

### Tela principal (`/calendar` ou aba no Início)

```
┌─────────────────────────────────────┐
│  ◀  MAIO 2026  ▶     🔥 streak: 5  │
├─────────────────────────────────────┤
│  D  S  T  Q  Q  S  S                │
│ [ ][█][█][ ][█][█][ ]  ← grid 7x5   │
│ ...                                 │
├─────────────────────────────────────┤
│  Dia 20 — PEITO + TRÍCEPS           │
│  [foto thumb]  vol 1250  ★★★★☆      │
│  Capturou: [sprite Pikachu]         │
└─────────────────────────────────────┘
```

**Header gamificado**

- Título em `font-display`: “JORNADA” ou “MAPA DE TREINOS”.
- Contador **streak** com ícone fogo (`GameIcon`) + número grande.
- Badge de meta do mês: “12/20 dias” com barra pixel (`StatBar`).

**Grid do mês**

- 7 colunas (Dom–Sáb ou Seg–Dom — definir e fixar).
- Cada célula: `min-h-10`, borda 4px, sombra pixel (`pixel-panel`).
- Tap no dia → painel inferior (drawer) ou navega para `/calendar/2026-05-20`.

**Painel do dia selecionado**

- Lista de treinos daquele dia (cards compactos).
- Thumb da **foto de prova** (se houver).
- Chip do `workout_type` (label PT: Peito + Tríceps).
- Mini sprite se capturou.
- CTA: “Ver treino” → detalhe read-only.

### Gamificação extra (MVP → v2)

| Mecânica | Visual | Regra simples |
|----------|--------|----------------|
| **Streak** | Contador 🔥 no header | Dias **consecutivos** com ≥1 treino `finished` |
| **Selo do mês** | Medalha pixel ao completar 15 dias | Desbloqueia badge no perfil |
| **Tipo do dia** | Cor de borda por `workout_type` | Ex.: pernas = verde, peito = vermelho |
| **Boss day** | Tile maior no último dia do mês | Se treinou ≥20 dias no mês |
| **Comparar amigo** | Overlay fantasma no calendário do amigo | Só amigos: dias que **os dois** treinaram ficam com estrela |

Som e animação (leve): tile “conquista” faz **bounce** + flash dourado no dia do finish (client-side, opcional).

### Dados e API

Não precisa de model novo no MVP — agregar `Workout` + capturas:

- `GET /api/workouts/calendar/?year=2026&month=5`
- Resposta:

```json
{
  "year": 2026,
  "month": 5,
  "streak_current": 5,
  "streak_best": 12,
  "days_trained": 14,
  "days": [
    {
      "date": "2026-05-20",
      "workout_count": 1,
      "has_capture": true,
      "has_shiny": false,
      "workouts": [
        {
          "id": 42,
          "workout_type": "chest_triceps",
          "total_volume": "1250.00",
          "proof_photo_url": "...",
          "encounter_species_sprite": "...",
          "encounter_status": "captured"
        }
      ]
    }
  ]
}
```

- `GET /api/users/{id}/calendar/?year=&month=` — mesmo formato, só se amigo (calendário **read-only**, sem fotos se privacidade restrita).

Cálculo de streak no **backend** (fonte da verdade), não só no front.

### Onde entra no app

| Lugar | Ação |
|-------|------|
| **Bottom nav** | Trocar “Missões” por “Jornada” **ou** item no “Mais” → Calendário |
| **Dashboard** | Mini-calendário da semana (7 tiles) + link “Ver mês” |
| **Pós-finish** | Toast: “Dia conquistado!” + highlight no tile de hoje |
| **Perfil amigo** | Aba “Calendário” ao lado da timeline |

### Princípios visuais (obrigatório)

- Fontes: `Silkscreen` / `Pixelify Sans` — títulos em caixa alta.
- Zero visual de app de produtividade (sem linhas finas, sem azul Material).
- Ícones só via `GameIcon` (SVG pixel).
- Sprites de Pokémon nos dias com captura — reforço da fantasia.
- Feedback claro: dia vazio = “miss”; dia cheio = “win”.

---

## Fluxo integrado (feliz)

```
1. A finaliza treino com foto
2. Calendário marca o tile de hoje (conquistado + animação)
3. Streak atualiza no header do calendário e no dashboard
4. Item entra na timeline de A
5. B (amigo) vê timeline e, na aba calendário, o mês de A em modo read-only
6. A captura Pokémon → tile ganha sprite; timeline ganha evento de captura
```

---

## Ordem de implementação sugerida

| Fase | Entrega |
|------|---------|
| **1** | `proof_photo` + upload + finish obrigatório |
| **2** | **Calendário próprio** (`/calendar`, API mensal, streak, tiles pixel) |
| **3** | Sua timeline |
| **4** | Friendship CRUD + tela amigos / pedidos |
| **5** | Timeline + calendário do amigo |
| **6** | Notificações, reações, selos do mês |

---

## O que já existe no projeto

| Já tem | Aproveitar |
|--------|------------|
| `Workout.validation_type` | Adicionar `photo` |
| `Workout.started_at` / `ended_at` | Agrupar dias no calendário |
| `encounter_status` + `encounter_species` | Tile com sprite |
| Finish + encontro + captura | Animação pós-finish no tile de hoje |
| `GameIcon`, `PixelCard`, `StatBar`, tema CSS | UI gamificada do calendário |
| `workoutsList` | Base para filtro por mês |

| Implementado | Onde |
|--------------|------|
| `proof_photo` + `POST …/proof/` + finish exige foto | `workouts` migration 0005 |
| App `social` + `Friendship` | `/api/friends/…` |
| Timeline | `GET /api/timeline/`, `GET /api/users/{id}/timeline/` |
| Calendário gamificado | `GET /api/workouts/calendar/`, `GET /api/users/{id}/calendar/` |
| Front | `/calendar`, `/timeline`, `/friends`, foto no treino draft |

---

## Decisões em aberto

1. Foto **obrigatória** sempre ou só em “modo social” nas configurações?
2. Timeline mostra **só foto** ou também treino sem foto (legado)?
3. Pedido de amizade por **email**, **username** ou código de convite?
4. Captura aparece **no mesmo card** do treino ou evento separado?
5. Calendário na **bottom nav** ou só via dashboard / Mais?
6. Semana começa **domingo** ou **segunda** (BR)?
7. Amigo vê **foto de prova** no calendário ou só ícone de “treinou”?

---

## Uma linha

> **Cada dia treinado é um tile conquistado no mapa — foto prova, amigos veem na timeline, e o Pokémon marca o dia com sprite no calendário.**
