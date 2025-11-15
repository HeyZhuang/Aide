# SQLite 到 Supabase 遷移總結

## ✅ 已完成的工作

### 1. 依賴更新
- ✅ 更新 `requirements.txt`，添加：
  - `asyncpg` - PostgreSQL 異步驅動
  - `supabase` - Supabase Python 客戶端
  - `psycopg2-binary` - PostgreSQL 適配器

### 2. 配置更新
- ✅ 更新 `config.env.example` 添加 Supabase 配置示例
- ✅ 更新 `config.env` 添加 Supabase 配置註釋

### 3. 核心服務重寫
- ✅ **db_service.py** - 完全重寫使用 Supabase PostgreSQL
  - 使用 `asyncpg` 連接池
  - 所有 SQL 查詢從 SQLite 語法轉換為 PostgreSQL 語法
  - 參數占位符從 `?` 改為 `$1, $2, ...`
  - 添加用戶、認證令牌、設備碼相關方法

- ✅ **auth_service.py** - 更新使用新的 db_service
  - 移除所有 `aiosqlite` 依賴
  - 使用新的資料庫服務方法

- ✅ **user_service.py** - 更新使用新的 db_service
  - 移除所有 `aiosqlite` 依賴
  - 使用新的資料庫服務方法

### 4. 遷移工具
- ✅ 創建 `server/scripts/migrate_to_supabase.py` 數據遷移腳本
- ✅ 創建 `MIGRATION_GUIDE.md` 詳細遷移指南

### 5. 文檔
- ✅ 創建完整的遷移指南
- ✅ 包含故障排除和回滾說明

## 📋 下一步操作

### 必須執行的步驟：

1. **配置 Supabase 連接**
   ```bash
   # 編輯 config.env，添加：
   SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

2. **在 Supabase 中創建表結構**
   - 登錄 Supabase Dashboard
   - 進入 SQL Editor
   - 執行 `server/supabase_schema.sql`

3. **安裝新依賴**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

4. **遷移數據（如果有現有數據）**
   ```bash
   export SUPABASE_DB_URL="postgresql://..."
   python server/scripts/migrate_to_supabase.py
   ```

5. **測試應用**
   ```bash
   cd server
   python main.py
   ```

## ⚠️ 重要注意事項

1. **環境變數**: 必須設置 `SUPABASE_DB_URL` 或 `DATABASE_URL`
2. **表結構**: 必須先執行 `supabase_schema.sql` 創建表
3. **數據備份**: 遷移前請備份 SQLite 數據庫
4. **測試**: 建議先在測試環境驗證

## 🔄 主要變更

### SQL 語法變更
- `?` → `$1, $2, ...` (參數占位符)
- `STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')` → `NOW()` (時間函數)
- `TEXT` → `JSONB` (JSON 字段類型)
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL PRIMARY KEY` (自增ID)

### 連接方式變更
- `aiosqlite.connect()` → `asyncpg.create_pool()`
- 文件型資料庫 → 網絡資料庫連接池

### 錯誤處理變更
- `aiosqlite.IntegrityError` → `asyncpg.UniqueViolationError`

## 📝 待處理項目（如果需要）

- [ ] 更新 `template_service.py`（如果它使用 SQLite）
- [ ] 更新其他可能使用 SQLite 的服務
- [ ] 添加連接重試邏輯
- [ ] 添加連接健康檢查
- [ ] 性能優化和索引調整

## 🐛 已知問題

無

## 📚 相關文檔

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 詳細遷移指南
- [server/supabase_schema.sql](./server/supabase_schema.sql) - 資料庫表結構





