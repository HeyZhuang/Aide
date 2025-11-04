#!/usr/bin/env python3
"""
创建用户脚本
用法: python3 create_user.py <username> <email> <password>
"""
import asyncio
import sys
import os

# 添加server目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

from services.auth_service import auth_service


async def create_user():
    if len(sys.argv) < 4:
        print("用法: python3 create_user.py <username> <email> <password>")
        print("示例: python3 create_user.py admin admin@test.com admin123")
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
        print(f"   创建时间: {user['created_at']}")
    except ValueError as e:
        if "已存在" in str(e):
            print(f"ℹ️  用户已存在: {str(e)}")
        else:
            print(f"❌ 创建用户失败: {str(e)}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(create_user())

