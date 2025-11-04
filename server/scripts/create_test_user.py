"""
创建测试用户脚本
用于初始化测试用户账号
"""
import asyncio
import sys
import os

# 添加server目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import auth_service


async def create_test_user():
    """创建测试用户"""
    try:
        # 创建测试用户
        user = await auth_service.create_user(
            username="admin",
            email="admin@test.com",
            password="admin123"
        )
        print(f"✅ 测试用户创建成功！")
        print(f"   用户名: {user['username']}")
        print(f"   邮箱: {user['email']}")
        print(f"   密码: admin123")
        print(f"\n⚠️  请在生产环境中修改默认密码！")
    except ValueError as e:
        if "已存在" in str(e):
            print(f"ℹ️  用户已存在: {str(e)}")
        else:
            print(f"❌ 创建用户失败: {str(e)}")
    except Exception as e:
        print(f"❌ 发生错误: {str(e)}")


if __name__ == "__main__":
    asyncio.run(create_test_user())

