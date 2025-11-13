#!/usr/bin/env python3
"""
验证测试账户脚本
"""
import asyncio
import sys
import os

# 添加server目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server'))

from services.auth_service import auth_service

async def verify_all_accounts():
    accounts = [
        ('admin1', 'admin123', 'admin'),
        ('admin2', 'admin123', 'admin'),
        ('editor1', 'editor123', 'editor'),
        ('editor2', 'editor123', 'editor'),
        ('viewer1', 'viewer123', 'viewer'),
        ('viewer2', 'viewer123', 'viewer'),
    ]
    
    print('=' * 70)
    print('📋 所有测试账户验证结果')
    print('=' * 70)
    print()
    
    admin_count = 0
    editor_count = 0
    viewer_count = 0
    
    for username, password, expected_role in accounts:
        try:
            user = await auth_service.verify_user(username, password)
            if user:
                actual_role = user.get('role', '未知')
                status = '✅' if actual_role == expected_role else '⚠️'
                print(f'{status} {username:<12} - 角色: {actual_role:<10} - 邮箱: {user.get("email", "未知")}')
                if actual_role == 'admin':
                    admin_count += 1
                elif actual_role == 'editor':
                    editor_count += 1
                elif actual_role == 'viewer':
                    viewer_count += 1
            else:
                print(f'❌ {username:<12} - 验证失败')
        except Exception as e:
            print(f'❌ {username:<12} - 错误: {str(e)}')
    
    print()
    print('=' * 70)
    print(f'统计: Admin: {admin_count}, Editor: {editor_count}, Viewer: {viewer_count}')
    print('=' * 70)
    print()
    print('📝 测试账户信息汇总:')
    print('-' * 70)
    print()
    print('👑 Admin 角色账户:')
    print('   用户名: admin1       密码: admin123     邮箱: admin1@test.com')
    print('   用户名: admin2       密码: admin123     邮箱: admin2@test.com')
    print()
    print('✏️  Editor 角色账户:')
    print('   用户名: editor1      密码: editor123    邮箱: editor1@test.com')
    print('   用户名: editor2      密码: editor123    邮箱: editor2@test.com')
    print()
    print('👁️  Viewer 角色账户:')
    print('   用户名: viewer1      密码: viewer123    邮箱: viewer1@test.com')
    print('   用户名: viewer2      密码: viewer123    邮箱: viewer2@test.com')
    print()
    print('=' * 70)

if __name__ == "__main__":
    asyncio.run(verify_all_accounts())


