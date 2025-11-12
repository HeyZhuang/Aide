#!/usr/bin/env python3
"""
修复 Admin 账户脚本
检查并更新 admin 账户的角色和密码
"""
import asyncio
import sys
import os
import aiosqlite

# 添加server目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

from services.auth_service import auth_service
from services.db_service import db_service
import hashlib

async def fix_admin_accounts():
    """修复 admin 账户"""
    print("=" * 70)
    print("检查并修复 Admin 账户...")
    print("=" * 70)
    print()
    
    admin_accounts = [
        {'username': 'admin1', 'email': 'admin1@test.com', 'password': 'admin123', 'role': 'admin'},
        {'username': 'admin2', 'email': 'admin2@test.com', 'password': 'admin123', 'role': 'admin'},
    ]
    
    async with aiosqlite.connect(db_service.db_path) as db:
        db.row_factory = aiosqlite.Row
        
        for account in admin_accounts:
            username = account['username']
            email = account['email']
            password = account['password']
            role = account['role']
            
            # 检查用户是否存在
            cursor = await db.execute(
                "SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ?",
                (username, email)
            )
            user = await cursor.fetchone()
            
            if user:
                print(f"📋 找到账户: {username}")
                print(f"   当前角色: {user['role'] if 'role' in user.keys() else '未知'}")
                
                # 更新密码哈希
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                
                # 更新用户信息
                try:
                    await db.execute("""
                        UPDATE users 
                        SET password_hash = ?, role = ?, email = ?
                        WHERE username = ?
                    """, (password_hash, role, email, username))
                    await db.commit()
                    
                    print(f"✅ 已更新账户 {username}:")
                    print(f"   角色: {role}")
                    print(f"   密码: {password}")
                    print(f"   邮箱: {email}")
                    print()
                except Exception as e:
                    print(f"❌ 更新账户 {username} 失败: {str(e)}")
                    print()
            else:
                # 如果不存在，创建新账户
                print(f"⚠️  账户 {username} 不存在，正在创建...")
                try:
                    user = await auth_service.create_user(
                        username=username,
                        email=email,
                        password=password,
                        provider='local',
                        role=role
                    )
                    print(f"✅ 成功创建账户 {username}")
                    print()
                except Exception as e:
                    print(f"❌ 创建账户 {username} 失败: {str(e)}")
                    print()
    
    # 验证所有账户
    print("=" * 70)
    print("验证账户...")
    print("=" * 70)
    
    for account in admin_accounts:
        try:
            user = await auth_service.verify_user(account['username'], account['password'])
            if user:
                print(f"✅ {account['username']:<12} - 角色: {user.get('role', '未知'):<10} - 邮箱: {user.get('email', '未知')}")
            else:
                print(f"❌ {account['username']:<12} - 验证失败")
        except Exception as e:
            print(f"❌ {account['username']:<12} - 错误: {str(e)}")
    
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(fix_admin_accounts())


