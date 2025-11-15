# ✅ 本地 Supabase 設置完成

## 🎉 設置成功！

您的項目已成功配置為使用**本地 Supabase/PostgreSQL**，所有數據將存儲在本地服務器上。

## 📋 當前配置

### 資料庫信息
- **資料庫名稱**: `psd_canvas`
- **用戶名**: `psd_user`
- **密碼**: `psd_canvas_local_2024`
- **主機**: `localhost`
- **端口**: `5432`
- **連接字符串**: `postgresql://psd_user:psd_canvas_local_2024@localhost:5432/psd_canvas`

### 已創建的表（11個）
✅ users - 用戶表  
✅ auth_tokens - 認證令牌表  
✅ device_codes - 設備碼表  
✅ canvases - 畫布表  
✅ chat_sessions - 聊天會話表  
✅ chat_messages - 聊天消息表  
✅ organizations - 組織表  
✅ organization_members - 組織成員表  
✅ organization_join_requests - 組織加入申請表  
✅ comfy_workflows - ComfyUI 工作流表  
✅ db_version - 資料庫版本表  

## 🚀 快速開始

### 1. 安裝依賴
```bash
cd server
pip install -r requirements.txt
```

### 2. 啟動應用
```bash
cd server
python main.py
```

應用會自動：
- ✅ 加載 `config.env` 配置文件
- ✅ 連接到本地 PostgreSQL 資料庫
- ✅ 初始化資料庫連接池

## 📁 配置文件

### config.env
```env
# 本地 Supabase/PostgreSQL 連接配置
SUPABASE_DB_URL=postgresql://psd_user:psd_canvas_local_2024@localhost:5432/psd_canvas
```

## 🔍 驗證設置

### 檢查資料庫連接
```bash
PGPASSWORD=psd_canvas_local_2024 psql -h localhost -U psd_user -d psd_canvas -c "\dt"
```

### 檢查環境變數
```bash
cd /home/ubuntu/ckz/psd-canvas-jaaz
python3 -c "from dotenv import load_dotenv; import os; load_dotenv('config.env'); print('SUPABASE_DB_URL:', os.getenv('SUPABASE_DB_URL'))"
```

## 📊 資料庫管理

### 連接資料庫
```bash
# 方式 1: 使用 psd_user
PGPASSWORD=psd_canvas_local_2024 psql -h localhost -U psd_user -d psd_canvas

# 方式 2: 使用 postgres 用戶
sudo -u postgres psql -d psd_canvas
```

### 查看數據
```sql
-- 查看所有用戶
SELECT id, username, email, created_at FROM users;

-- 查看所有畫布
SELECT id, name, user_id, created_at FROM canvases;

-- 查看資料庫版本
SELECT * FROM db_version;
```

### 備份資料庫
```bash
sudo -u postgres pg_dump psd_canvas > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 恢復資料庫
```bash
sudo -u postgres psql -d psd_canvas < backup_20241114_120000.sql
```

## 🔧 故障排除

### 問題：連接失敗
**解決方案**:
```bash
# 1. 檢查 PostgreSQL 服務
sudo systemctl status postgresql

# 2. 重啟 PostgreSQL（如果需要）
sudo systemctl restart postgresql

# 3. 測試連接
PGPASSWORD=psd_canvas_local_2024 psql -h localhost -U psd_user -d psd_canvas -c "SELECT 1;"
```

### 問題：表不存在
**解決方案**:
```bash
# 重新執行 schema
cat server/supabase_schema_local.sql | sudo -u postgres psql -d psd_canvas
```

### 問題：權限錯誤
**解決方案**:
```bash
# 重新授予權限
sudo -u postgres psql -d psd_canvas << 'EOF'
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO psd_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO psd_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO psd_user;
EOF
```

## 📝 重要說明

### ✅ 數據存儲位置
- **所有數據存儲在本地服務器**
- **資料庫文件位置**: `/var/lib/postgresql/16/main/`
- **不會連接到任何雲端服務**

### ✅ 與 Supabase 雲端的區別
1. **不使用 RLS**: 本地版本不使用 Row Level Security（應用層處理權限）
2. **認證方式**: 使用應用層認證，不依賴 Supabase Auth
3. **完全本地**: 所有數據和服務都在本地服務器

### ✅ 遷移到 Supabase 雲端（可選）
如果需要遷移到 Supabase 雲端：
1. 在 Supabase Dashboard 創建項目
2. 執行 `server/supabase_schema.sql`（包含 RLS 策略）
3. 使用遷移腳本：`python server/scripts/migrate_to_supabase.py`
4. 更新 `config.env` 中的連接字符串

## 🎯 下一步

1. ✅ **安裝依賴**: `cd server && pip install -r requirements.txt`
2. ✅ **啟動應用**: `python main.py`
3. ✅ **測試功能**: 創建用戶、畫布等，驗證數據存儲在本地

## 📚 相關文檔

- [LOCAL_SETUP_COMPLETE.md](./LOCAL_SETUP_COMPLETE.md) - 詳細設置說明
- [LOCAL_SUPABASE_SETUP.md](./LOCAL_SUPABASE_SETUP.md) - 本地 Supabase 設置指南
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 遷移指南

---

**🎉 設置完成！您的數據現在完全存儲在本地服務器上！**





