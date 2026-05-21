#!/usr/bin/env bash
set -Eeuo pipefail

echo "-----> migrate"
python manage.py migrate --noinput

echo "-----> collectstatic"
python manage.py collectstatic --noinput 2>&1 | sed '/^Copying/d;/^$/d;/^ /d' || true

echo "-----> gunicorn"
exec gunicorn pokefit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout 120 \
  --log-file -
