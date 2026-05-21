# Deploy no Hetzner — Pokefit

| Item | Valor |
|------|--------|
| **IP público** | `178.105.169.230` |
| **Domínio** | `pokefit.kizzcross.com.br` |
| **URL** | https://pokefit.kizzcross.com.br |

---

## 1. DNS

No painel do domínio `kizzcross.com.br`, crie um registro **A**:

| Nome | Tipo | Valor |
|------|------|--------|
| `pokefit` | A | `178.105.169.230` |

Aguarde propagar (minutos a algumas horas). Teste:

```bash
dig +short pokefit.kizzcross.com.br
# deve retornar 178.105.169.230
```

---

## 2. Preparar o VPS (Ubuntu 22/24)

SSH no servidor:

```bash
ssh root@178.105.169.230
```

Pacotes básicos:

```bash
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx ufw docker.io docker-compose-v2

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

Pastas para arquivos estáticos e mídia:

```bash
mkdir -p /var/www/pokefit/media /var/www/pokefit/static
chown -R 1000:1000 /var/www/pokefit   # usuário do container, se necessário ajuste após primeiro deploy
```

---

## 3. Clonar o projeto

```bash
cd /opt
git clone git@github.com:kizzcross/pokefit.git
cd pokefit/deploy
```

---

## 4. Configurar variáveis

```bash
cp .env.production.example .env
nano .env
```

Preencha obrigatoriamente:

- `SECRET_KEY` — gere com:
  ```bash
  python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```
- `POSTGRES_PASSWORD` — senha forte do Postgres
- `DATABASE_URL` — use a **mesma** senha:  
  `postgres://pokefit:SUA_SENHA@db:5432/pokefit`
- `SENDGRID_PASSWORD` — API key do SendGrid (ou desative e-mails de erro depois)

`ALLOWED_HOSTS` já vem com `pokefit.kizzcross.com.br,178.105.169.230`.

---

## 5. Subir a aplicação (Docker)

```bash
cd /opt/pokefit/deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web
```

A API fica em `127.0.0.1:8001` no host (só Nginx expõe na internet).

### Dados iniciais (primeira vez)

```bash
docker compose -f docker-compose.prod.yml exec web python manage.py seed_exercises
docker compose -f docker-compose.prod.yml exec web python manage.py import_pokemon --limit 151
docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

---

## 6. Nginx + HTTPS

```bash
cp /opt/pokefit/deploy/nginx/pokefit.conf /etc/nginx/sites-available/pokefit
ln -sf /etc/nginx/sites-available/pokefit /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # se não usar o site padrão
nginx -t && systemctl reload nginx
```

Certificado Let's Encrypt:

```bash
certbot --nginx -d pokefit.kizzcross.com.br
```

O Certbot ajusta o bloco `listen 443 ssl` automaticamente.

Teste: https://pokefit.kizzcross.com.br

---

## 7. Atualizar deploy (novas versões)

```bash
cd /opt/pokefit
git pull
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. Checklist rápido

- [ ] DNS `pokefit` → `178.105.169.230`
- [ ] `deploy/.env` com `SECRET_KEY`, DB e SendGrid
- [ ] `docker compose ... up -d --build` OK
- [ ] Nginx + Certbot
- [ ] `seed_exercises` + `import_pokemon` + superuser
- [ ] Login e upload de foto de treino funcionando
- [ ] Backup de `/var/www/pokefit/media` agendado

---

## 9. Celery (opcional)

O app funciona sem worker para o fluxo principal. Se precisar de filas depois, adicione serviços `celery` e `beat` no compose (como no `docker-compose.yml` de dev) apontando para `redis`.

---

## 10. Problemas comuns

| Sintoma | O que verificar |
|---------|------------------|
| 502 Bad Gateway | `docker compose logs web` — container subiu? |
| DisallowedHost | `ALLOWED_HOSTS` no `.env` |
| CSS/JS quebrado | `collectstatic` nos logs; pasta `/var/www/pokefit/static` |
| Fotos não aparecem | permissões em `/var/www/pokefit/media` |
| Redirect loop HTTPS | Nginx envia `X-Forwarded-Proto`; Certbot ativo |
| 500 `webpack-stats.json` | Rebuild da imagem `web` (arquivo entra no Docker na build) |
