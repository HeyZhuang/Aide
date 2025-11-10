# 配置新域名 ch-love.online 的完整操作步驟

本文檔提供配置新域名 `ch-love.online` 的詳細步驟，確保用戶可以通過該域名訪問項目網站。

## 📋 前置條件

- 服務器 IP: `34.210.234.150`
- 新域名: `ch-love.online`
- Nginx 已安裝並運行
- 80 和 443 端口已開放

---

## 🔧 方案一：使用 Let's Encrypt 免費證書（推薦）

### 步驟 1: 配置 DNS 記錄

在域名管理後台（域名註冊商）添加 A 記錄：

```
類型: A
主機記錄: @ (或留空，表示根域名)
記錄值: 34.210.234.150
TTL: 600 (或使用默認值)
```

**重要**: 等待 DNS 記錄生效（通常 5-30 分鐘，最多 48 小時）

### 步驟 2: 驗證 DNS 配置

```bash
# 檢查 DNS 是否已生效
dig +short ch-love.online

# 應該返回: 34.210.234.150
```

如果返回空或錯誤的 IP，請等待 DNS 傳播完成。

### 步驟 3: 安裝 Certbot

```bash
# 更新系統包
sudo apt update

# 安裝 certbot 和 nginx 插件
sudo apt install -y certbot python3-certbot-nginx
```

### 步驟 4: 申請 Let's Encrypt 證書

```bash
# 申請證書（會自動配置 Nginx）
sudo certbot --nginx -d ch-love.online --non-interactive --agree-tos --email your-email@example.com --redirect

# 注意：將 your-email@example.com 替換為您的真實郵箱地址
```

如果成功，certbot 會自動：
- 申請證書
- 更新 Nginx 配置
- 重新加載 Nginx

### 步驟 5: 驗證配置

```bash
# 測試 HTTPS 連接
curl -I https://ch-love.online

# 檢查證書信息
sudo certbot certificates
```

---

## 🔧 方案二：使用自簽名證書（臨時方案）

如果 DNS 尚未配置或無法使用 Let's Encrypt，可以使用自簽名證書（瀏覽器會顯示警告）。

### 步驟 1: 創建證書目錄

```bash
sudo mkdir -p /etc/ssl/ch-love.online
```

### 步驟 2: 生成自簽名證書

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/ch-love.online/privkey.key \
    -out /etc/ssl/ch-love.online/fullchain.pem \
    -subj "/CN=ch-love.online" \
    -addext "subjectAltName=DNS:ch-love.online,DNS:*.ch-love.online"
