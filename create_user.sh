#!/bin/bash
# 创建用户脚本

cd /home/ubuntu/cckz/psd-canvas-jaaz/server

python3 << 'EOF'
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.auth_service import auth_service

async def create_user():
    if len(sys.argv) < 4:
        print("用法: ./create_user.sh <username> <email> <password>")
        print("示例: ./create_user.sh admin admin@test.com admin123")
        sys.exit(1)
    
    username = sys.argv[1]
    email = sys.argv[2]
    password = sys.argv[3]
    
    try:
        user = await auth_service.create_user(username, email, password)
        print(f"✅ 用户创建成功！")
        print(f"   ID: {user['id']}")
        print(f"   用户名: {user['username']}")
        print(f"   邮箱: {user['email']}")
    except ValueError as e:
        if "已存在" in str(e):
            print(f"ℹ️  用户已存在: {str(e)}")
        else:
            print(f"❌ 创建用户失败: {str(e)}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_user())
EOF

