#!/usr/bin/env python3
"""
创建测试用户账户脚本
用于创建普通用户和管理员账户，便于测试
"""
import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import auth_service
from utils.logger import get_logger

logger = get_logger("scripts.create_test_users")

# 测试账户配置
TEST_USERS = [
    # 普通用户账户
    {"username": "testuser1", "email": "testuser1@example.com", "password": "test123456", "role": "user"},
    {"username": "testuser2", "email": "testuser2@example.com", "password": "test123456", "role": "user"},
    {"username": "testuser3", "email": "testuser3@example.com", "password": "test123456", "role": "user"},
    
    # 管理员账户
    {"username": "admin1", "email": "admin1@example.com", "password": "admin123456", "role": "admin"},
    {"username": "admin2", "email": "admin2@example.com", "password": "admin123456", "role": "admin"},
]

async def create_test_users():
    """创建测试用户账户"""
    print("=" * 60)
    print("开始创建测试用户账户...")
    print("=" * 60)
    
    success_count = 0
    fail_count = 0
    
    for user_info in TEST_USERS:
        username = user_info["username"]
        email = user_info["email"]
        password = user_info["password"]
        role = user_info["role"]
        
        try:
            # 检查用户是否已存在
            existing_user = await auth_service.verify_user(username, password)
            if existing_user:
                print(f"⚠️  用户 {username} ({role}) 已存在，跳过创建")
                continue
            
            # 创建用户
            user = await auth_service.create_user(
                username=username,
                email=email,
                password=password,
                provider="local",
                role=role
            )
            
            print(f"✅ 成功创建 {role} 账户:")
            print(f"   用户名: {username}")
            print(f"   邮箱: {email}")
            print(f"   密码: {password}")
            print(f"   角色: {role}")
            print()
            success_count += 1
            
        except ValueError as e:
            error_msg = str(e)
            if "用户名已存在" in error_msg:
                print(f"⚠️  用户名 {username} 已存在，跳过创建")
            elif "邮箱已存在" in error_msg:
                print(f"⚠️  邮箱 {email} 已存在，跳过创建")
            else:
                print(f"❌ 创建用户 {username} 失败: {error_msg}")
                fail_count += 1
        except Exception as e:
            print(f"❌ 创建用户 {username} 时发生错误: {str(e)}")
            fail_count += 1
    
    print("=" * 60)
    print(f"创建完成！成功: {success_count}, 失败: {fail_count}")
    print("=" * 60)
    
    # 打印账户信息汇总
    print("\n📋 测试账户信息汇总:")
    print("-" * 60)
    print("普通用户账户:")
    for user_info in TEST_USERS:
        if user_info["role"] == "user":
            print(f"  用户名: {user_info['username']:<15} 密码: {user_info['password']:<15} 邮箱: {user_info['email']}")
    
    print("\n管理员账户:")
    for user_info in TEST_USERS:
        if user_info["role"] == "admin":
            print(f"  用户名: {user_info['username']:<15} 密码: {user_info['password']:<15} 邮箱: {user_info['email']}")
    
    print("-" * 60)

if __name__ == "__main__":
    try:
        asyncio.run(create_test_users())
    except KeyboardInterrupt:
        print("\n\n⚠️  操作已取消")
    except Exception as e:
        print(f"\n❌ 发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

