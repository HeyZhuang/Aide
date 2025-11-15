# 数据库图形化界面工具设置指南

## 🖥️ 方法1：使用 pgAdmin4 (推荐)

### 启动 pgAdmin4
```bash
# 启动 pgAdmin4 服务
sudo /usr/pgadmin4/bin/setup-web.sh

# 或者直接运行
pgadmin4
```

### 访问 pgAdmin4
- 浏览器访问：`http://localhost/pgadmin4`
- 或者：`http://54.189.143.120/pgadmin4`

### 连接数据库配置
- **主机**: localhost
- **端口**: 5432
- **数据库**: psd_canvas
- **用户名**: postgres 或 psd_user
- **密码**: 根据您的配置

---

## 🌐 方法2：使用 Adminer (轻量级)

### 安装 Adminer
```bash
# 下载 Adminer
sudo wget -O /var/www/html/adminer.php https://www.adminer.org/latest.php

# 设置权限
sudo chown www-data:www-data /var/www/html/adminer.php
```

### 访问 Adminer
- 浏览器访问：`http://54.189.143.120/adminer.php`

### 连接配置
- **系统**: PostgreSQL
- **服务器**: localhost
- **用户名**: postgres
- **密码**: [您的密码]
- **数据库**: psd_canvas

---

## 🔧 方法3：使用 DBeaver (桌面应用)

### 在本地电脑安装 DBeaver
1. 下载：https://dbeaver.io/download/
2. 安装后创建新连接
3. 选择 PostgreSQL

### SSH 隧道连接配置
**数据库连接**:
- **主机**: localhost
- **端口**: 5432
- **数据库**: psd_canvas
- **用户名**: postgres

**SSH 隧道**:
- **主机**: 54.189.143.120
- **端口**: 22
- **用户名**: ubuntu
- **认证**: 使用您的 SSH 密钥

---

## 📱 方法4：使用 phpPgAdmin

### 安装 phpPgAdmin
```bash
sudo apt update
sudo apt install phppgadmin apache2 -y

# 配置 phpPgAdmin
sudo nano /etc/phppgadmin/config.inc.php
```

### 配置文件修改
```php
// 允许从任何主机连接
$conf['servers'][0]['host'] = 'localhost';
$conf['extra_login_security'] = false;
```

### 重启服务
```bash
sudo systemctl restart apache2
```

### 访问
- 浏览器访问：`http://54.189.143.120/phppgadmin`

---

## 🚀 快速启动脚本

我为您创建一个快速启动脚本：

```bash
#!/bin/bash
echo "选择数据库图形化工具："
echo "1) 启动 pgAdmin4"
echo "2) 安装并启动 Adminer"
echo "3) 安装并启动 phpPgAdmin"
echo "4) 显示连接信息"

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo "启动 pgAdmin4..."
        pgadmin4 &
        echo "访问: http://54.189.143.120/pgadmin4"
        ;;
    2)
        echo "安装 Adminer..."
        sudo mkdir -p /var/www/html
        sudo wget -O /var/www/html/adminer.php https://www.adminer.org/latest.php
        echo "访问: http://54.189.143.120/adminer.php"
        ;;
    3)
        echo "安装 phpPgAdmin..."
        sudo apt update && sudo apt install phppgadmin apache2 -y
        sudo systemctl start apache2
        echo "访问: http://54.189.143.120/phppgadmin"
        ;;
    4)
        echo "数据库连接信息："
        echo "主机: localhost"
        echo "端口: 5432"
        echo "数据库: psd_canvas"
        echo "用户: postgres"
        echo "服务器IP: 54.189.143.120"
        ;;
esac
```

---

## 💡 推荐方案

**对于服务器管理员**：
- 使用 pgAdmin4 或 Adminer（Web界面）

**对于开发者**：
- 使用 DBeaver（桌面应用，功能强大）

**对于快速查看**：
- 使用我们之前创建的 `./db_info.sh` 脚本

---

## 🔐 安全注意事项

1. **防火墙设置**：确保只允许必要的端口访问
2. **密码安全**：使用强密码
3. **SSL连接**：生产环境建议启用SSL
4. **访问控制**：限制管理界面的访问IP
