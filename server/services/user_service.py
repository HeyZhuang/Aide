"""
用户管理服务
处理用户的增删改查等业务逻辑
"""
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
import aiosqlite

from services.db_service import db_service
from utils.logger import get_logger

logger = get_logger("services.user_service")


class UserService:
    """用户管理服务"""
    
    @staticmethod
    def _hash_password(password: str) -> str:
        """使用SHA-256哈希密码"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def _verify_password(password: str, password_hash: str) -> bool:
        """验证密码"""
        return UserService._hash_password(password) == password_hash
    
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
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        根据用户名获取用户信息
        用于设备认证等场景，获取指定用户的基本信息
        """
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, image_url, created_at, updated_at
                FROM users
                WHERE username = ?
            """, (username,))
            
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
    
    async def get_first_user(self) -> Optional[Dict[str, Any]]:
        """
        获取第一个用户（通常是管理员）
        用于设备认证等需要默认用户的场景
        """
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, image_url, created_at, updated_at
                FROM users
                ORDER BY created_at ASC
                LIMIT 1
            """)
            
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
    
    async def get_all_users(self, skip: int = 0, limit: int = 100) -> list[Dict[str, Any]]:
        """获取所有用户列表（分页）"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, username, email, image_url, created_at, updated_at
                FROM users
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, (limit, skip))
            
            rows = await cursor.fetchall()
            
            return [
                {
                    "id": row["id"],
                    "username": row["username"],
                    "email": row["email"],
                    "image_url": row["image_url"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ]
    
    async def update_user(self, user_id: str, username: Optional[str] = None, 
                         email: Optional[str] = None, image_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """更新用户信息"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        update_fields = []
        params = []
        
        if username is not None:
            update_fields.append("username = ?")
            params.append(username)
        
        if email is not None:
            update_fields.append("email = ?")
            params.append(email)
        
        if image_url is not None:
            update_fields.append("image_url = ?")
            params.append(image_url)
        
        if not update_fields:
            return user
        
        update_fields.append("updated_at = ?")
        params.append(datetime.utcnow().isoformat())
        params.append(user_id)
        
        async with aiosqlite.connect(db_service.db_path) as db:
            try:
                await db.execute(f"""
                    UPDATE users
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """, params)
                await db.commit()
                logger.info(f"Updated user: {user_id}")
                return await self.get_user_by_id(user_id)
            except aiosqlite.IntegrityError as e:
                if "username" in str(e):
                    raise ValueError("用户名已存在")
                elif "email" in str(e):
                    raise ValueError("邮箱已存在")
                raise
    
    async def update_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改用户密码"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT password_hash FROM users WHERE id = ?
            """, (user_id,))
            
            row = await cursor.fetchone()
            if not row:
                return False
            
            if not self._verify_password(old_password, row["password_hash"]):
                return False
            
            new_password_hash = self._hash_password(new_password)
            await db.execute("""
                UPDATE users
                SET password_hash = ?, updated_at = ?
                WHERE id = ?
            """, (new_password_hash, datetime.utcnow().isoformat(), user_id))
            await db.commit()
            
            logger.info(f"Password updated for user: {user_id}")
            return True
    
    async def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        async with aiosqlite.connect(db_service.db_path) as db:
            cursor = await db.execute("SELECT id FROM users WHERE id = ?", (user_id,))
            if not await cursor.fetchone():
                return False
            
            await db.execute("DELETE FROM auth_tokens WHERE user_id = ?", (user_id,))
            await db.execute("DELETE FROM device_codes WHERE user_id = ?", (user_id,))
            await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            await db.commit()
            
            logger.info(f"Deleted user: {user_id}")
            return True
    
    async def search_users(self, keyword: str, skip: int = 0, limit: int = 100) -> list[Dict[str, Any]]:
        """搜索用户（通过用户名或邮箱）"""
        async with aiosqlite.connect(db_service.db_path) as db:
            db.row_factory = aiosqlite.Row
            search_pattern = f"%{keyword}%"
            cursor = await db.execute("""
                SELECT id, username, email, image_url, created_at, updated_at
                FROM users
                WHERE username LIKE ? OR email LIKE ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, (search_pattern, search_pattern, limit, skip))
            
            rows = await cursor.fetchall()
            
            return [
                {
                    "id": row["id"],
                    "username": row["username"],
                    "email": row["email"],
                    "image_url": row["image_url"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ]


# 创建单例
user_service = UserService()
