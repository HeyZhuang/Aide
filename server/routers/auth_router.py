"""

Authentication Router - 认证路由模块
提供设备认证相关的 API 端点
"""
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Request, Header
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict
import uuid

from services.auth_service import auth_service
from utils.logger import get_logger

logger = get_logger("routers.auth_router")

router = APIRouter()

# 请求模型
class DeviceAuthorizeRequest(BaseModel):
    """设备授权请求模型"""
    code: str
    username: str
    password: str

# 临时存储设备码和认证状态（生产环境应该使用数据库或 Redis）
device_codes: Dict[str, dict] = {}
auth_sessions: Dict[str, dict] = {}

# 设备码过期时间（10分钟）
DEVICE_CODE_EXPIRY = 600  # 秒


@router.post("/api/device/auth")
async def start_device_auth():
    """
    启动设备认证流程
    生成设备码供用户认证使用
    """
    # 生成设备码
    device_code = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(seconds=DEVICE_CODE_EXPIRY)
    
    # 存储设备码信息
    device_codes[device_code] = {
        "code": device_code,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return {
        "status": "pending",
        "code": device_code,
        "expires_at": expires_at.isoformat(),
        "message": "请在新打开的浏览器窗口中完成认证",
    }


@router.get("/api/device/poll")
async def poll_device_auth(code: str = Query(..., description="设备认证码")):
    """
    轮询设备认证状态
    检查用户是否已完成认证
    """
    if code not in device_codes:
        return {
            "status": "error",
            "message": "设备码不存在或已过期",
        }
    
    device_info = device_codes[code]
    expires_at = datetime.fromisoformat(device_info["expires_at"])
    
    # 检查是否过期
    if datetime.now() > expires_at:
        del device_codes[code]
        return {
            "status": "expired",
            "message": "设备码已过期，请重新生成",
        }
    
    # 检查认证状态
    if device_info["status"] == "authorized":
        # 认证成功，返回 token 和用户信息
        session_id = device_info.get("session_id")
        if session_id and session_id in auth_sessions:
            session = auth_sessions[session_id]
            # 清理设备码
            del device_codes[code]
            
            return {
                "status": "authorized",
                "token": session.get("token"),
                "user_info": session.get("user_info"),
                "message": "认证成功",
            }
    
    # 仍在等待认证
    return {
        "status": "pending",
        "message": "等待用户完成认证",
    }


@router.get("/api/device/refresh-token")
async def refresh_token(request: Request):
    """
    刷新访问令牌
    需要 Authorization header 中的 Bearer token
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少授权令牌")
    
    token = auth_header.replace("Bearer ", "")
    
    # 查找对应的会话
    session = None
    for session_id, session_data in auth_sessions.items():
        if session_data.get("token") == token:
            session = session_data
            break
    
    if not session:
        raise HTTPException(status_code=401, detail="令牌无效或已过期")
    
    # 生成新 token（实际应用中应该使用 JWT 等更安全的方式）
    new_token = secrets.token_urlsafe(32)
    session["token"] = new_token
    session["updated_at"] = datetime.now().isoformat()
    
    return {
        "new_token": new_token,
    }


@router.get("/auth/device")
async def auth_device_page(code: str = Query(..., description="设备认证码")):
    """
    设备认证页面
    用户在此页面完成认证
    """
    if code not in device_codes:
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>认证失败</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: red; }
                </style>
            </head>
            <body>
                <h1 class="error">认证失败</h1>
                <p>设备码无效或已过期</p>
            </body>
            </html>
            """,
            status_code=400
        )
    
    device_info = device_codes[code]
    expires_at = datetime.fromisoformat(device_info["expires_at"])
    
    if datetime.now() > expires_at:
        del device_codes[code]
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>认证过期</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: orange; }
                </style>
            </head>
            <body>
                <h1 class="error">认证已过期</h1>
                <p>设备码已过期，请重新生成</p>
            </body>
            </html>
            """,
            status_code=400
        )
    
    # 如果已经认证，显示成功页面
    if device_info["status"] == "authorized":
        return HTMLResponse(
            content="""
            <!DOCTYPE html>
            <html>
            <head>
                <title>认证成功</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .success { color: green; }
                </style>
            </head>
            <body>
                <h1 class="success">✓ 认证成功</h1>
                <p>您可以关闭此窗口</p>
            </body>
            </html>
            """
        )
    
    # 显示登录表单页面
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>设备认证 - 登录</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {{
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }}
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }}
            .container {{
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                width: 100%;
                max-width: 420px;
            }}
            h1 {{
                color: #333;
                margin-bottom: 10px;
                font-size: 24px;
                text-align: center;
            }}
            .subtitle {{
                color: #666;
                margin-bottom: 30px;
                text-align: center;
                font-size: 14px;
            }}
            .code-display {{
                font-family: 'Courier New', monospace;
                background: #f5f7fa;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 25px;
                text-align: center;
                font-size: 13px;
                color: #555;
                border: 1px solid #e1e8ed;
            }}
            .form-group {{
                margin-bottom: 20px;
            }}
            label {{
                display: block;
                margin-bottom: 8px;
                color: #444;
                font-size: 14px;
                font-weight: 500;
            }}
            input {{
                width: 100%;
                padding: 12px 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.3s;
            }}
            input:focus {{
                outline: none;
                border-color: #667eea;
            }}
            button {{
                width: 100%;
                background: #667eea;
                color: white;
                border: none;
                padding: 14px;
                font-size: 16px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.3s;
                font-weight: 500;
            }}
            button:hover {{
                background: #5568d3;
            }}
            button:disabled {{
                background: #ccc;
                cursor: not-allowed;
            }}
            .error {{
                color: #e74c3c;
                font-size: 13px;
                margin-top: 10px;
                text-align: center;
                display: none;
            }}
            .success {{
                text-align: center;
                color: #27ae60;
            }}
            .note {{
                font-size: 12px;
                color: #999;
                margin-top: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 设备认证</h1>
            <p class="subtitle">请登录以授权此设备访问您的账户</p>
            <div class="code-display">设备码: {code[:8]}...</div>
            
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">用户名或邮箱</label>
                    <input 
                        type="text" 
                        id="username" 
                        name="username" 
                        required 
                        autocomplete="username"
                        placeholder="输入您的用户名或邮箱"
                    >
                </div>
                
                <div class="form-group">
                    <label for="password">密码</label>
                    <input 
                        type="password" 
                        id="password" 
                        name="password" 
                        required 
                        autocomplete="current-password"
                        placeholder="输入您的密码"
                    >
                </div>
                
                <button type="submit" id="loginBtn">登录并授权</button>
                <div class="error" id="errorMsg"></div>
            </form>
            
            <p class="note">登录成功后将自动授权设备并关闭此页面</p>
        </div>
        
        <script>
            const form = document.getElementById('loginForm');
            const loginBtn = document.getElementById('loginBtn');
            const errorMsg = document.getElementById('errorMsg');
            
            form.addEventListener('submit', async (e) => {{
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                loginBtn.disabled = true;
                loginBtn.textContent = '登录中...';
                errorMsg.style.display = 'none';
                
                try {{
                    const response = await fetch('/api/device/authorize', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify({{
                            code: '{code}',
                            username: username,
                            password: password
                        }})
                    }});
                    
                    const data = await response.json();
                    
                    if (response.ok && data.status === 'success') {{
                        document.body.innerHTML = `
                            <div class="container">
                                <div class="success">
                                    <h1 style="color: #27ae60; font-size: 48px;">✓</h1>
                                    <h2 style="color: #27ae60;">认证成功</h2>
                                    <p style="color: #666; margin-top: 15px;">您可以关闭此窗口</p>
                                </div>
                            </div>
                        `;
                    }} else {{
                        errorMsg.textContent = data.detail || data.message || '登录失败，请检查用户名和密码';
                        errorMsg.style.display = 'block';
                        loginBtn.disabled = false;
                        loginBtn.textContent = '登录并授权';
                    }}
                }} catch (error) {{
                    console.error('Error:', error);
                    errorMsg.textContent = '网络错误，请稍后重试';
                    errorMsg.style.display = 'block';
                    loginBtn.disabled = false;
                    loginBtn.textContent = '登录并授权';
                }}
            }});
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)


@router.post("/api/device/authorize")
async def authorize_device(request: DeviceAuthorizeRequest):
    """
    确认设备认证
    通过用户名和密码验证用户身份，授权设备访问
    如果用户不存在，自动注册新用户（便于测试）
    """
    code = request.code
    username = request.username
    password = request.password
    
    # 验证设备码
    if code not in device_codes:
        raise HTTPException(status_code=400, detail="设备码无效或已过期")
    
    device_info = device_codes[code]
    expires_at = datetime.fromisoformat(device_info["expires_at"])
    
    if datetime.now() > expires_at:
        del device_codes[code]
        raise HTTPException(status_code=400, detail="设备码已过期")
    
    # 验证用户名和密码
    user_info = await auth_service.verify_user(username, password)
    
    # 如果用户不存在，自动注册
    if not user_info:
        try:
            # 生成默认邮箱（如果用户名不是邮箱格式）
            email = username if "@" in username else f"{username}@example.com"
            
            # 注册新用户
            user_info = await auth_service.create_user(
                username=username if "@" not in username else username.split("@")[0],
                email=email,
                password=password
            )
            logger.info(f"自动注册新用户: {user_info.get('username')}")
        except ValueError as e:
            # 如果注册失败（例如用户名已存在但密码错误）
            logger.warning(f"注册失败: {username}, 错误: {str(e)}")
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        except Exception as e:
            logger.error(f"注册用户失败: {username}, 错误: {str(e)}")
            raise HTTPException(status_code=500, detail="注册失败，请稍后重试")
    else:
        logger.info(f"用户登录成功: {user_info.get('username')}")
    
    # 为用户创建 token
    token = await auth_service.create_token(user_info["id"])
    
    # 生成 session
    session_id = str(uuid.uuid4())
    
    # 存储会话信息
    auth_sessions[session_id] = {
        "token": token,
        "user_info": user_info,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    
    # 更新设备码状态
    device_codes[code]["status"] = "authorized"
    device_codes[code]["session_id"] = session_id
    
    logger.info(f"设备认证成功: code={code[:8]}..., user={user_info.get('username')}")
    
    return {
        "status": "success",
        "message": "设备认证成功",
        "code": code,
        "token": token,
        "user_info": user_info,
    }