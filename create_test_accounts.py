#!/usr/bin/env python3
"""
创建测试账户脚本
用于创建 Admin 和 Editor 角色的测试账户
"""
import asyncio
import sys
import os

# 添加server目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

from services.auth_service import auth_service

# 测试账户配置
TEST_ACCOUNTS = [
    # Admin 角色账户
    {"username": "admin1", "email": "admin1@test.com", "password": "admin123", "role": "admin"},
    {"username": "admin2", "email": "admin2@test.com", "password": "admin123", "role": "admin"},
    
    # Editor 角色账户
    {"username": "editor1", "email": "editor1@test.com", "password": "editor123", "role": "editor"},
    {"username": "editor2", "email": "editor2@test.com", "password": "editor123", "role": "editor"},
    
    # Viewer 角色账户（用于对比测试）
    {"username": "viewer1", "email": "viewer1@test.com", "password": "viewer123", "role": "viewer"},
    {"username": "viewer2", "email": "viewer2@test.com", "password": "viewer123", "role": "viewer"},
]

async def create_test_accounts():
    """创建测试账户"""
    print("=" * 70)
    print("开始创建测试账户...")
    print("=" * 70)
    print()
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for account in TEST_ACCOUNTS:
        username = account["username"]
        email = account["email"]
        password = account["password"]
        role = account["role"]
        
        try:
            # 尝试创建用户
            user = await auth_service.create_user(
                username=username,
                email=email,
                password=password,
                provider="local",
                role=role
            )
            
            print(f"✅ 成功创建 {role.upper()} 账户:")
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
                skip_count += 1
            elif "邮箱已存在" in error_msg:
                print(f"⚠️  邮箱 {email} 已存在，跳过创建")
                skip_count += 1
            else:
                print(f"❌ 创建账户 {username} 失败: {error_msg}")
                fail_count += 1
        except Exception as e:
            print(f"❌ 创建账户 {username} 时发生错误: {str(e)}")
            fail_count += 1
    
    print("=" * 70)
    print(f"创建完成！成功: {success_count}, 跳过: {skip_count}, 失败: {fail_count}")
    print("=" * 70)
    print()
    
    # 打印账户信息汇总
    print("📋 测试账户信息汇总:")
    print("-" * 70)
    print()
    
    print("👑 Admin 角色账户:")
    for account in TEST_ACCOUNTS:
        if account["role"] == "admin":
            print(f"   用户名: {account['username']:<12} 密码: {account['password']:<12} 邮箱: {account['email']}")
    print()
    
    print("✏️  Editor 角色账户:")
    for account in TEST_ACCOUNTS:
        if account["role"] == "editor":
            print(f"   用户名: {account['username']:<12} 密码: {account['password']:<12} 邮箱: {account['email']}")
    print()
    
    print("👁️  Viewer 角色账户:")
    for account in TEST_ACCOUNTS:
        if account["role"] == "viewer":
            print(f"   用户名: {account['username']:<12} 密码: {account['password']:<12} 邮箱: {account['email']}")
    print()
    
    print("=" * 70)
    print("💡 提示：")
    print("   - Admin 角色可以访问管理仪表盘，管理模板和用户权限")
    print("   - Editor 角色可以编辑画布，但不能访问管理仪表盘")
    print("   - Viewer 角色只能查看模板和画布，无法编辑")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(create_test_accounts())