```

### 步驟 3: 設置證書權限

```bash
sudo chmod 644 /etc/ssl/ch-love.online/fullchain.pem
sudo chmod 600 /etc/ssl/ch-love.online/privkey.key
sudo chown root:root /etc/ssl/ch-love.online/*
```

### 步驟 4: 更新 Nginx 配置

```bash
# 備份當前配置
sudo cp /etc/nginx/sites-available/psd-canvas /etc/nginx/sites-available/psd-canvas.backup.$(date +%Y%m%d_%H%M%S)

# 複製更新的配置文件
sudo cp /home/ubuntu/psd-canvas-jaaz/nginx-psd-canvas.conf /etc/nginx/sites-available/psd-canvas
```

### 步驟 5: 手動添加 HTTPS server block

編輯 `/etc/nginx/sites-available/psd-canvas`，在文件末尾添加：

```nginx
# HTTPS server for ch-love.online
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ch-love.online;
    
    # SSL certificate configuration
    ssl_certificate /etc/ssl/ch-love.online/fullchain.pem;
    ssl_certificate_key /etc/ssl/ch-love.online/privkey.key;
    
    # SSL security configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy /psd/ requests to backend
    location ^~ /psd/ {
        rewrite ^/psd/(.*)$ /api/psd/$1 break;
        proxy_pass http://127.0.0.1:57988;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_read_timeout 600s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 600s;
        
        client_max_body_size 500M;
        proxy_buffering off;
        proxy_request_buffering off;
        
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    }

    # Proxy API requests to backend
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:57988;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_read_timeout 600s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 600s;
        
        client_max_body_size 500M;
        client_body_buffer_size 128k;
        proxy_buffering off;
        proxy_request_buffering off;
        
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    }
    
    # Special handling for template file downloads
    location /api/psd/templates/ {
        proxy_pass http://localhost:57988;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_read_timeout 900s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 900s;
        
        client_max_body_size 500M;
        client_body_buffer_size 128k;
        proxy_buffering off;
        proxy_request_buffering off;
        
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        
        add_header Cache-Control "public, max-age=3600";
    }

    # Proxy WebSocket connections
    location /socket.io/ {
        proxy_pass http://localhost:57988;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_read_timeout 86400s;
    }

    # Proxy all other requests to frontend
    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 步驟 6: 測試並重新加載 Nginx

```bash
# 測試配置
sudo nginx -t

# 重新加載 Nginx
sudo systemctl reload nginx
```

---

## 🚀 快速配置（使用自動化腳本）

我們已經創建了一個自動化配置腳本，可以自動完成上述步驟：

```bash
# 運行配置腳本
bash /home/ubuntu/psd-canvas-jaaz/setup-domain-ch-love.sh
```

腳本會：
1. 檢查 DNS 配置
2. 讓您選擇證書方案（Let's Encrypt 或自簽名）
3. 自動申請/生成證書
4. 更新 Nginx 配置
5. 測試並重新加載 Nginx

---

## ✅ 驗證配置

### 檢查服務狀態

```bash
# 檢查 Nginx 狀態
sudo systemctl status nginx

# 檢查端口監聽
sudo ss -tlnp | grep -E ":(80|443)"
```

### 測試訪問

```bash
# 測試 HTTP（應該重定向到 HTTPS）
curl -I http://ch-love.online

# 測試 HTTPS（使用 -k 跳過證書驗證，如果是自簽名證書）
curl -k -I https://ch-love.online

# 測試網站內容
curl -k -s https://ch-love.online | head -20
```

### 在瀏覽器中測試

1. 打開瀏覽器，訪問 `https://ch-love.online`
2. 如果使用自簽名證書，會顯示安全警告
   - 點擊「高級」或「Advanced」
   - 點擊「繼續前往 ch-love.online（不安全）」或「Proceed to ch-love.online (unsafe)」
3. 確認網站正常加載

---

## 🔄 從自簽名證書升級到 Let's Encrypt

如果您先使用了自簽名證書，後續可以升級到 Let's Encrypt：

```bash
# 確保 DNS 已配置並生效
dig +short ch-love.online

# 安裝 certbot（如果尚未安裝）
sudo apt install -y certbot python3-certbot-nginx

# 申請 Let's Encrypt 證書
sudo certbot --nginx -d ch-love.online --non-interactive --agree-tos --email your-email@example.com --redirect
```

certbot 會自動更新 Nginx 配置，使用 Let's Encrypt 證書替換自簽名證書。

---

## 📝 證書續期（Let's Encrypt）

Let's Encrypt 證書有效期為 90 天，certbot 會自動續期。您也可以手動測試續期：

```bash
# 測試續期（不會真正續期）
sudo certbot renew --dry-run

# 手動續期
sudo certbot renew
```

---

## ⚠️ 常見問題

### 1. DNS 記錄未生效

**症狀**: `dig ch-love.online` 返回空或錯誤的 IP

**解決方案**:
- 等待 DNS 傳播（最多 48 小時）
- 檢查域名管理後台的 DNS 配置是否正確
- 嘗試使用不同的 DNS 服務器查詢：`dig @8.8.8.8 ch-love.online`

### 2. Let's Encrypt 證書申請失敗

**可能原因**:
- DNS 記錄未生效
- 80 端口未開放
- 域名無法從公網訪問

**解決方案**:
- 檢查防火牆設置：`sudo ufw status`
- 確保 80 和 443 端口開放：`sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- 使用自簽名證書作為臨時方案

### 3. 瀏覽器顯示證書錯誤

**自簽名證書**: 這是正常現象，點擊「高級」→「繼續訪問」即可

**Let's Encrypt 證書**: 
- 檢查證書是否過期：`sudo certbot certificates`
- 檢查證書路徑是否正確：`sudo nginx -t`
- 重新申請證書：`sudo certbot --nginx -d ch-love.online --force-renewal`

### 4. 網站無法訪問

**檢查步驟**:
```bash
# 1. 檢查 Nginx 狀態
sudo systemctl status nginx

# 2. 檢查 Nginx 配置
sudo nginx -t

# 3. 檢查錯誤日誌
sudo tail -50 /var/log/nginx/error.log

# 4. 檢查服務是否運行
sudo systemctl status psd-backend psd-frontend
```

---

## 📞 需要幫助？

如果遇到問題，請檢查：
1. Nginx 錯誤日誌：`sudo tail -f /var/log/nginx/error.log`
2. Nginx 訪問日誌：`sudo tail -f /var/log/nginx/access.log`
3. 服務狀態：`sudo systemctl status nginx psd-backend psd-frontend`

---

**配置完成後，用戶可以通過以下地址訪問網站：**
- `http://ch-love.online` (自動重定向到 HTTPS)
- `https://ch-love.online`

