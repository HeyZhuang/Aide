# HTTPS 配置命令

请依次执行以下命令来配置 HTTPS：

## 步骤 1: 创建 SSL 证书目录
```bash
sudo mkdir -p /etc/ssl/prototype.atcommgroup.com
```

## 步骤 2: 复制证书文件
```bash
sudo cp /home/ubuntu/psd-canvas-jaaz/prototype.atcommgroup.com_1762242363/Nginx/fullchain.pem /etc/ssl/prototype.atcommgroup.com/fullchain.pem
sudo cp /home/ubuntu/psd-canvas-jaaz/prototype.atcommgroup.com_1762242363/Nginx/privkey.key /etc/ssl/prototype.atcommgroup.com/privkey.key
```

## 步骤 3: 设置证书文件权限
```bash
sudo chmod 644 /etc/ssl/prototype.atcommgroup.com/fullchain.pem
sudo chmod 600 /etc/ssl/prototype.atcommgroup.com/privkey.key
sudo chown root:root /etc/ssl/prototype.atcommgroup.com/fullchain.pem
sudo chown root:root /etc/ssl/prototype.atcommgroup.com/privkey.key
```

## 步骤 4: 验证证书
```bash
openssl x509 -in /etc/ssl/prototype.atcommgroup.com/fullchain.pem -noout -subject -dates
ls -la /etc/ssl/prototype.atcommgroup.com/
```

## 步骤 5: 备份当前 Nginx 配置
```bash
sudo cp /etc/nginx/sites-available/psd-canvas /etc/nginx/sites-available/psd-canvas.backup.$(date +%Y%m%d_%H%M%S)
```

## 步骤 6: 复制 HTTPS 配置
```bash
sudo cp /home/ubuntu/psd-canvas-jaaz/nginx-psd-canvas.conf /etc/nginx/sites-available/psd-canvas
```

## 步骤 7: 测试 Nginx 配置
```bash
sudo nginx -t
```

## 步骤 8: 重新加载 Nginx
```bash
sudo systemctl reload nginx
```

## 步骤 9: 检查服务状态
```bash
sudo systemctl status nginx --no-pager | head -10
sudo ss -tlnp | grep -E ":(80|443)"
```

## 步骤 10: 验证 HTTPS 访问
```bash
curl -k -I https://localhost 2>&1 | head -5
```

---

## 或者使用一键脚本

```bash
bash /home/ubuntu/psd-canvas-jaaz/setup-https.sh
```

