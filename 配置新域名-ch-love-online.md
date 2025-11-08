# 配置新域名 ch-love.online 的完整操作步驟

## 📋 快速開始

### 方法一：使用自動化腳本（推薦）

```bash
bash /home/ubuntu/psd-canvas-jaaz/setup-domain-ch-love.sh
```

腳本會自動完成所有配置步驟。

---

### 方法二：手動配置

## 🔧 步驟 1: 配置 DNS 記錄

在域名管理後台添加 A 記錄：

- **類型**: A
- **主機記錄**: @ (或留空，表示根域名)
- **記錄值**: `34.210.234.150`
- **TTL**: 600 (或使用默認值)

**重要**: 等待 DNS 記錄生效（通常 5-30 分鐘）

驗證 DNS 配置：
```bash
dig +short ch-love.online
# 應該返回: 34.210.234.150
```

---

## 🔧 步驟 2: 選擇 SSL 證書方案

### 方案 A: Let's Encrypt 免費證書（推薦）

#### 2.1 安裝 Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

#### 2.2 申請證書

```bash
sudo certbot --nginx -d ch-love.online --non-interactive --agree-tos --email your-email@example.com --redirect
```

**注意**: 將 `your-email@example.com` 替換為您的真實郵箱地址

如果成功，certbot 會自動配置 Nginx。

---

### 方案 B: 自簽名證書（臨時方案）

如果 DNS 尚未配置或無法使用 Let's Encrypt，可以使用自簽名證書。

#### 2.1 創建證書目錄

```bash
sudo mkdir -p /etc/ssl/ch-love.online
```

#### 2.2 生成自簽名證書

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/ch-love.online/privkey.key \
    -out /etc/ssl/ch-love.online/fullchain.pem \
    -subj "/CN=ch-love.online" \
    -addext "subjectAltName=DNS:ch-love.online,DNS:*.ch-love.online"
```

#### 2.3 設置證書權限

```bash
sudo chmod 644 /etc/ssl/ch-love.online/fullchain.pem
sudo chmod 600 /etc/ssl/ch-love.online/privkey.key
sudo chown root:root /etc/ssl/ch-love.online/*
```

---

## 🔧 步驟 3: 更新 Nginx 配置

### 3.1 備份當前配置

```bash
sudo cp /etc/nginx/sites-available/psd-canvas /etc/nginx/sites-available/psd-canvas.backup.$(date +%Y%m%d_%H%M%S)
```

### 3.2 複製更新的配置文件

```bash
sudo cp /home/ubuntu/psd-canvas-jaaz/nginx-psd-canvas.conf /etc/nginx/sites-available/psd-canvas
```

**注意**: 如果使用 Let's Encrypt，certbot 已經自動更新了配置，可以跳過此步驟。

如果使用自簽名證書，配置文件已經包含了 ch-love.online 的配置，但需要確保證書路徑正確。

---

## 🔧 步驟 4: 測試並重新加載 Nginx

### 4.1 測試配置

```bash
sudo nginx -t
```

應該顯示：`nginx: configuration file /etc/nginx/nginx.conf test is successful`

### 4.2 重新加載 Nginx

```bash
sudo systemctl reload nginx
```

### 4.3 檢查服務狀態

```bash
sudo systemctl status nginx --no-pager | head -10
```

---

## ✅ 步驟 5: 驗證配置

### 5.1 檢查端口監聽

```bash
sudo ss -tlnp | grep -E ":(80|443)"
```

應該看到 80 和 443 端口都在監聽。

### 5.2 測試 HTTP 訪問（應該重定向到 HTTPS）

```bash
curl -I http://ch-love.online
```

應該返回 `301 Moved Permanently` 並重定向到 HTTPS。

### 5.3 測試 HTTPS 訪問

```bash
# 如果是自簽名證書，使用 -k 跳過證書驗證
curl -k -I https://ch-love.online

# 測試網站內容
curl -k -s https://ch-love.online | head -20
```

### 5.4 在瀏覽器中測試

1. 打開瀏覽器，訪問 `https://ch-love.online`
2. 如果使用自簽名證書，會顯示安全警告
   - 點擊「高級」或「Advanced」
   - 點擊「繼續前往 ch-love.online（不安全）」
3. 確認網站正常加載

---

## 🔄 從自簽名證書升級到 Let's Encrypt

如果您先使用了自簽名證書，後續可以升級：

```bash
# 1. 確保 DNS 已配置並生效
dig +short ch-love.online

# 2. 安裝 certbot（如果尚未安裝）
sudo apt install -y certbot python3-certbot-nginx

# 3. 申請 Let's Encrypt 證書
sudo certbot --nginx -d ch-love.online --non-interactive --agree-tos --email your-email@example.com --redirect
```

certbot 會自動更新 Nginx 配置，使用 Let's Encrypt 證書替換自簽名證書。

---

## ⚠️ 常見問題

### 1. DNS 記錄未生效

**症狀**: `dig ch-love.online` 返回空

**解決方案**:
- 等待 DNS 傳播（最多 48 小時）
- 檢查域名管理後台的 DNS 配置
- 嘗試使用不同的 DNS 服務器：`dig @8.8.8.8 ch-love.online`

### 2. Let's Encrypt 證書申請失敗

**可能原因**:
- DNS 記錄未生效
- 80 端口未開放
- 域名無法從公網訪問

**解決方案**:
- 檢查防火牆：`sudo ufw status`
- 確保端口開放：`sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`
- 使用自簽名證書作為臨時方案

### 3. 網站無法訪問

**檢查步驟**:
```bash
# 檢查 Nginx 狀態
sudo systemctl status nginx

# 檢查 Nginx 配置
sudo nginx -t

# 檢查錯誤日誌
sudo tail -50 /var/log/nginx/error.log

# 檢查服務是否運行
sudo systemctl status psd-backend psd-frontend
```

---

## 📝 完成後

配置完成後，用戶可以通過以下地址訪問網站：

- ✅ `http://ch-love.online` (自動重定向到 HTTPS)
- ✅ `https://ch-love.online`

---

## 📚 相關文檔

詳細配置文檔請參考：
- `/home/ubuntu/psd-canvas-jaaz/CH-LOVE-ONLINE-SETUP.md`
- `/home/ubuntu/psd-canvas-jaaz/setup-domain-ch-love.sh` (自動化腳本)

