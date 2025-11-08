#!/bin/bash
# HTTPS 配置脚本
# 用于配置 SSL 证书并启用 HTTPS 访问

set -e

echo "=========================================="
echo "开始配置 HTTPS"
echo "=========================================="

# 步骤 1: 创建 SSL 证书目录
echo ""
echo "步骤 1: 创建 SSL 证书目录..."
sudo mkdir -p /etc/ssl/prototype.atcommgroup.com
echo "✅ SSL 证书目录已创建"

# 步骤 2: 复制证书文件
echo ""
echo "步骤 2: 复制证书文件..."
sudo cp /home/ubuntu/psd-canvas-jaaz/prototype.atcommgroup.com_1762242363/Nginx/fullchain.pem /etc/ssl/prototype.atcommgroup.com/fullchain.pem
sudo cp /home/ubuntu/psd-canvas-jaaz/prototype.atcommgroup.com_1762242363/Nginx/privkey.key /etc/ssl/prototype.atcommgroup.com/privkey.key
echo "✅ 证书文件已复制"

# 步骤 3: 设置证书文件权限
echo ""
echo "步骤 3: 设置证书文件权限..."
sudo chmod 644 /etc/ssl/prototype.atcommgroup.com/fullchain.pem
sudo chmod 600 /etc/ssl/prototype.atcommgroup.com/privkey.key
sudo chown root:root /etc/ssl/prototype.atcommgroup.com/fullchain.pem
sudo chown root:root /etc/ssl/prototype.atcommgroup.com/privkey.key
echo "✅ 证书文件权限已设置"
ls -la /etc/ssl/prototype.atcommgroup.com/

# 步骤 4: 验证证书
echo ""
echo "步骤 4: 验证证书..."
openssl x509 -in /etc/ssl/prototype.atcommgroup.com/fullchain.pem -noout -subject -dates
echo "✅ 证书验证完成"

# 步骤 5: 备份当前 Nginx 配置
echo ""
echo "步骤 5: 备份当前 Nginx 配置..."
sudo cp /etc/nginx/sites-available/psd-canvas /etc/nginx/sites-available/psd-canvas.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 配置已备份"

# 步骤 6: 复制 HTTPS 配置
echo ""
echo "步骤 6: 复制 HTTPS 配置..."
sudo cp /home/ubuntu/psd-canvas-jaaz/nginx-psd-canvas.conf /etc/nginx/sites-available/psd-canvas
echo "✅ HTTPS 配置已复制"

# 步骤 7: 测试 Nginx 配置
echo ""
echo "步骤 7: 测试 Nginx 配置..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx 配置测试通过"
else
    echo "❌ Nginx 配置测试失败，请检查错误信息"
    exit 1
fi

# 步骤 8: 重新加载 Nginx
echo ""
echo "步骤 8: 重新加载 Nginx..."
sudo systemctl reload nginx
echo "✅ Nginx 已重新加载"

# 步骤 9: 检查服务状态
echo ""
echo "步骤 9: 检查服务状态..."
sudo systemctl status nginx --no-pager | head -10
echo ""
sudo ss -tlnp | grep -E ":(80|443)" || echo "端口监听检查..."

# 步骤 10: 验证 HTTPS 访问
echo ""
echo "步骤 10: 验证 HTTPS 访问..."
echo "测试本地 HTTPS 连接..."
curl -k -I https://localhost 2>&1 | head -5 || echo "本地 HTTPS 测试..."

echo ""
echo "=========================================="
echo "✅ HTTPS 配置完成！"
echo ""
echo "访问地址:"
echo "  - HTTP:  http://prototype.atcommgroup.com"
echo "  - HTTPS: https://prototype.atcommgroup.com"
echo ""
echo "如果无法访问，请检查："
echo "  1. 防火墙是否开放 80 和 443 端口"
echo "  2. 域名 DNS 解析是否正确"
echo "  3. Nginx 错误日志: sudo tail -f /var/log/nginx/error.log"
echo "=========================================="

