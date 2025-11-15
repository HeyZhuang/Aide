# 本地 Supabase 設置指南

Supabase 可以在本地運行，有兩種主要方式：

## 方案 1: 使用 Supabase CLI（推薦）

Supabase CLI 可以在本地運行完整的 Supabase 實例，包括 PostgreSQL、Auth、Storage 等所有服務。

### 安裝 Supabase CLI

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
# 使用 npm
npm install -g supabase

# 或使用 Homebrew
brew install supabase/tap/supabase
```

**Windows:**
```bash
# 使用 Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 或使用 npm
npm install -g supabase
```

### 初始化 Supabase 項目

```bash
# 在項目根目錄執行
cd /home/ubuntu/ckz/psd-canvas-jaaz
supabase init
```

這會創建 `supabase/` 目錄，包含配置文件和遷移腳本。

### 啟動本地 Supabase

```bash
# 啟動所有服務（需要 Docker）
supabase start
```

這會啟動：
- PostgreSQL 資料庫（端口 54322）
- Supabase Studio（端口 54323）
- Auth 服務
- Storage 服務
- 等等

### 獲取連接字符串

啟動後，CLI 會顯示連接信息：

```bash
# 查看連接信息
supabase status
```

輸出示例：
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

### 配置應用程序

在 `config.env` 中設置：

```env
# 本地 Supabase 配置
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# 本地 PostgreSQL 連接字符串
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
# 或
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 執行資料庫遷移

```bash
# 將 schema.sql 應用到本地資料庫
supabase db reset

# 或手動執行
psql postgresql://postgres:postgres@localhost:54322/postgres < server/supabase_schema.sql
```

### 停止本地 Supabase

```bash
supabase stop
```

---

## 方案 2: 直接使用本地 PostgreSQL

如果您已經有本地 PostgreSQL 安裝，可以直接使用，無需 Supabase CLI。

### 安裝 PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
下載並安裝：https://www.postgresql.org/download/windows/

### 創建資料庫

```bash
# 登錄 PostgreSQL
sudo -u postgres psql

# 創建資料庫和用戶
CREATE DATABASE psd_canvas;
CREATE USER psd_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE psd_canvas TO psd_user;
\q
```

### 執行 Schema

```bash
# 執行建表語句
psql -U psd_user -d psd_canvas -f server/supabase_schema.sql

# 或使用 postgres 用戶
sudo -u postgres psql -d psd_canvas -f server/supabase_schema.sql
```

### 配置應用程序

在 `config.env` 中設置：

```env
# 本地 PostgreSQL 配置
SUPABASE_DB_URL=postgresql://psd_user:your_password@localhost:5432/psd_canvas
# 或
DATABASE_URL=postgresql://psd_user:your_password@localhost:5432/psd_canvas
```

---

## 方案 3: 使用 Docker Compose（最簡單）

創建一個 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  postgres:
    image: supabase/postgres:latest
    ports:
      - "54322:5432"
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

啟動：

```bash
docker-compose up -d
```

連接字符串：
```
postgresql://postgres:postgres@localhost:54322/postgres
```

---

## 推薦方案對比

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|----------|
| **Supabase CLI** | 完整功能、與生產環境一致、包含 Studio | 需要 Docker、資源占用較大 | 需要完整 Supabase 功能 |
| **本地 PostgreSQL** | 輕量、快速、無需 Docker | 缺少 Supabase 特定功能 | 只需要資料庫功能 |
| **Docker Compose** | 簡單、快速啟動 | 功能有限 | 快速測試 |

---

## 開發工作流建議

### 本地開發
- 使用 **Supabase CLI** 或 **本地 PostgreSQL**
- 連接字符串指向 `localhost`

### 測試環境
- 使用 **Supabase 雲端項目**（免費層）
- 連接字符串指向 Supabase 雲端

### 生產環境
- 使用 **Supabase 雲端項目**（付費層）
- 連接字符串指向 Supabase 雲端

---

## 快速開始（推薦使用 Supabase CLI）

```bash
# 1. 安裝 Supabase CLI
npm install -g supabase

# 2. 初始化項目
cd /home/ubuntu/ckz/psd-canvas-jaaz
supabase init

# 3. 啟動本地 Supabase
supabase start

# 4. 查看連接信息
supabase status

# 5. 執行資料庫遷移
supabase db reset
# 或
psql postgresql://postgres:postgres@localhost:54322/postgres < server/supabase_schema.sql

# 6. 配置 config.env
# 添加 SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres

# 7. 啟動應用
cd server
python main.py
```

---

## 訪問 Supabase Studio

如果使用 Supabase CLI，可以訪問本地 Studio：

```
http://localhost:54323
```

這是一個圖形化界面，可以：
- 查看和編輯資料庫表
- 執行 SQL 查詢
- 管理數據
- 查看 API 文檔

---

## 故障排除

### Docker 未運行
如果使用 Supabase CLI，確保 Docker 正在運行：
```bash
# 檢查 Docker
docker ps

# 啟動 Docker（如果未運行）
sudo systemctl start docker  # Linux
# 或啟動 Docker Desktop（macOS/Windows）
```

### 端口被占用
如果端口 54322 被占用，可以修改 Supabase 配置：
```bash
# 編輯 supabase/config.toml
# 修改 [db] 部分的 port
```

### 連接失敗
檢查：
1. PostgreSQL 服務是否運行
2. 連接字符串是否正確
3. 防火牆設置
4. 用戶權限

---

## 參考資料

- Supabase CLI 文檔: https://supabase.com/docs/guides/cli
- 本地開發指南: https://supabase.com/docs/guides/cli/local-development
- PostgreSQL 文檔: https://www.postgresql.org/docs/





