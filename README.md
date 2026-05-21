# Pokefit

App de fitness gamificado no estilo Pokémon: registre treinos, finalize sessões, encontre e capture criaturas, monte seu time e acompanhe o progresso com amigos.

**Stack:** Django 5 + Django REST Framework · React 19 + TypeScript · Webpack · Tailwind CSS 4 · PostgreSQL (ou SQLite em dev)

---

## O que o app faz

| Área | Funcionalidades |
|------|-----------------|
| **Treinos** | Rascunho, exercícios, foto de prova, finalizar sessão |
| **Pokémon** | Encontro ao finalizar treino, captura, coleção, time ativo, IVs/EVs |
| **Progresso** | Calendário gamificado, meta semanal com recompensa lendária |
| **Social** | Amigos, timeline (você + amigos), perfil com sprite de treinador |
| **UI** | Mobile-first, visual pixel/retro (Silkscreen, Pixelify Sans) |

Fluxo principal:

```
Treino (draft) → exercícios → foto de prova → finalizar
                              ↓
        Calendário ← sessão registrada → encontro → captura
                              ↓
                    Timeline (sua + amigos)
```

---

## Requisitos

- Python **3.12**
- [Poetry](https://python-poetry.org/)
- Node **22** e [pnpm](https://pnpm.io/)
- (Opcional) PostgreSQL, Redis e Docker — ver seção Docker abaixo

---

## Setup rápido (local, sem Docker)

Na raiz do projeto:

```bash
make local_setup
```

Isso cria o venv, instala dependências, copia `local.py` e `.env` de exemplo, roda migrations e gera o client TypeScript da API.

Em **dois terminais**:

```bash
# Terminal 1 — Django em :8001
make local_backend

# Terminal 2 — Webpack dev server em :3000
make local_frontend
```

Abra **http://localhost:8001** (o React é servido via Django + `django-webpack-loader`, não direto na porta 3000).

### Dados iniciais (opcional)

```bash
cd backend

# Exercícios (~100+ no seed embutido)
../.venv/bin/poetry run python manage.py seed_exercises

# Espécies Pokémon (import PokéAPI)
../.venv/bin/poetry run python manage.py import_pokemon --limit 151
```

Crie um usuário pelo app (`/login`) ou pelo admin:

```bash
../.venv/bin/poetry run python manage.py createsuperuser
```

### API e client TypeScript

- Swagger: http://localhost:8001/api/schema/swagger-ui/
- Atualizar schema: `cd backend && ../.venv/bin/poetry run python manage.py spectacular --color --file schema.yml`
- Regenerar client: `pnpm run openapi-ts`

### Testes

```bash
make test
# ou módulo específico:
make test backend.workouts
```

---

## Desenvolvimento com ngrok (celular na rede)

O frontend em dev usa paths relativos (`/frontend/webpack_bundles/`). O Django faz **proxy** desses assets para o webpack em `127.0.0.1:3000` — assim HTTPS no ngrok não sofre mixed content.

1. Aponte o túnel ngrok para a porta do Django (**8001**).
2. Em `backend/pokefit/settings/local.py` (não versionado), configure `NGROK_HOST` com o host do túnel.
3. Mantenha `pnpm run dev` e `make local_backend` rodando.

---

## Estrutura do projeto

```
pokefit/
├── backend/
│   ├── pokefit/          # settings, urls, celery
│   ├── users/            # auth, trainer sprites
│   ├── workouts/         # treinos, exercícios, timeline
│   ├── pokemon/          # espécies, captura, coleção
│   ├── profiles/         # perfil, meta semanal
│   └── social/           # amizades
├── frontend/js/          # React SPA (pages, components, api client)
├── docs/                 # notas de produto/arquitetura
├── webpack.config.js
└── Makefile              # local_setup, local_backend, local_frontend, docker_*
```

---

## Docker

```bash
make docker_setup
make docker_migrate
make docker_up
```

App em http://localhost:8000. Logs: `make docker_logs backend`.

---

## Deploy

Há suporte a [Render.com](https://render.com) via `render.yaml` e `render_build.sh` (herdado do boilerplate). Ajuste `ALLOWED_HOSTS`, `SECRET_KEY` e variáveis de ambiente conforme o ambiente.

---

## Créditos

Projeto iniciado a partir do [django-react-boilerplate](https://github.com/vintasoftware/django-react-boilerplate) da [Vinta Software](https://www.vinta.com.br/).

Sprites de treinador via [Pokémon Showdown](https://play.pokemonshowdown.com/). Dados de espécies via [PokéAPI](https://pokeapi.co/).

---

## Licença

MIT — ver [LICENSE.txt](LICENSE.txt).
