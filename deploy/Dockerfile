# Production image: build React/webpack assets + run Django with Gunicorn.

FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10 --activate \
    && pnpm install --frozen-lockfile=false

COPY frontend ./frontend
COPY webpack.config.js tsconfig.json postcss.config.mjs ./

RUN pnpm run build


FROM python:3.12-slim AS runtime

ENV PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off \
    POETRY_VERSION=2.0.1 \
    DJANGO_SETTINGS_MODULE=pokefit.settings.production

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install "poetry==$POETRY_VERSION"

WORKDIR /home/user/app

COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false \
    && poetry install --without dev --no-root --no-interaction --no-ansi

COPY backend ./backend
COPY --from=frontend-build /app/frontend/webpack_bundles ./frontend/webpack_bundles

COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /home/user/app/backend

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
