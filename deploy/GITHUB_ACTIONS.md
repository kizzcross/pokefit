# GitHub Actions — CI + deploy automático

Push na branch **`main`** dispara:

1. **CI** — build frontend, testes, migrations check  
2. **Deploy** — SSH no Hetzner, `git pull` + `docker compose up -d --build`

## Secrets (Repository secrets)

**Settings → Secrets and variables → Actions → Repository secrets**

| Secret | Valor |
|--------|--------|
| `DEPLOY_HOST` | `178.105.169.230` |
| `DEPLOY_USER` | `root` |
| `DEPLOY_SSH_KEY` | chave **privada** SSH completa (ver abaixo) |
| `DEPLOY_SSH_PASSPHRASE` | senha da chave — **só** se a privada tiver passphrase (ver nota) |

Se o job usa **Environment `production`**, os mesmos nomes podem ficar em **Environment secrets** (ou só em Repository secrets).

### Chave com senha (passphrase)

Se aparecer `this private key is passphrase protected`:

- **Opção recomendada:** chave **sem senha** só para o Actions (não use sua `id_ed25519` pessoal):

  ```bash
  ssh-keygen -t ed25519 -C "github-actions-pokefit" -f ~/.ssh/pokefit_deploy -N ""
  cat ~/.ssh/pokefit_deploy.pub   # → authorized_keys no VPS
  cat ~/.ssh/pokefit_deploy        # → DEPLOY_SSH_KEY no GitHub
  ```

- **Ou** crie o secret `DEPLOY_SSH_PASSPHRASE` com a senha da chave que já está em `DEPLOY_SSH_KEY`.

---

## `DEPLOY_SSH_KEY` — o que colar

Tem que ser a chave **privada**, com cabeçalho e rodapé, por exemplo:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...
-----END OPENSSH PRIVATE KEY-----
```

**Não** cole o arquivo `.pub` (começa com `ssh-ed25519 AAAA...`).

### Opção A — reutilizar a chave que você já usa no VPS

No Mac, a chave com que você faz `ssh root@178.105.169.230`:

```bash
# costuma ser uma destas:
cat ~/.ssh/id_ed25519
# ou
cat ~/.ssh/id_rsa
```

Copie **tudo** (incluindo `BEGIN` / `END`) → GitHub → secret `DEPLOY_SSH_KEY`.

A chave **pública** correspondente já deve estar no servidor em `~/.ssh/authorized_keys`.

### Opção B — chave nova só para o Actions

No Mac:

```bash
ssh-keygen -t ed25519 -C "github-actions-pokefit" -f ~/.ssh/pokefit_deploy -N ""
```

**GitHub** — cole em `DEPLOY_SSH_KEY`:

```bash
cat ~/.ssh/pokefit_deploy
```

**VPS** — adicione a pública:

```bash
cat ~/.ssh/pokefit_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Teste no Mac antes de rodar o Actions:

```bash
ssh -i ~/.ssh/pokefit_deploy root@178.105.169.230 "echo ok"
```

---

## Erros comuns

| Log | Causa | Solução |
|-----|--------|---------|
| `ssh: no key found` | Secret vazio ou sem `BEGIN PRIVATE KEY` | Recriar `DEPLOY_SSH_KEY` com a chave **privada** inteira |
| `passphrase protected` | Chave pessoal com senha | Chave nova com `-N ""` ou secret `DEPLOY_SSH_PASSPHRASE` |
| `unable to authenticate` | Pública não está no VPS ou chave errada | `authorized_keys` no servidor; teste `ssh -i ...` no Mac |
| Secret no environment errado | Só criou em Environment mas nome diferente | Mesmos nomes: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` |

**Dica:** ao colar no GitHub, não adicione aspas nem espaços extras. Uma linha em branco no final é ok.

---

## Git no servidor

```bash
cd /opt/pokefit
git remote set-url origin git@github.com:kizzcross/pokefit.git
# deploy key do VPS em GitHub → Settings → Deploy keys
```

---

## Ver logs

GitHub → **Actions** → **main** → job **Deploy to Hetzner**.

No VPS:

```bash
cd /opt/pokefit/deploy
docker compose -f docker-compose.prod.yml logs --tail=80 web
```
