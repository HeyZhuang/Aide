"""
认证路由模块 - 实现设备认证功能
用于二次开发新产品时的本地认证服务
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict
from services.auth_service import auth_service

router = APIRouter(prefix="/api/device")


class DeviceAuthRequest(BaseModel):
    pass


class DeviceAuthResponse(BaseModel):
    status: str
    code: str
    expires_at: str
    message: str


class DeviceAuthPollResponse(BaseModel):
    status: str  # 'pending', 'authorized', 'expired', 'error'
    message: Optional[str] = None
    token: Optional[str] = None
    user_info: Optional[Dict] = None


class RefreshTokenResponse(BaseModel):
    new_token: str


@router.post("/auth", response_model=DeviceAuthResponse)
async def start_device_auth():
    """
    启动设备认证流程
    生成设备码供用户扫码或访问认证页面
    """
    # 使用数据库存储设备码
    device_code_info = await auth_service.create_device_code()
    
    return DeviceAuthResponse(
        status="pending",
        code=device_code_info["code"],
        expires_at=device_code_info["expires_at"],
        message="请在浏览器中完成登录"
    )


@router.get("/poll", response_model=DeviceAuthPollResponse)
async def poll_device_auth(code: str = Query(..., description="设备码")):
    """
    轮询设备认证状态
    前端定期调用此接口检查用户是否已完成认证
    """
    device_code_info = await auth_service.get_device_code(code)
    
    if not device_code_info:
        return DeviceAuthPollResponse(
            status="error",
            message="设备码不存在或已过期"
        )
    
    # 检查是否已授权
    if device_code_info["status"] == "authorized" and device_code_info["user_id"]:
        # 获取用户信息
        user_info_dict = await auth_service.get_user_by_id(device_code_info["user_id"])
        
        if not user_info_dict:
            return DeviceAuthPollResponse(
                status="error",
                message="用户不存在"
            )
        
        # 生成token
        token = await auth_service.create_token(device_code_info["user_id"])
        
        # 删除设备码
        from services.db_service import db_service
        import aiosqlite
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("DELETE FROM device_codes WHERE code = ?", (code,))
            await db.commit()
        
        return DeviceAuthPollResponse(
            status="authorized",
            token=token,
            user_info={
                "id": user_info_dict["id"],
                "username": user_info_dict["username"],
                "email": user_info_dict["email"],
                "image_url": user_info_dict.get("image_url"),
                "created_at": user_info_dict["created_at"],
            },
            message="认证成功"
        )
    
    # 仍在等待中
    return DeviceAuthPollResponse(
        status="pending",
        message="等待用户完成认证"
    )


@router.get("/auth/device")
async def auth_device_page(code: str = Query(..., description="设备码")):
    """
    设备认证页面 - 显示登录表单
    """
    device_code_info = await auth_service.get_device_code(code)
    
    if not device_code_info:
        return HTMLResponse("""
        <html>
            <head>
                <title>认证失败</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
                           text-align: center; padding: 50px; background: #f5f5f5; }
                    .container { max-width: 400px; margin: 0 auto; background: white; 
                                 padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #e74c3c; margin-bottom: 20px; }
                    p { color: #666; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>认证失败</h1>
                    <p>设备码不存在或已过期</p>
                    <p style="margin-top: 20px;">请返回应用重新获取设备码</p>
                </div>
            </body>
        </html>
        """, status_code=404)
    
    # 显示登录表单
    login_html = """
    <!DOCTYPE html>
    <html>
        <head>
            <title>登录 - Aide</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ box-sizing: border-box; margin: 0; padding: 0; }}
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }}
                .container { 
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    padding: 40px;
                    max-width: 400px;
                    width: 100%;
                }}
                .logo { text-align: center; margin-bottom: 30px; }
                .logo h1 { color: #333; font-size: 28px; margin-bottom: 10px; }
                .logo p { color: #666; font-size: 14px; }
                .form-group { margin-bottom: 20px; }
                .form-group label { 
                    display: block; 
                    margin-bottom: 8px; 
                    color: #333; 
                    font-weight: 500; 
                    font-size: 14px;
                }}
                .form-group input { 
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e0e0e0;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: border-color 0.3s;
                }}
                .form-group input:focus { 
                    outline: none; 
                    border-color: #667eea; 
                }}
                .error { 
                    color: #e74c3c; 
                    font-size: 13px; 
                    margin-top: 5px; 
                    display: none;
                }
                .error.show {{ display: block; }}
                .btn { 
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }}
                .btn:hover { 
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }
                .btn:active { transform: translateY(0); }
                .btn:disabled { 
                    opacity: 0.6; 
                    cursor: not-allowed; 
                    transform: none;
                }
                .success { 
                    text-align: center; 
                    padding: 30px; 
                }}
                .success h1 { 
                    color: #27ae60; 
                    font-size: 24px; 
                    margin-bottom: 15px; 
                }}
                .success p { 
                    color: #666; 
                    line-height: 1.6; 
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div id="loginForm">
                    <div class="logo">
                        <h1>登录 Aide</h1>
                        <p>请输入您的账号信息</p>
                    </div>
                    <form id="authForm" onsubmit="handleLogin(event)">
                        <div class="form-group">
                            <label for="username">用户名或邮箱</label>
                            <input type="text" id="username" name="username" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label for="password">密码</label>
                            <input type="password" id="password" name="password" required autocomplete="current-password">
                        </div>
                        <div class="error" id="errorMessage"></div>
                        <button type="submit" class="btn" id="submitBtn">登录</button>
                    </form>
                </div>
                <div id="successMessage" style="display: none;" class="success">
                    <h1>✓ 认证成功</h1>
                    <p>设备已成功授权，您可以关闭此页面</p>
                    <p style="margin-top: 15px; color: #999; font-size: 13px;">返回应用继续使用</p>
                </div>
            </div>
            <script>
                const code = '{code}';
                
                async function handleLogin(event) {{
                    event.preventDefault();
                    
                    const username = document.getElementById('username').value;
                    const password = document.getElementById('password').value;
                    const errorDiv = document.getElementById('errorMessage');
                    const submitBtn = document.getElementById('submitBtn');
                    
                    // 禁用按钮
                    submitBtn.disabled = true;
                    submitBtn.textContent = '登录中...';
                    errorDiv.classList.remove('show');
                    
                    try {{
                        const response = await fetch('/api/device/authorize', {{
                            method: 'POST',
                            headers: {{
                                'Content-Type': 'application/json',
                            }},
                            body: JSON.stringify({{
                                code: code,
                                username: username,
                                password: password
                            }})
                        }});
                        
                        const data = await response.json();
                        
                        if (response.ok) {{
                            // 登录成功
                            document.getElementById('loginForm').style.display = 'none';
                            document.getElementById('successMessage').style.display = 'block';
                        }} else {{
                            // 显示错误
                            errorDiv.textContent = data.detail || '登录失败，请检查用户名和密码';
                            errorDiv.classList.add('show');
                            submitBtn.disabled = false;
                            submitBtn.textContent = '登录';
                        }}
                    }} catch (error) {{
                        errorDiv.textContent = '网络错误，请重试';
                        errorDiv.classList.add('show');
                        submitBtn.disabled = false;
                        submitBtn.textContent = '登录';
                    }}
                }}
            </script>
        </body>
    </html>
    """.format(code=code)
    return HTMLResponse(login_html)


class AuthorizeRequest(BaseModel):
    code: str
    username: str
    password: str


@router.post("/authorize")
async def authorize_device(request: AuthorizeRequest):
    """
    授权设备（API接口）
    验证用户登录信息并授权设备
    
    注意：为了便于二次开发，如果用户不存在，会自动创建用户（仅用于本地开发）
    """
    # 验证设备码
    device_code_info = await auth_service.get_device_code(request.code)
    if not device_code_info:
        raise HTTPException(status_code=404, detail="设备码不存在或已过期")
    
    # 验证用户登录
    user_info = await auth_service.verify_user(request.username, request.password)
    
    # 如果用户不存在，自动创建（仅用于本地开发）
    if not user_info:
        try:
            # 尝试创建新用户（如果用户名/邮箱已存在会失败）
            email = request.username if "@" in request.username else f"{request.username}@local.dev"
            user_info = await auth_service.create_user(
                username=request.username,
                email=email,
                password=request.password
            )
        except ValueError as e:
            # 用户名或邮箱已存在，但密码错误
            raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    # 授权设备码
    success = await auth_service.authorize_device_code(request.code, user_info["id"])
    if not success:
        raise HTTPException(status_code=400, detail="授权失败")
    
    # 创建token并返回用户信息
    token = await auth_service.create_token(user_info["id"])
    
    return {
        "status": "success",
        "message": "设备已授权",
        "token": token,
        "user_info": {
            "id": user_info["id"],
            "username": user_info["username"],
            "email": user_info["email"],
            "image_url": user_info.get("image_url"),
        }
    }


@router.get("/refresh-token", response_model=RefreshTokenResponse)
async def refresh_token(request: Request):
    """
    刷新访问token
    """
    # 从Authorization header中提取token
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        raise HTTPException(status_code=401, detail="缺少Authorization header")
    
    # 使用数据库验证和刷新token
    new_token = await auth_service.refresh_token(token)
    if not new_token:
        raise HTTPException(status_code=401, detail="Token无效或已过期")
    
    return RefreshTokenResponse(new_token=new_token)


@router.get("/auth-status")
async def get_auth_status(token: str = Query(..., description="访问token")):
    """
    获取认证状态（用于验证token）
    """
    user_info = await auth_service.verify_token(token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Token无效或已过期")
    
    return {
        "status": "logged_in",
        "is_logged_in": True,
        "user_info": {
            "id": user_info["user_id"],
            "username": user_info["username"],
            "email": user_info["email"],
            "image_url": user_info.get("image_url"),
        }
    }

