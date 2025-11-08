"""
用户认证服务
处理用户注册、登录、密码验证等
"""
import secrets
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import aiosqlite
import sqlite3
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
        now = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(db_service.db_path) as db:
            try:
                # 构建 SQL 查询，根据是否有 google_id 来决定字段
                if google_id:
                    await db.execute("""
                        INSERT INTO users (id, username, email, password_hash, provider, google_id, image_url, role, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (user_id, username, email, password_hash, provider, google_id, image_url, role, now, now))
                else:
                    await db.execute("""
                        INSERT INTO users (id, username, email, password_hash, provider, role, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (user_id, username, email, password_hash, provider, role, now, now))
                await db.commit()
                
                logger.info(f"Created user: {username} ({email}) with provider: {provider}")
                
                return {
                    "id": user_id,
                    "username": username,
                    "email": email,
                    "provider": provider,
                    "image_url": image_url,
                    "role": role,
                    "created_at": now,
                }
            except aiosqlite.IntegrityError as e:
                if "username" in str(e):
                    raise ValueError("用户名已存在")
                elif "email" in str(e):
                    raise ValueError("邮箱已存在")
                elif "google_id" in str(e):
                    raise ValueError("Google账户已关联其他用户")
                raise
    
    async def get_user_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """根据Google ID获取用户信息"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, image_url, provider, google_id, role, created_at, updated_at
                FROM users
                WHERE google_id = ?
            """, (google_id,))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            # sqlite3.Row 不支持 .get() 方法，需要检查键是否存在
            row_keys = row.keys()
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"] if row["image_url"] else None,
                "provider": row["provider"] if "provider" in row_keys else "local",
                "google_id": row["google_id"] if "google_id" in row_keys and row["google_id"] else None,
                "role": row["role"] if "role" in row_keys else "user",
                "created_at": row["created_at"],
                "updated_at": row["updated_at"] if "updated_at" in row_keys else None,
            }
    
    async def create_or_update_google_user(self, google_id: str, email: str, name: str, picture: Optional[str] = None) -> Dict[str, Any]:
        """创建或更新Google用户"""
        # 先检查是否已存在
        existing_user = await self.get_user_by_google_id(google_id)
        
        if existing_user:
            # 更新用户信息（可能Google账户信息有变化）
            now = datetime.utcnow().isoformat()
            async with aiosqlite.connect(db_service.db_path) as db:
                await db.execute("""
                    UPDATE users
                    SET email = ?, image_url = ?, updated_at = ?
                    WHERE google_id = ?
                """, (email, picture, now, google_id))
                await db.commit()
            
            logger.info(f"Updated Google user: {email} (google_id: {google_id})")
            # existing_user 是字典，可以使用 .get() 方法
            return {
                "id": existing_user["id"],
                "username": existing_user["username"],
                "email": email,
                "image_url": picture,
                "provider": "google",
                "google_id": google_id,
                "role": existing_user.get("role", "user") if isinstance(existing_user, dict) else "user",
                "created_at": existing_user["created_at"],
            }
        
        # 检查邮箱是否已被其他账户使用
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, provider, google_id
                FROM users
                WHERE email = ?
            """, (email,))
            
            existing_email_user = await cursor.fetchone()
            
            if existing_email_user:
                # 如果邮箱已存在但未关联Google，则关联Google ID
                if not existing_email_user["google_id"]:
                    now = datetime.utcnow().isoformat()
                    await db.execute("""
                        UPDATE users
                        SET google_id = ?, provider = ?, image_url = ?, updated_at = ?
                        WHERE email = ?
                    """, (google_id, "google", picture, now, email))
                    await db.commit()
                    
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
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, password_hash, image_url, role, created_at
                FROM users
                WHERE username = ? OR email = ?
            """, (username_or_email, username_or_email))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            if not self._verify_password(password, row["password_hash"]):
                return None
            
            # sqlite3.Row 不支持 .get() 方法，需要检查键是否存在
            row_keys = row.keys()
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"] if row["image_url"] else None,
                "role": row["role"] if "role" in row_keys else "user",
                "created_at": row["created_at"],
            }
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户信息（用于认证流程）"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, image_url, provider, google_id, created_at, updated_at
                FROM users
                WHERE id = ?
            """, (user_id,))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            # sqlite3.Row 不支持 .get() 方法，需要检查键是否存在
            row_keys = row.keys()
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"] if row["image_url"] else None,
                "provider": row["provider"] if "provider" in row_keys else "local",
                "google_id": row["google_id"] if "google_id" in row_keys and row["google_id"] else None,
                "role": row["role"] if "role" in row_keys else "user",
                "created_at": row["created_at"],
                "updated_at": row["updated_at"] if "updated_at" in row_keys else None,
            }
    
    async def create_device_code(self) -> Dict[str, Any]:
        """创建设备码"""
        code = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(seconds=DEVICE_CODE_EXPIRY)
        
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("""
                INSERT INTO device_codes (code, status, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            """, (code, "pending", expires_at.isoformat(), datetime.utcnow().isoformat()))
            await db.commit()
        
        return {
            "code": code,
            "expires_at": expires_at.isoformat(),
        }
    
    async def get_device_code(self, code: str) -> Optional[Dict[str, Any]]:
        """获取设备码信息"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT code, status, expires_at, created_at, user_id
                FROM device_codes
                WHERE code = ?
            """, (code,))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            expires_at = datetime.fromisoformat(row["expires_at"])
            if datetime.utcnow() > expires_at:
                # 过期，删除
                await db.execute("DELETE FROM device_codes WHERE code = ?", (code,))
                await db.commit()
                return None
            
            return {
                "code": row["code"],
                "status": row["status"],
                "expires_at": row["expires_at"],
                "created_at": row["created_at"],
                "user_id": row["user_id"],
            }
    
    async def authorize_device_code(self, code: str, user_id: str) -> bool:
        """授权设备码"""
        async with aiosqlite.connect(db_service.db_path) as db:
            # 检查设备码是否存在且未过期
            device_code = await self.get_device_code(code)
            if not device_code:
                return False
            
            # 更新设备码状态
            await db.execute("""
                UPDATE device_codes
                SET status = ?, user_id = ?
                WHERE code = ?
            """, ("authorized", user_id, code))
            await db.commit()
            
            return True
    
    async def create_token(self, user_id: str) -> str:
        """创建访问token"""
        token = secrets.token_urlsafe(64)
        expires_at = datetime.utcnow() + timedelta(seconds=TOKEN_EXPIRY)
        created_at = datetime.utcnow()
        
        logger.debug(f"创建token: user_id={user_id}, expires_at={expires_at.isoformat()}, token={token[:20]}...")
        
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("""
                INSERT INTO auth_tokens (token, user_id, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            """, (token, user_id, expires_at.isoformat(), created_at.isoformat()))
            await db.commit()
        
        logger.info(f"Token创建成功: user_id={user_id}, token={token[:20]}..., expires_at={expires_at.isoformat()}")
        return token
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证token并返回用户信息"""
        logger.debug(f"验证token: {token[:20]}...")
        
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT t.token, t.user_id, t.expires_at, u.username, u.email, u.image_url, u.role
                FROM auth_tokens t
                JOIN users u ON t.user_id = u.id
                WHERE t.token = ?
            """, (token,))
            
            row = await cursor.fetchone()
            
            if not row:
                logger.warning(f"Token未找到: {token[:20]}...")
                return None
            
            expires_at = datetime.fromisoformat(row["expires_at"])
            now = datetime.utcnow()
            
            logger.debug(f"Token过期时间: {expires_at}, 当前时间: {now}, 是否过期: {now > expires_at}")
            
            if now > expires_at:
                # 过期，删除token
                logger.warning(f"Token已过期: {token[:20]}..., 过期时间: {expires_at}")
                await db.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
                await db.commit()
                return None
            
            # sqlite3.Row 不支持 .get() 方法，需要检查键是否存在
            row_keys = row.keys()
            role = row["role"] if "role" in row_keys else "user"
            logger.debug(f"Token验证成功: user_id={row['user_id']}, username={row['username']}, role={role}")
            return {
                "user_id": row["user_id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"] if row["image_url"] else None,
                "role": role,
            }
    
    async def refresh_token(self, old_token: str) -> Optional[str]:
        """刷新token"""
        user_info = await self.verify_token(old_token)
        if not user_info:
            return None
        
        # 删除旧token
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("DELETE FROM auth_tokens WHERE token = ?", (old_token,))
            await db.commit()
        
        # 创建新token
        return await self.create_token(user_info["user_id"])
    
    async def delete_token(self, token: str):
        """删除token（登出）"""
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
            await db.commit()
    
    async def cleanup_expired_tokens(self):
        """清理过期的token和设备码"""
        now = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(db_service.db_path) as db:
            # 删除过期的token
            await db.execute("DELETE FROM auth_tokens WHERE expires_at < ?", (now,))
            # 删除过期的设备码
            await db.execute("DELETE FROM device_codes WHERE expires_at < ?", (now,))
            await db.commit()


# 创建单例
auth_service = AuthService()

