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
    
    async def create_user(self, username: str, email: str, password: str) -> Dict[str, Any]:
        """创建新用户"""
        user_id = str(uuid.uuid4())
        password_hash = self._hash_password(password)
        now = datetime.utcnow().isoformat()
        
        async with aiosqlite.connect(db_service.db_path) as db:
            try:
                await db.execute("""
                    INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (user_id, username, email, password_hash, now, now))
                await db.commit()
                
                logger.info(f"Created user: {username} ({email})")
                
                return {
                    "id": user_id,
                    "username": username,
                    "email": email,
                    "created_at": now,
                }
            except aiosqlite.IntegrityError as e:
                if "username" in str(e):
                    raise ValueError("用户名已存在")
                elif "email" in str(e):
                    raise ValueError("邮箱已存在")
                raise
    
    async def verify_user(self, username_or_email: str, password: str) -> Optional[Dict[str, Any]]:
        """验证用户登录"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, password_hash, image_url, created_at
                FROM users
                WHERE username = ? OR email = ?
            """, (username_or_email, username_or_email))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            if not self._verify_password(password, row["password_hash"]):
                return None
            
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"],
                "created_at": row["created_at"],
            }
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取用户信息"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, image_url, created_at, updated_at
                FROM users
                WHERE id = ?
            """, (user_id,))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
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
        
        async with aiosqlite.connect(db_service.db_path) as db:
            await db.execute("""
                INSERT INTO auth_tokens (token, user_id, expires_at, created_at)
                VALUES (?, ?, ?, ?)
            """, (token, user_id, expires_at.isoformat(), datetime.utcnow().isoformat()))
            await db.commit()
        
        return token
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """验证token并返回用户信息"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT t.token, t.user_id, t.expires_at, u.username, u.email, u.image_url
                FROM auth_tokens t
                JOIN users u ON t.user_id = u.id
                WHERE t.token = ?
            """, (token,))
            
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            expires_at = datetime.fromisoformat(row["expires_at"])
            if datetime.utcnow() > expires_at:
                # 过期，删除token
                await db.execute("DELETE FROM auth_tokens WHERE token = ?", (token,))
                await db.commit()
                return None
            
            return {
                "user_id": row["user_id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row["image_url"],
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

