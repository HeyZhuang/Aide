#!/bin/bash
# 配置新域名 ch-love.online 的腳本
# 支持兩種方案：Let's Encrypt 免費證書（推薦）或自簽名證書（臨時）

set -e

DOMAIN="ch-love.online"
SERVER_IP="34.210.234.150"
NGINX_CONFIG="/etc/nginx/sites-available/psd-canvas"
NGINX_CONFIG_SOURCE="/home/ubuntu/psd-canvas-jaaz/nginx-psd-canvas.conf"

echo "=========================================="
echo "配置新域名: $DOMAIN"
echo "=========================================="

# 檢查 DNS 配置
echo ""
echo "步驟 1: 檢查 DNS 配置..."
DNS_RESULT=$(dig +short $DOMAIN)
if [ -z "$DNS_RESULT" ]; then
    echo "⚠️  警告: 域名 $DOMAIN 尚未配置 DNS 記錄"
    echo "   請在域名管理後台添加 A 記錄："
    echo "   類型: A"
    echo "   主機記錄: @ (或留空)"
    echo "   記錄值: $SERVER_IP"
    echo "   TTL: 600 (或默認值)"
    echo ""
    read -p "DNS 記錄是否已配置？(y/n): " DNS_CONFIRMED
    if [ "$DNS_CONFIRMED" != "y" ] && [ "$DNS_CONFIRMED" != "Y" ]; then
        echo "請先配置 DNS 記錄，然後重新運行此腳本"
        exit 1
    fi
else
    echo "✅ DNS 記錄已配置: $DOMAIN -> $DNS_RESULT"
    if [ "$DNS_RESULT" != "$SERVER_IP" ]; then
        echo "⚠️  警告: DNS 記錄指向 $DNS_RESULT，但服務器 IP 是 $SERVER_IP"
        read -p "是否繼續？(y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            exit 1
        fi
    fi
fi

# 選擇證書方案
echo ""
echo "步驟 2: 選擇 SSL 證書方案"
echo "  1) Let's Encrypt 免費證書（推薦，需要 DNS 已配置）"
echo "  2) 自簽名證書（臨時方案，瀏覽器會顯示警告）"
read -p "請選擇 (1/2): " CERT_CHOICE

if [ "$CERT_CHOICE" = "1" ]; then
    # 方案 1: Let's Encrypt
    echo ""
    echo "使用 Let's Encrypt 免費證書..."
    
    # 檢查是否已安裝 certbot
    if ! command -v certbot &> /dev/null; then
        echo "安裝 certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # 申請證書
    echo ""
    echo "申請 Let's Encrypt 證書..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    if [ $? -eq 0 ]; then
        echo "✅ Let's Encrypt 證書申請成功"
        CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
        KEY_PATH="/etc/letsencrypt/live/$DOMAIN/privkey.pem"
    else
        echo "❌ Let's Encrypt 證書申請失敗，將使用自簽名證書"
        CERT_CHOICE="2"
    fi
fi

if [ "$CERT_CHOICE" = "2" ]; then
    # 方案 2: 自簽名證書
    echo ""
    echo "使用自簽名證書..."
    
    CERT_DIR="/etc/ssl/$DOMAIN"
    sudo mkdir -p $CERT_DIR
    
    echo "生成自簽名證書..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $CERT_DIR/privkey.key \
        -out $CERT_DIR/fullchain.pem \
        -subj "/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN"
    
    sudo chmod 644 $CERT_DIR/fullchain.pem
    sudo chmod 600 $CERT_DIR/privkey.key
    sudo chown root:root $CERT_DIR/*
    
    CERT_PATH="$CERT_DIR/fullchain.pem"
    KEY_PATH="$CERT_DIR/privkey.key"
    
    echo "✅ 自簽名證書已生成"
fi

# 備份當前配置
echo ""
echo "步驟 3: 備份當前 Nginx 配置..."
sudo cp $NGINX_CONFIG $NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 配置已備份"

# 更新 Nginx 配置
echo ""
echo "步驟 4: 更新 Nginx 配置..."
echo "   將添加 $DOMAIN 到 server_name..."

# 讀取當前配置並更新
sudo cp $NGINX_CONFIG_SOURCE $NGINX_CONFIG

# 使用 sed 更新 HTTP server block
sudo sed -i "s/server_name.*prototype.atcommgroup.com;/server_name 54.189.143.120 34.210.234.150 prototype.atcommgroup.com $DOMAIN;/" $NGINX_CONFIG

# 添加新域名的 HTTPS server block（在文件末尾之前）
sudo tee -a $NGINX_CONFIG > /dev/null <<EOF

# HTTPS server for $DOMAIN
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certificate configuration
    ssl_certificate $CERT_PATH;
    ssl_certificate_key $KEY_PATH;
    
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
        rewrite ^/psd/(.*)$ /api/psd/\$1 break;
        proxy_pass http://127.0.0.1:57988;
        proxy_http_version 1.1;
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        proxy_set_header Upgrade \$http_upgrade;
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
        
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        proxy_set_header Upgrade \$http_upgrade;
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
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_read_timeout 86400s;
    }

    # Proxy all other requests to frontend
    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

echo "✅ Nginx 配置已更新"

# 測試 Nginx 配置
echo ""
echo "步驟 5: 測試 Nginx 配置..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx 配置測試通過"
else
    echo "❌ Nginx 配置測試失敗，請檢查錯誤信息"
    exit 1
fi

# 重新加載 Nginx
echo ""
echo "步驟 6: 重新加載 Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx 已重新加載"

# 檢查服務狀態
echo ""
echo "步驟 7: 檢查服務狀態..."
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "=========================================="
echo "✅ 域名配置完成！"
echo ""
echo "訪問地址:"
echo "  - HTTP:  http://$DOMAIN"
echo "  - HTTPS: https://$DOMAIN"
echo ""
if [ "$CERT_CHOICE" = "2" ]; then
    echo "⚠️  注意: 使用了自簽名證書，瀏覽器會顯示安全警告"
    echo "   可以點擊「高級」→「繼續前往 $DOMAIN（不安全）」"
    echo ""
    echo "   建議後續使用 Let's Encrypt 證書："
    echo "   sudo certbot --nginx -d $DOMAIN"
fi
echo "=========================================="

