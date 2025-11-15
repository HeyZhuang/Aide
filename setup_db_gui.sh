#!/bin/bash

echo "=========================================="
echo "数据库图形化界面工具设置"
echo "=========================================="

echo "选择要设置的图形化工具："
echo "1) 安装并启动 Adminer (推荐，轻量级)"
echo "2) 安装并启动 phpPgAdmin"
echo "3) 显示 pgAdmin4 启动方法"
echo "4) 显示数据库连接信息"
echo "5) 安装 Apache2 (Web服务器)"

read -p "请选择 (1-5): " choice

case $choice in
    1)
        echo "🔧 安装 Adminer..."
        sudo mkdir -p /var/www/html
        
        # 检查是否已安装 Apache2
        if ! systemctl is-active --quiet apache2; then
            echo "📦 安装 Apache2..."
            sudo apt update
            sudo apt install apache2 -y
            sudo systemctl start apache2
            sudo systemctl enable apache2
        fi
        
        # 下载 Adminer
        sudo wget -O /var/www/html/adminer.php https://www.adminer.org/latest.php
        sudo chown www-data:www-data /var/www/html/adminer.php
        
        echo "✅ Adminer 安装完成！"
        echo ""
        echo "🌐 访问地址: http://54.189.143.120:8080/adminer.php"
        echo ""
        echo "📋 连接信息："
        echo "   系统: PostgreSQL"
        echo "   服务器: localhost"
        echo "   用户名: postgres"
        echo "   数据库: psd_canvas"
        echo "   密码: [需要您输入postgres用户密码]"
        ;;
        
    2)
        echo "🔧 安装 phpPgAdmin..."
        sudo apt update
        sudo apt install phppgadmin apache2 -y
        
        # 配置 phpPgAdmin
        sudo sed -i "s/#allow from all/allow from all/" /etc/apache2/conf-available/phppgadmin.conf
        sudo a2enconf phppgadmin
        sudo systemctl restart apache2
        
        echo "✅ phpPgAdmin 安装完成！"
        echo ""
        echo "🌐 访问地址: http://54.189.143.120/phppgadmin"
        ;;
        
    3)
        echo "📋 pgAdmin4 启动方法："
        echo ""
        echo "方法1 - Web界面:"
        echo "sudo /usr/pgadmin4/bin/setup-web.sh"
        echo "然后访问: http://54.189.143.120/pgadmin4"
        echo ""
        echo "方法2 - 桌面模式:"
        echo "pgadmin4"
        ;;
        
    4)
        echo "📋 数据库连接信息："
        echo "----------------------------------------"
        echo "数据库类型: PostgreSQL"
        echo "主机地址: localhost"
        echo "端口: 5432"
        echo "数据库名: psd_canvas"
        echo "用户名: postgres"
        echo "服务器IP: 54.189.143.120"
        echo ""
        echo "🔍 当前数据库状态："
        ./db_info.sh
        ;;
        
    5)
        echo "📦 安装 Apache2 Web服务器..."
        sudo apt update
        sudo apt install apache2 -y
        sudo systemctl start apache2
        sudo systemctl enable apache2
        
        echo "✅ Apache2 安装完成！"
        echo "🌐 测试访问: http://54.189.143.120"
        ;;
        
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "设置完成！"
echo "=========================================="
