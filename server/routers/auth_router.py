"""

Authentication Router - 认证路由模块
提供设备认证相关的 API 端点
"""
import secrets
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Request
from starlette.requests import Request
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional, Dict
import uuid

router = APIRouter()

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
async def auth_device_page(code: str = Query(..., description="设备认证码"), request: Request = None):
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
    
    # 显示认证页面（简化版本，实际应该包含真实的认证逻辑）
    # 这里提供一个简单的确认按钮，实际应用中应该调用真实的认证服务
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>设备认证</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }}
            .container {{
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
            }}
            h1 {{
                color: #333;
                margin-bottom: 20px;
            }}
            p {{
                color: #666;
                margin-bottom: 30px;
            }}
            button {{
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 30px;
                font-size: 16px;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            }}
            button:hover {{
                background: #5568d3;
            }}
            .code {{
                font-family: monospace;
                background: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                margin: 20px 0;
                word-break: break-all;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>设备认证</h1>
            <p>请确认授权此设备访问您的账户</p>
            <div class="code">设备码: {code[:8]}...</div>
            <button onclick="authorize()">确认授权</button>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
                此页面将在认证后自动关闭
            </p>
        </div>
        <script>
            async function authorize() {{
                try {{
                    const response = await fetch('/api/device/authorize?code={code}', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                    }});
                    
                    if (response.ok) {{
                        document.body.innerHTML = `
                            <div class="container">
                                <h1 style="color: green;">✓ 认证成功</h1>
                                <p>您可以关闭此窗口</p>
                            </div>
                        `;
                    }} else {{
                        alert('认证失败，请重试');
                    }}
                }} catch (error) {{
                    console.error('Error:', error);
                    alert('认证过程中发生错误');
                }}
            }}
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
    
    #TODO：此处方便测试将逻辑用自动注册代替
    #  if not user_info:
    #     logger.warning(f"登录失败: {username}")
    #     raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    # logger.info(f"用户登录成功: {user_info.get('username')}")
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