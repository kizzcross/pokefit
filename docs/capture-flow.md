# Fluxo de captura

## Regra de ouro

**Treino finalizado = 1 encontro. Capturar ou fugir encerra esse encontro.**

Sem treino pendente → não há captura (banner no início / Mais se existir pendente).

---

## Fluxo (5 passos)

```
/workout/new → /workout/:id → finalizar
       ↓
   /encounter (Pokémon já sorteado no servidor)
       ↓
   /capture (capturar | fugir)
       ↓
   /capture/success → coleção / time
```

| Etapa | O que acontece |
|--------|----------------|
| **1. Treino** | Draft, ≥1 exercício, repetir último treino do grupo (opcional). |
| **2. Finalizar** | `POST …/finish/` → status `finished`, `encounter_status=pending`, espécie sorteada no `Workout`. |
| **3. Encontro** | Mostra o Pokémon do treino; “Tentar captura” → `/capture`. |
| **4. Captura** | `POST …/capture/` com `species_id` + `source_workout_id` **ou** `POST …/decline-encounter/` (fugir). |
| **5. Sucesso** | Pokémon na coleção (`source_workout`); encontro vira `captured` ou `fled`. |

---

## Sorteio (no finish)

- Peso por **raridade** da espécie (comum → lendário).
- Bônus com **esforço do treino** (`quality_score`, volume).
- Duplicata na coleção → peso menor.
- Novo finish → encontros `pending` antigos viram `fled`.

---

## APIs principais

- `POST /api/workouts/{id}/finish/`
- `GET /api/workouts/pending-encounter/`
- `POST /api/workouts/{id}/decline-encounter/`
- `POST /api/my-pokemon/capture/` (obrigatório `source_workout_id`)

`random-encounter` desativado — encontro só via treino.

---

## Erros comuns (UX)

| Caso | Resposta |
|------|----------|
| Sem Pokémon no catálogo | Aviso após finish (seed/import) |
| Já capturou neste treino | 400 na captura |
| Espécie ≠ encontro do treino | 400 |
| Fugiu | Pode treinar de novo; novo encontro no próximo finish |

---

## Uma linha

> Finalize o treino, enfrente o Pokémon sorteado, capture ou fuja — cada treino é uma chance única.
