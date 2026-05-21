SHELL := /bin/bash # Use bash syntax
ARG := $(word 2, $(MAKECMDGOALS) )

clean:
	@find . -name "*.pyc" -exec rm -rf {} \;
	@find . -name "__pycache__" -delete

test:
	poetry run backend/manage.py test backend/ $(ARG) --parallel --keepdb

test_reset:
	poetry run backend/manage.py test backend/ $(ARG) --parallel

backend_format:
	black backend

# Local development (without Docker)
local_setup:
	python3.12 -m venv .venv
	.venv/bin/pip install -q poetry
	.venv/bin/poetry install
	cp -n backend/pokefit/settings/local.py.example backend/pokefit/settings/local.py 2>/dev/null || true
	cp -n backend/.env.example backend/.env 2>/dev/null || true
	cd backend && ../.venv/bin/poetry run python manage.py migrate
	cd backend && ../.venv/bin/poetry run python manage.py spectacular --color --file schema.yml
	pnpm install
	pnpm run openapi-ts

local_kill_ports:
	@for port in 3000 8001; do \
		if lsof -ti :$$port >/dev/null 2>&1; then \
			echo "Liberando porta $$port..."; \
			lsof -ti :$$port | xargs kill -9 2>/dev/null || true; \
			sleep 1; \
		fi; \
	done

local_migrate:
	cd backend && ../.venv/bin/poetry run python manage.py migrate --noinput

local_api_types:
	cd backend && ../.venv/bin/poetry run python manage.py spectacular --color --file schema.yml
	pnpm run openapi-ts

local_backend: local_kill_port_8001
	cd backend && ../.venv/bin/poetry run python manage.py runserver 8001

local_kill_port_3000:
	@if lsof -ti :3000 >/dev/null 2>&1; then \
		echo "Liberando porta 3000 (webpack anterior)..."; \
		lsof -ti :3000 | xargs kill -9 2>/dev/null || true; \
		sleep 1; \
	fi

local_kill_port_8001:
	@if lsof -ti :8001 >/dev/null 2>&1; then \
		echo "Liberando porta 8001 (Django anterior)..."; \
		lsof -ti :8001 | xargs kill -9 2>/dev/null || true; \
		sleep 1; \
	fi

local_frontend: local_kill_port_3000
	pnpm run dev

# Commands for Docker version
docker_setup:
	docker volume create pokefit_dbdata
	docker compose build --no-cache backend frontend
	docker compose run --rm backend python manage.py spectacular --color --file schema.yml
	docker compose run --rm frontend pnpm run openapi-ts

docker_test:
	docker compose run --rm backend python manage.py test $(ARG) --parallel --keepdb

docker_test_reset:
	docker compose run --rm backend python manage.py test $(ARG) --parallel

docker_up:
	docker compose up -d

docker_update_dependencies:
	docker compose down
	docker compose up -d --build

docker_down:
	docker compose down

docker_logs:
	docker compose logs -f $(ARG)

docker_makemigrations:
	docker compose run --rm backend python manage.py makemigrations

docker_migrate:
	docker compose run --rm backend python manage.py migrate

docker_backend_shell:
	docker compose run --rm backend bash

docker_backend_update_schema:
	docker compose run --rm backend python manage.py spectacular --color --file schema.yml

docker_frontend_shell:
	docker compose run --rm frontend sh

docker_frontend_update_api:
	docker compose run --rm frontend pnpm run openapi-ts
