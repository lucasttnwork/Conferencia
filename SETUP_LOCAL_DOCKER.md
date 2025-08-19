### Setup local: Docker + WSL2 para o projeto `conferencia`

Este documento consolida o que estamos fazendo para rodar o Postgres local via Docker e validar o schema do projeto. Use-o como checklist após reiniciar a máquina.

### Objetivo
- **Instalar e habilitar** WSL2 + Docker Desktop (engine baseado em WSL2)
- **Subir Postgres** com `docker compose` usando `docker-compose.yml`
- **Criar extensão** `pgcrypto` e **aplicar SQLs** do projeto para validar o banco localmente

### Estado atual (antes do reboot)
- WSL2/distro Ubuntu estavam com erro `0x80370114` (virtualização não habilitada).
- Docker Desktop exibiu: "Virtualization support not detected".
- Portanto, é necessário habilitar virtualização no BIOS/UEFI e recursos do Windows (WSL2/VM Platform/Hyper-V).

### Passos a executar (na ordem)

- **Passo A — Ativar virtualização no BIOS/UEFI**
  - Reinicie o PC e entre no Setup (teclas comuns: Del, F2, F10, F12 ou Esc)
  - Ative:
    - Intel: "Intel Virtualization Technology (VT‑x)" e "VT‑d"
    - AMD: "SVM Mode" e "AMD‑V"/"IOMMU"
  - Salve e reinicie o Windows

- **Passo B — Habilitar recursos do Windows (PowerShell como Administrador)**
```powershell
dism /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism /online /enable-feature /featurename:HypervisorPlatform /all /norestart
dism /online /enable-feature /featurename:Microsoft-Hyper-V-All /all /norestart  # ok falhar no Windows Home
bcdedit /set hypervisorlaunchtype auto
shutdown /r /t 0
```

- **Passo C — Atualizar/instalar WSL2 e Ubuntu (após reiniciar; PowerShell Admin)**
```powershell
wsl --update
wsl --set-default-version 2
wsl --install -d Ubuntu
```
  - Se o Ubuntu já existir e tiver falhado antes:
```powershell
wsl --unregister Ubuntu
wsl --install -d Ubuntu
```

- **Passo D — Instalar/abrir Docker Desktop**
```powershell
winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
```
  - Abra o Docker Desktop
  - Em Settings:
    - Marque "Use the WSL 2 based engine"
    - Em "Resources > WSL Integration", habilite para "Ubuntu"

- **Passo E — Validar Docker**
```powershell
docker --version
docker compose version
docker run --rm hello-world
```

- **Passo F — Subir Postgres do projeto** (no diretório `conferencia`)
```powershell
docker compose up -d db
docker inspect --format "{{.State.Health.Status}}" conferencia_db
```
  - Repita o `inspect` até retornar `healthy`

- **Passo G — Preparar banco (extensão + SQLs + validações)**
```powershell
docker exec -i conferencia_db psql -U postgres -d conferencia -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
type create_tables.sql | docker exec -i conferencia_db psql -U postgres -d conferencia
type dashboard_view.sql | docker exec -i conferencia_db psql -U postgres -d conferencia
type scripts\db-validate.sql | docker exec -i conferencia_db psql -U postgres -d conferencia
```

### Conexão ao Postgres local
- Host: `localhost`
- Porta: `5433` (conforme `docker-compose.yml`)
- Banco: `conferencia`
- Usuário: `postgres`
- Senha: `postgres`

### Observações e solução de problemas
- A extensão `pgcrypto` é necessária para `gen_random_uuid()` (aparece em `supabase_schema_redesign.sql`).
- Se o Docker/WSL reclamar de virtualização, volte ao Passo A e confirme que a virtualização está habilitada no BIOS/UEFI.
- No Windows Home, a habilitação de `Microsoft-Hyper-V-All` pode falhar; isso é esperado. O importante é usar WSL2 + HypervisorPlatform.

### Como retomar após o reboot
1. Siga os passos A–E até que `docker run --rm hello-world` funcione.
2. Volte a este diretório `conferencia` e execute os passos F–G para preparar e validar o banco.
3. Ao terminar, você pode pedir no chat: "Leia o arquivo `SETUP_LOCAL_DOCKER.md` e continue a partir do Passo F".

— Documento gerado para servir como guia rápido de retomada.


