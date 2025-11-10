# 快速配置新域名 ch-love.online

## 🚀 三步快速配置

### 步驟 1: 配置 DNS 記錄

在域名管理後台添加 A 記錄：
- **類型**: A
- **主機記錄**: @ (或留空)
- **記錄值**: `34.210.234.150`
- **TTL**: 600

等待 DNS 生效（5-30 分鐘）

### 步驟 2: 選擇並配置 SSL 證書

#### 方案 A: Let's Encrypt 免費證書（推薦）

```bash
# 安裝 certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 申請證書（自動配置 Nginx）
sudo certbot --nginx -d ch-love.online --non-interactive --agree-tos --email your-email@example.com --redirect
```

#### 方案 B: 自簽名證書（臨時）

```bash
# 創建證書目錄
sudo mkdir -p /etc/ssl/ch-love.online

# 生成自簽名證書
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/ch-love.online/privkey.key \
    -out /etc/ssl/ch-love.online/fullchain.pem \
    -subj "/CN=ch-love.online" \
    -addext "subjectAltName=DNS:ch-love.online,DNS:*.ch-love.online"

# 設置權限
sudo chmod 644 /etc/ssl/ch-love.online/fullchain.pem
sudo chmod 600 /etc/ssl/ch-love.online/privkey.key
sudo chown root:root /etc/ssl/ch-love.online/*
```

### 步驟 3: 更新並重新加載 Nginx

```bash
# 備份當前配置
sudo cp /etc/nginx/sites-available/psd-canvas /etc/nginx/sites-available/psd-canvas.backup.$(date +%Y%m%d_%H%M%S)

# 複製更新的配置文件
sudo cp /home/ubuntu/psd-canvas-jaaz/nginx-psd-canvas.conf /etc/nginx/sites-available/psd-canvas

# 測試配置
sudo nginx -t

# 重新加載 Nginx
sudo systemctl reload nginx
```

**注意**: 如果使用 Let's Encrypt，certbot 已經自動更新了配置，可以跳過複製配置文件的步驟。

---

## ✅ 驗證配置

```bash
# 檢查 DNS
dig +short ch-love.online

# 測試 HTTP（應該重定向到 HTTPS）
curl -I http://ch-love.online

# 測試 HTTPS（自簽名證書使用 -k）
curl -k -I https://ch-love.online
```

在瀏覽器中訪問：`https://ch-love.online`

---

## 📝 完整文檔

詳細配置步驟請參考：
- `/home/ubuntu/psd-canvas-jaaz/配置新域名-ch-love-online.md`
- `/home/ubuntu/psd-canvas-jaaz/CH-LOVE-ONLINE-SETUP.md`

自動化腳本：
- `/home/ubuntu/psd-canvas-jaaz/setup-domain-ch-love.sh`

