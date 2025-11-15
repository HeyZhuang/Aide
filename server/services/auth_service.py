"""
用户认证服务
处理用户注册、登录、密码验证等
"""
import secrets
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from services.db_service import db_service
from utils.logger import get_logger

logger = get_logger("services.auth_service")

# Token过期时间（秒）
TOKEN_EXPIRY = 86400 * 7  # 7天
DEVICE_CODE_EXPIRY = 600  # 10分钟


class AuthService:
    """用户认证服务"""
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """使用SHA-256哈希密码"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def _verify_password(password: str, password_hash: str) -> bool:
        """验证密码"""
        return AuthService._hash_password(password) == password_hash
    
    async def create_user(self, username: str, email: str, password: str, provider: str = "local", google_id: Optional[str] = None, image_url: Optional[str] = None, role: str = "viewer") -> Dict[str, Any]:
        """创建新用户"""
        user_id = str(uuid.uuid4())
        password_hash = self._hash_password(password) if password else ""
        
        try:
            user_data = await db_service.create_user(
                user_id=user_id,
                username=username,
                email=email,
                password_hash=password_hash,
                provider=provider,
                google_id=google_id,
                image_url=image_url,
                role=role
            )
            
            logger.info(f"Created user: {username} ({email}) with provider: {provider}")
            
            return {
                "id": user_id,
                "username": username,
                "email": email,
                "provider": provider,
                "image_url": image_url,
                "role": role,
                "created_at": user_data.get("created_at"),
            }
        except ValueError as e:
            raise
    
    async def get_user_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """根据Google ID获取用户信息"""
        return await db_service.get_user_by_google_id(google_id)
    
    async def create_or_update_google_user(self, google_id: str, email: str, name: str, picture: Optional[str] = None) -> Dict[str, Any]:
        """创建或更新Google用户"""
        # 先检查是否已存在
        existing_user = await self.get_user_by_google_id(google_id)
        
        if existing_user:
            # 更新用户信息（可能Google账户信息有变化）
            await db_service.update_user(
                existing_user["id"],
                email=email,
                image_url=picture
            )
            
            logger.info(f"Updated Google user: {email} (google_id: {google_id})")
            return {
                "id": existing_user["id"],
                "username": existing_user["username"],
                "email": email,
                "image_url": picture,
                "provider": "google",
                "google_id": google_id,
                "role": existing_user.get("role", "user"),
                "created_at": existing_user["created_at"],
            }
        
        # 检查邮箱是否已被其他账户使用
        existing_email_user = await db_service.get_user_by_email(email)
        
        if existing_email_user:
            # 如果邮箱已存在但未关联Google，则关联Google ID
            if not existing_email_user.get("google_id"):
                await db_service.update_user(
                    existing_email_user["id"],
                    google_id=google_id,
                    provider="google",
                    image_url=picture
                )
                
                logger.info(f"Linked Google account to existing user: {email}")
                return {
                    "id": existing_email_user["id"],
                    "username": existing_email_user["username"],
                    "email": email,
                    "image_url": picture,
                    "provider": "google",
                    "google_id": google_id,
                }
            else:
                # 邮箱已关联其他Google账户
                raise ValueError("该邮箱已关联其他Google账户")
        
        # 创建新用户
        # 使用邮箱前缀作为用户名，如果冲突则添加随机后缀
        base_username = email.split("@")[0]
        username = base_username
        attempts = 0
        while attempts < 10:
            try:
                return await self.create_user(
                    username=username,
                    email=email,
                    password="",  # Google用户不需要密码
                    provider="google",
                    google_id=google_id,
                    image_url=picture
                )
            except ValueError as e:
                if "用户名已存在" in str(e):
                    username = f"{base_username}_{secrets.token_hex(4)}"
                    attempts += 1
                else:
                    raise
        
        raise ValueError("无法创建用户，请稍后重试")
    
    async def verify_user(self, username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
        """验证用户登录"""
        # 先尝试用户名
        user = await db_service.get_user_by_username(username_or_email)
        if not user:
            # 再尝试邮箱
            user = await db_service.get_user_by_email(username_or_email)
        
        if not user:
            return None
        
        if not self._verify_password(password, user["password_hash"]):
            return None
        
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "image_url": user.get("image_url"),
            "role": user.get("role", "user"),
            "created_at": user["created_at"],
        }
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户信息（用于认证流程）"""
        return await db_service.get_user_by_id(user_id)
    
    async def create_device_code(self) -> Dict[str, Any]:
        """创建设备码"""
        code = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(seconds=DEVICE_CODE_EXPIRY)
        created_at = datetime.utcnow()
        
        await db_service.create_device_code(
            code=code,
            status="pending",
            expires_at=expires_at.isoformat(),
            created_at=created_at.isoformat()
        )
        
        return {
            "code": code,
            "expires_at": expires_at.isoformat(),
        }
    
    async def get_device_code(self, code: str) -> Optional[Dict[str, Any]]:
        """获取设备码信息"""
        device_code = await db_service.get_device_code(code)
        
        if not device_code:
            return None
        
        expires_at = device_code["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        elif hasattr(expires_at, 'isoformat'):
            pass  # 已经是 datetime 对象
        else:
            expires_at = datetime.fromisoformat(str(expires_at))
        
        if datetime.utcnow() > expires_at:
            # 过期，删除
            await db_service.delete_device_code(code)
            return None
        
        return device_code
    
    async def authorize_device_code(self, code: str, user_id: str) -> bool:
        """授权设备码"""
        # 检查设备码是否存在且未过期
        device_code = await self.get_device_code(code)
        if not device_code:
            return False
        
        # 更新设备码状态
        await db_service.update_device_code(code, "authorized", user_id)
        
        return True
    
    async def create_token(self, user_id: str) -> str:
        """创建访问token"""
        token = secrets.token_urlsafe(64)
        expires_at = datetime.utcnow() + timedelta(seconds=TOKEN_EXPIRY)
        created_at = datetime.utcnow()
        
        logger.debug(f"创建token: user_id={user_id}, expires_at={expires_at.isoformat()}, token={token[:20]}...")
        
        await db_service.create_auth_token(
            token=token,
            user_id=user_id,
            expires_at=expires_at.isoformat(),
            created_at=created_at.isoformat()
        )
        
        logger.info(f"Token创建成功: user_id={user_id}, token={token[:20]}..., expires_at={expires_at.isoformat()}")
        return token
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证token并返回用户信息"""
        logger.debug(f"验证token: {token[:20]}...")
        
        token_data = await db_service.get_auth_token(token)
        
        if not token_data:
            logger.warning(f"Token未找到: {token[:20]}...")
            return None
        
        expires_at = token_data["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        elif hasattr(expires_at, 'isoformat'):
            pass  # 已经是 datetime 对象
        else:
            expires_at = datetime.fromisoformat(str(expires_at))
        
        now = datetime.utcnow()
        
        logger.debug(f"Token过期时间: {expires_at}, 当前时间: {now}, 是否过期: {now > expires_at}")
        
        if now > expires_at:
            # 过期，删除token
            logger.warning(f"Token已过期: {token[:20]}..., 过期时间: {expires_at}")
            await db_service.delete_auth_token(token)
            return None
        
        role = token_data.get("role", "user")
        logger.debug(f"Token验证成功: user_id={token_data['user_id']}, username={token_data['username']}, role={role}")
        return {
            "user_id": token_data["user_id"],
            "username": token_data["username"],
            "email": token_data["email"],
            "image_url": token_data.get("image_url"),
            "role": role,
        }
    
    async def refresh_token(self, old_token: str) -> Optional[str]:
        """刷新token"""
        user_info = await self.verify_token(old_token)
        if not user_info:
            return None
        
        # 删除旧token
        await db_service.delete_auth_token(old_token)
        
        # 创建新token
        return await self.create_token(user_info["user_id"])
    
    async def delete_token(self, token: str):
        """删除token（登出）"""
        await db_service.delete_auth_token(token)
    
    async def cleanup_expired_tokens(self):
        """清理过期的token和设备码"""
        await db_service.cleanup_expired_tokens()
        await db_service.cleanup_expired_device_codes()


# 创建单例
auth_service = AuthService()
