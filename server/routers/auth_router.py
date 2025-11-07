"""

Authentication Router - 认证路由模块
提供设备认证相关的 API 端点
"""
import secrets
import time
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Request
from starlette.requests import Request
from fastapi.responses import HTMLResponse, JSONResponse
from typing import Optional, Dict
from pydantic import BaseModel
import uuid

from services.auth_service import auth_service
from utils.logger import get_logger

logger = get_logger("routers.auth_router")

# Google OAuth imports
try:
    from google_auth_oauthlib.flow import Flow
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_OAUTH_AVAILABLE = True
except ImportError:
    GOOGLE_OAUTH_AVAILABLE = False
    logger.warning("Google OAuth libraries not installed. Google login will be disabled.")

router = APIRouter()

# Google OAuth 配置
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")  # 例如: http://localhost:57988/api/auth/google/callback
SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile']

# ================== Pydantic 模型 ==================

class DeviceAuthorizeRequest(BaseModel):
    """设备授权请求"""
    code: str
    username: str
    password: str

class RegisterRequest(BaseModel):
    """用户注册请求"""
    username: str
    email: str
    password: str
# 临时存储设备码和认证状态（生产环境应该使用数据库或 Redis）
device_codes: Dict[str, dict] = {}
auth_sessions: Dict[str, dict] = {}

# 设备码过期时间（10分钟）
DEVICE_CODE_EXPIRY = 600  # 秒


@router.post("/api/auth/register")
async def register_user(request: RegisterRequest):
    """
    用户注册
    创建新用户账户
    """
    username = request.username.strip()
    email = request.email.strip()
    password = request.password
    
    # 验证输入
    if not username or len(username) < 3:
        raise HTTPException(status_code=400, detail="用户名至少需要3个字符")
    
    if len(username) > 50:
        raise HTTPException(status_code=400, detail="用户名不能超过50个字符")
    
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="请输入有效的邮箱地址")
    
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少需要6个字符")
    
    if len(password) > 100:
        raise HTTPException(status_code=400, detail="密码不能超过100个字符")
    
    try:
        # 创建用户
        user_info = await auth_service.create_user(
            username=username,
            email=email,
            password=password,
            provider="local"
        )
        
        logger.info(f"用户注册成功: {username} ({email})")
        
        # 注册成功后自动登录
        token = await auth_service.create_token(user_info["id"])
        
        return {
            "status": "success",
            "message": "注册成功",
            "token": token,
            "user_info": user_info,
        }
    except ValueError as e:
        # 用户名或邮箱已存在
        error_msg = str(e)
        logger.warning(f"用户注册失败: {username} ({email}), 错误: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        logger.error(f"用户注册失败: {username} ({email}), 错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="注册失败，请稍后重试")


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
    使用 auth_service 的 refresh_token 方法，确保token在数据库中正确管理
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少授权令牌")
    
    token = auth_header.replace("Bearer ", "").strip()
    
    if not token:
        raise HTTPException(status_code=401, detail="授权令牌为空")
    
    # 使用 auth_service 刷新 token（这会验证旧token并创建新token）
    new_token = await auth_service.refresh_token(token)
    
    if not new_token:
        raise HTTPException(status_code=401, detail="令牌无效或已过期，请重新登录")
    
    logger.info(f"Token刷新成功: {token[:20]}... -> {new_token[:20]}...")
    
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
    通过用户名和密码验证用户身份，授权设备访问，并返回用户数据和token
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
    
    # 要求真正的用户验证，不允许自动注册
    if not user_info:
        logger.warning(f"登录失败: 用户名或密码错误 - {username}")
        raise HTTPException(status_code=401, detail="用户名或密码错误，请先注册账户")
    
    logger.info(f"用户登录成功: {user_info.get('username')}")
            
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
>>>>>>> 9ff23e8f5b2bb1d9cc9160a27651ae408b7a8b71
    
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


# ================== Google OAuth 路由 ==================

