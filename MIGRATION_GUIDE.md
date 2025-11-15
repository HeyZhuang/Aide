# SQLite 到 Supabase 遷移指南

本指南將幫助您將項目從 SQLite 遷移到 Supabase PostgreSQL。

## 前置要求

1. **Supabase 項目**
   - 創建 Supabase 項目：https://supabase.com
   - 獲取數據庫連接字符串

2. **環境變數配置**
   - 在 `config.env` 中添加 Supabase 配置

## 步驟 1: 選擇 Supabase 部署方式

您有兩種選擇：

### 選項 A: 使用 Supabase 雲端（生產環境推薦）
### 選項 B: 使用本地 Supabase（開發環境推薦）

**本地開發推薦使用本地 Supabase**，詳見 [LOCAL_SUPABASE_SETUP.md](./LOCAL_SUPABASE_SETUP.md)

---

## 步驟 1A: 配置 Supabase 雲端連接

編輯 `config.env` 文件，添加以下配置：

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# PostgreSQL 連接字符串（從 Supabase 項目設置中獲取）
# 格式: postgresql://postgres:[password]@[host]:5432/postgres
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
# 或者使用 DATABASE_URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 如何獲取 Supabase 連接字符串：

1. 登錄 Supabase Dashboard
2. 進入項目設置 (Settings) → Database
3. 在 "Connection string" 部分，選擇 "URI" 格式
4. 複製連接字符串並替換 `[YOUR-PASSWORD]` 為您的數據庫密碼

## 步驟 1B: 配置本地 Supabase（開發環境）

**快速開始：**

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 初始化並啟動本地 Supabase
cd /home/ubuntu/ckz/psd-canvas-jaaz
supabase init
supabase start

# 查看連接信息
supabase status
```

然後在 `config.env` 中設置：
```env
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

詳見 [LOCAL_SUPABASE_SETUP.md](./LOCAL_SUPABASE_SETUP.md) 獲取完整指南。

---

## 步驟 2: 創建資料庫表結構

在 Supabase SQL Editor 中執行 `server/supabase_schema.sql` 文件：

1. 登錄 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `server/supabase_schema.sql` 的內容
4. 粘貼並執行

或者使用命令行：

```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < server/supabase_schema.sql
```

## 步驟 3: 安裝依賴

```bash
cd server
pip install -r requirements.txt
```

新添加的依賴：
- `asyncpg` - PostgreSQL 異步驅動
- `supabase` - Supabase Python 客戶端
- `psycopg2-binary` - PostgreSQL 適配器

## 步驟 4: 遷移數據（可選）

如果您有現有的 SQLite 數據需要遷移：

```bash
# 設置環境變數
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# 運行遷移腳本
python server/scripts/migrate_to_supabase.py
```

## 步驟 5: 測試連接

啟動應用程序：

```bash
cd server
python main.py
```

檢查日誌中是否有 "✅ Supabase PostgreSQL 連接池初始化成功" 消息。

## 步驟 6: 驗證功能

測試以下功能確保正常運行：

1. **用戶認證**
   - 用戶註冊
   - 用戶登錄
   - Google OAuth 登錄

2. **畫布功能**
   - 創建畫布
   - 保存畫布數據
   - 列出畫布

3. **聊天功能**
   - 創建聊天會話
   - 發送消息
   - 獲取聊天歷史

## 故障排除

### 連接失敗

**錯誤**: `❌ Supabase 連接池初始化失敗`

**解決方案**:
1. 檢查 `SUPABASE_DB_URL` 或 `DATABASE_URL` 環境變數是否正確設置
2. 確認 Supabase 項目狀態正常
3. 檢查網絡連接和防火牆設置

### 表不存在

**錯誤**: `relation "users" does not exist`

**解決方案**:
1. 確認已執行 `supabase_schema.sql`
2. 在 Supabase Dashboard 中檢查表是否存在

### 數據類型錯誤

**錯誤**: `invalid input syntax for type jsonb`

**解決方案**:
1. 確保 JSON 字段的數據格式正確
2. 檢查遷移腳本是否正確處理了 JSON 數據

## 回滾到 SQLite（如果需要）

如果遇到問題需要回滾：

1. 恢復 `server/services/db_service.py` 的原始版本
2. 恢復 `server/services/auth_service.py` 的原始版本
3. 恢復 `server/services/user_service.py` 的原始版本
4. 從 `requirements.txt` 中移除新增的依賴

## 注意事項

1. **數據備份**: 遷移前請備份 SQLite 數據庫
2. **測試環境**: 建議先在測試環境中驗證遷移
3. **性能**: Supabase 是雲端服務，網絡延遲可能比本地 SQLite 稍高
4. **成本**: Supabase 免費層有使用限制，請注意用量

## 支持

如有問題，請查看：
- Supabase 文檔: https://supabase.com/docs
- 項目 Issue: [GitHub Issues]

