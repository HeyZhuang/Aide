"""
用户管理系统 API 测试脚本
演示完整的 CRUD 操作流程
"""
import requests
import json

# API 基础URL
BASE_URL = "http://localhost:8000"

def print_response(title, response):
    """格式化打印响应"""
    print(f"\n{'='*50}")
    print(f"{title}")
    print(f"{'='*50}")
    print(f"状态码: {response.status_code}")
    try:
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"响应: {response.text}")


def test_user_crud():
    """测试用户 CRUD 操作"""
    
    # 1. 用户注册
    print("\n\n🔹 1. 用户注册")
    register_data = {
        "username": "testuser001",
        "email": "testuser001@example.com",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    print_response("注册新用户", response)
    
    # 2. 用户登录
    print("\n\n🔹 2. 用户登录")
    login_data = {
        "username": "testuser001",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print_response("用户登录", response)
    
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. 获取当前用户信息
        print("\n\n🔹 3. 获取当前用户信息")
        response = requests.get(f"{BASE_URL}/api/users/me", headers=headers)
        print_response("当前用户信息", response)
        
        user_id = response.json()["user"]["id"]
        
        # 4. 根据ID获取用户信息
        print("\n\n🔹 4. 根据ID获取用户")
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        print_response("根据ID获取用户", response)
        
        # 5. 获取用户列表
        print("\n\n🔹 5. 获取用户列表")
        response = requests.get(f"{BASE_URL}/api/users?skip=0&limit=10", headers=headers)
        print_response("用户列表", response)
        
        # 6. 搜索用户
        print("\n\n🔹 6. 搜索用户")
        response = requests.get(f"{BASE_URL}/api/users/search?keyword=test&limit=10", headers=headers)
        print_response("搜索用户", response)
        
        # 7. 更新用户信息
        print("\n\n🔹 7. 更新用户信息")
        update_data = {
            "username": "testuser_updated",
            "image_url": "https://example.com/avatar.jpg"
        }
        response = requests.put(f"{BASE_URL}/api/users/me", json=update_data, headers=headers)
        print_response("更新用户信息", response)
        
        # 8. 修改密码
        print("\n\n🔹 8. 修改密码")
        password_data = {
            "old_password": "password123",
            "new_password": "newpassword456"
        }
        response = requests.put(f"{BASE_URL}/api/users/me/password", json=password_data, headers=headers)
        print_response("修改密码", response)
        
        # 9. 用登出
        print("\n\n🔹 9. 用户登出")
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        print_response("用户登出", response)
        
        # 10. 用新密码重新登录
        print("\n\n🔹 10. 用新密码重新登录")
        login_data_new = {
            "username": "testuser_updated",
            "password": "newpassword456"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data_new)
        print_response("新密码登录", response)
        
        if response.status_code == 200:
            new_token = response.json()["token"]
            new_headers = {"Authorization": f"Bearer {new_token}"}
            
            # 11. 删除用户账号
            print("\n\n🔹 11. 删除用户账号")
            response = requests.delete(f"{BASE_URL}/api/users/me", headers=new_headers)
            print_response("删除用户", response)


def test_error_cases():
    """测试错误情况处理"""
    
    print("\n\n" + "="*60)
    print("错误情况测试")
    print("="*60)
    
    # 1. 重复注册
    print("\n\n🔸 1. 重复注册相同用户名")
    register_data = {
        "username": "testuser001",
        "email": "test001@example.com",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    print_response("重复注册", response)
    
    # 2. 错误的密码登录
    print("\n\n🔸 2. 错误的密码登录")
    login_data = {
        "username": "testuser001",
        "password": "wrongpassword"
    }
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    print_response("错误密码登录", response)
    
    # 3. 未认证访问
    print("\n\n🔸 3. 未认证访问受保护接口")
    response = requests.get(f"{BASE_URL}/api/users/me")
    print_response("未认证访问", response)
    
    # 4. 无效token访问
    print("\n\n🔸 4. 无效token访问")
    headers = {"Authorization": "Bearer invalid_token_123456"}
    response = requests.get(f"{BASE_URL}/api/users/me", headers=headers)
    print_response("无效token", response)


if __name__ == "__main__":
    print("\n\n" + "🚀"*30)
    print("用户管理系统 CRUD 完整测试")
    print("🚀"*30)
    
    try:
        # 正常流程测试
        test_user_crud()
        
        # 错误情况测试
        test_error_cases()
        
        print("\n\n" + "✅"*30)
        print("测试完成！")
        print("✅"*30)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ 错误: 无法连接到服务器")
        print("请确保后端服务正在运行: python server/main.py")
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {str(e)}")