@router.get("/api/auth/google/start")
async def google_auth_start(request: Request):
    """
    启动 Google OAuth 认证流程
    返回 Google 授权 URL
    """
    if not GOOGLE_OAUTH_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google OAuth 未配置或依赖未安装")
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth 未配置，请设置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET")
    
    # 获取回调 URL
    base_url = str(request.base_url).rstrip('/')
    redirect_uri = GOOGLE_REDIRECT_URI or f"{base_url}/api/auth/google/callback"
    
    # 创建 OAuth flow
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    
    # 生成授权 URL
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    # 存储 state 到设备码中（用于验证回调）
    device_code = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(seconds=DEVICE_CODE_EXPIRY)
    
    device_codes[device_code] = {
        "code": device_code,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "expires_at": expires_at.isoformat(),
        "oauth_state": state,
        "oauth_flow": flow,  # 存储 flow 对象（实际应用中应使用 Redis 或数据库）
    }
    
    return {
        "status": "pending",
        "code": device_code,
        "auth_url": authorization_url,
        "expires_at": expires_at.isoformat(),
        "message": "请在新打开的浏览器窗口中完成 Google 认证",
    }


@router.get("/api/auth/google/callback")
async def google_auth_callback(
    code: str = Query(..., description="Google OAuth 授权码"),
    state: str = Query(..., description="OAuth state"),
    device_code: Optional[str] = Query(None, description="设备码（用于轮询）"),
    request: Request = None
):
    """
    Google OAuth 回调处理
    处理 Google 返回的授权码，创建或更新用户，并返回 token
    """
    if not GOOGLE_OAUTH_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google OAuth 未配置或依赖未安装")
    
    try:
        # 查找对应的设备码（通过 state 或 device_code）
        device_info = None
        if device_code and device_code in device_codes:
            device_info = device_codes[device_code]
            if device_info.get("oauth_state") != state:
                raise HTTPException(status_code=400, detail="State 不匹配")
        else:
            # 通过 state 查找
            for dc, di in device_codes.items():
                if di.get("oauth_state") == state:
                    device_code = dc
                    device_info = di
                    break
        
        if not device_info:
            raise HTTPException(status_code=400, detail="设备码无效或已过期")
        
        # 检查是否过期
        expires_at = datetime.fromisoformat(device_info["expires_at"])
        if datetime.now() > expires_at:
            del device_codes[device_code]
            raise HTTPException(status_code=400, detail="设备码已过期")
        
        # 获取 flow 对象
        flow = device_info.get("oauth_flow")
        if not flow:
            # 重新创建 flow
            base_url = str(request.base_url).rstrip('/')
            redirect_uri = GOOGLE_REDIRECT_URI or f"{base_url}/api/auth/google/callback"
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": GOOGLE_CLIENT_ID,
                        "client_secret": GOOGLE_CLIENT_SECRET,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [redirect_uri],
                    }
                },
                scopes=SCOPES,
                redirect_uri=redirect_uri
            )
            flow.fetch_token(code=code)
        else:
            # 使用存储的 flow
            flow.fetch_token(code=code)
        
        # 获取用户信息
        credentials = flow.credentials
        request_session = google_requests.Request()
        id_info = id_token.verify_oauth2_token(
            credentials.id_token, request_session, GOOGLE_CLIENT_ID
        )
        
        google_id = id_info.get('sub')
        email = id_info.get('email')
        name = id_info.get('name', email.split('@')[0])
        picture = id_info.get('picture')
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="无法获取 Google 用户信息")
        
        # 创建或更新用户
        try:
            user_info = await auth_service.create_or_update_google_user(
                google_id=google_id,
                email=email,
                name=name,
                picture=picture
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # 创建 token
        token = await auth_service.create_token(user_info["id"])
        
        # 生成 session
        session_id = str(uuid.uuid4())
        auth_sessions[session_id] = {
            "token": token,
            "user_info": user_info,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        }
        
        # 更新设备码状态
        device_codes[device_code]["status"] = "authorized"
        device_codes[device_code]["session_id"] = session_id
        
        logger.info(f"Google OAuth 认证成功: email={email}, google_id={google_id}")
        
        # 返回成功页面或 JSON 响应
        if request and request.headers.get("accept", "").startswith("text/html"):
            return HTMLResponse(
                content="""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Google 登录成功</title>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        .success { color: green; }
                    </style>
                </head>
                <body>
                    <h1 class="success">✓ Google 登录成功</h1>
                    <p>您可以关闭此窗口</p>
                    <script>
                        // 尝试通知父窗口
                        if (window.opener) {
                            window.opener.postMessage({type: 'google_auth_success'}, '*');
                        }
                        setTimeout(() => window.close(), 2000);
                    </script>
                </body>
                </html>
                """
            )
        
        return {
            "status": "success",
            "message": "Google 认证成功",
            "code": device_code,
            "token": token,
            "user_info": user_info,
        }
        
    except ValueError as e:
        logger.error(f"Google OAuth 错误: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Google OAuth 处理错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Google 认证处理失败: {str(e)}")