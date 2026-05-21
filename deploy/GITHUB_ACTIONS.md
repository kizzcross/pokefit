# GitHub Actions — CI + deploy automático

Push na branch **`main`** dispara:

1. **CI** — build frontend, testes, ruff, migrations check  
2. **Deploy** — SSH no Hetzner, `git pull` + `docker compose up -d --build`

## Secrets no GitHub

Repositório → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Exemplo | Obrigatório |
|--------|---------|-------------|
| `DEPLOY_HOST` | `178.105.169.230` | Sim |
| `DEPLOY_USER` | `root` (usuário SSH do VPS) | Sim |
| `DEPLOY_SSH_KEY` | chave privada SSH (conteúdo de `id_ed25519`) | Sim |

### Gerar chave só para deploy (no Mac)

```bash
ssh-keygen -t ed25519 -C "github-actions-pokefit" -f ~/.ssh/pokefit_deploy -N ""
cat ~/.ssh/pokefit_deploy.pub
```

No **VPS**, adicione a chave pública em `/root/.ssh/authorized_keys`.

No **GitHub**, cole o conteúdo de `~/.ssh/pokefit_deploy` (privada) em `DEPLOY_SSH_KEY`.

## Git no servidor

O deploy faz `git fetch` / `git reset --hard origin/main` em `/opt/pokefit`.

O VPS precisa conseguir puxar do GitHub. Uma opção:

```bash
# no VPS, uma vez
cd /opt/pokefit
git remote set-url origin git@github.com:kizzcross/pokefit.git
# deploy key do servidor em GitHub → repo → Settings → Deploy keys
```

Ou mantenha HTTPS com credencial configurada no servidor.

## Environment `production` (opcional)

Em **Settings → Environments → production** você pode exigir aprovação manual antes do deploy.

## Rodar só CI (sem deploy)

Abra um PR para `main` — o job `deploy` não roda em pull request.

## Ver logs

GitHub → **Actions** → workflow **main** → run da branch.

No servidor após deploy:

```bash
cd /opt/pokefit/deploy
docker compose -f docker-compose.prod.yml logs --tail=80 web
```
