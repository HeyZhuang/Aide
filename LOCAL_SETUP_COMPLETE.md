# ✅ 本地 Supabase 設置完成

## 已完成的工作

### 1. 本地 PostgreSQL 資料庫設置
- ✅ 創建資料庫：`psd_canvas`
- ✅ 創建用戶：`psd_user`
- ✅ 執行本地適配的 schema：`supabase_schema_local.sql`
- ✅ 所有表已創建（11個表）

### 2. 配置文件更新
- ✅ 更新 `config.env` 使用本地連接
- ✅ 連接字符串：`postgresql://psd_user:psd_canvas_local_2024@localhost:5432/psd_canvas`

### 3. 資料庫表結構
已創建以下表：
- `users` - 用戶表
- `auth_tokens` - 認證令牌表
- `device_codes` - 設備碼表
- `canvases` - 畫布表
- `chat_sessions` - 聊天會話表
- `chat_messages` - 聊天消息表
- `organizations` - 組織表
- `organization_members` - 組織成員表
- `organization_join_requests` - 組織加入申請表
- `comfy_workflows` - ComfyUI 工作流表
- `db_version` - 資料庫版本表

## 當前配置

### config.env 設置
```env
# 本地 Supabase/PostgreSQL 連接配置
SUPABASE_URL=http://localhost:54321
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 本地 PostgreSQL 連接字符串（數據存儲在本地服務器）
SUPABASE_DB_URL=postgresql://psd_user:psd_canvas_local_2024@localhost:5432/psd_canvas
```

## 下一步操作

### 1. 安裝 Python 依賴
```bash
cd server
pip install -r requirements.txt
```

### 2. 測試資料庫連接
```bash
cd server
python3 -c "
import asyncio
import os
from dotenv import load_dotenv
load_dotenv('../config.env')
import asyncpg

async def test():
    conn = await asyncpg.connect(os.getenv('SUPABASE_DB_URL'))
    result = await conn.fetchval('SELECT COUNT(*) FROM users')
    print(f'✅ 連接成功！用戶表記錄數: {result}')
    await conn.close()

asyncio.run(test())
"
```

### 3. 啟動應用
```bash
cd server
python main.py
```

## 資料庫管理

### 連接資料庫
```bash
# 使用 psd_user
PGPASSWORD=psd_canvas_local_2024 psql -h localhost -U psd_user -d psd_canvas

# 或使用 postgres 用戶
sudo -u postgres psql -d psd_canvas
```

### 查看表
```sql
\dt
```

### 查看數據
```sql
SELECT * FROM users;
SELECT * FROM canvases;
```

### 備份資料庫
```bash
sudo -u postgres pg_dump psd_canvas > backup_$(date +%Y%m%d).sql
```

### 恢復資料庫
```bash
sudo -u postgres psql -d psd_canvas < backup_20241114.sql
```

## 重要說明

### 數據存儲位置
- **資料庫文件位置**：`/var/lib/postgresql/16/main/`（PostgreSQL 默認位置）
- **所有數據都存儲在本地服務器**
- **不會連接到任何雲端服務**

### 與 Supabase 雲端的區別
1. **RLS 策略**：本地版本不使用 Row Level Security（因為沒有 Supabase auth schema）
2. **認證**：使用應用層認證，不依賴 Supabase Auth
3. **存儲**：數據完全存儲在本地 PostgreSQL

### 遷移到 Supabase 雲端
如果需要遷移到 Supabase 雲端：
1. 在 Supabase Dashboard 創建項目
2. 執行 `supabase_schema.sql`（包含 RLS 策略）
3. 使用遷移腳本：`python server/scripts/migrate_to_supabase.py`
4. 更新 `config.env` 中的連接字符串

## 故障排除

### 連接失敗
```bash
# 檢查 PostgreSQL 服務狀態
sudo systemctl status postgresql

# 檢查端口
sudo netstat -tlnp | grep 5432

# 測試連接
PGPASSWORD=psd_canvas_local_2024 psql -h localhost -U psd_user -d psd_canvas -c "SELECT 1;"
```

### 權限問題
```bash
# 重新授予權限
sudo -u postgres psql -d psd_canvas -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO psd_user;"
```

### 表不存在
```bash
# 重新執行 schema
cat server/supabase_schema_local.sql | sudo -u postgres psql -d psd_canvas
```

## 驗證設置

運行以下命令驗證設置：

```bash
# 1. 檢查資料庫連接
PGPASSWORD=psd_canvas_local_2024 psql -h localhost -U psd_user -d psd_canvas -c "\dt"

# 2. 檢查環境變數
cd /home/ubuntu/ckz/psd-canvas-jaaz
python3 -c "from dotenv import load_dotenv; import os; load_dotenv('config.env'); print('SUPABASE_DB_URL:', os.getenv('SUPABASE_DB_URL'))"

# 3. 測試 Python 連接（需要先安裝依賴）
cd server
pip install asyncpg python-dotenv
python3 -c "
import asyncio, os
from dotenv import load_dotenv
load_dotenv('../config.env')
import asyncpg

async def test():
    conn = await asyncpg.connect(os.getenv('SUPABASE_DB_URL'))
    print('✅ 連接成功！')
    await conn.close()

asyncio.run(test())
"
```

## 完成！

您的本地 Supabase/PostgreSQL 設置已完成，所有數據將存儲在本地服務器上。





