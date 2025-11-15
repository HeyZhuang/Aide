"""
用户管理服务
处理用户的增删改查等业务逻辑
"""
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
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
        user = await db_service.get_user_by_id(user_id)
        if not user:
            return None
        
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "image_url": user.get("image_url"),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at"),
        }
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """
        根据用户名获取用户信息
        用于设备认证等场景，获取指定用户的基本信息
        """
        user = await db_service.get_user_by_username(username)
        if not user:
            return None
        
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "image_url": user.get("image_url"),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at"),
        }
    
    async def get_first_user(self) -> Optional[Dict[str, Any]]:
        """
        获取第一个用户（通常是管理员）
        用于设备认证等需要默认用户的场景
        """
        rows = await db_service._fetch("""
            SELECT id, username, email, image_url, created_at, updated_at
            FROM users
            ORDER BY created_at ASC
            LIMIT 1
        """)
        
        if not rows:
            return None
        
        row = rows[0]
        return {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "image_url": row.get("image_url"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }
    
    async def get_all_users(self, skip: int = 0, limit: int = 100) -> list[Dict[str, Any]]:
        """获取所有用户列表（分页）"""
        rows = await db_service._fetch("""
            SELECT id, username, email, image_url, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        """, limit, skip)
        
        return [
            {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row.get("image_url"),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at"),
            }
            for row in rows
        ]
    
    async def update_user(self, user_id: str, username: Optional[str] = None, 
                         email: Optional[str] = None, image_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """更新用户信息"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        update_data = {}
        if username is not None:
            update_data["username"] = username
        if email is not None:
            update_data["email"] = email
        if image_url is not None:
            update_data["image_url"] = image_url
        
        if not update_data:
            return user
        
        try:
            await db_service.update_user(user_id, **update_data)
            logger.info(f"Updated user: {user_id}")
            return await self.get_user_by_id(user_id)
        except Exception as e:
            error_msg = str(e)
            if "username" in error_msg.lower():
                raise ValueError("用户名已存在")
            elif "email" in error_msg.lower():
                raise ValueError("邮箱已存在")
            raise
    
    async def update_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """修改用户密码"""
        user = await db_service.get_user_by_id(user_id)
        if not user:
            return False
        
        # 需要獲取密碼哈希
        user_with_password = await db_service.get_user_by_email(user["email"])
        if not user_with_password or not user_with_password.get("password_hash"):
            return False
        
        if not self._verify_password(old_password, user_with_password["password_hash"]):
            return False
        
        new_password_hash = self._hash_password(new_password)
        await db_service.update_user(user_id, password_hash=new_password_hash)
        
        logger.info(f"Password updated for user: {user_id}")
        return True
    
    async def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        user = await db_service.get_user_by_id(user_id)
        if not user:
            return False
        
        # 刪除相關數據（CASCADE 會自動處理，但我們也手動清理令牌）
        await db_service.delete_auth_token(user_id, by_user_id=True)  # 這會刪除該用戶的所有令牌
        await db_service._execute("DELETE FROM users WHERE id = $1", user_id)
        
        logger.info(f"Deleted user: {user_id}")
        return True
    
    async def search_users(self, keyword: str, skip: int = 0, limit: int = 100) -> list[Dict[str, Any]]:
        """搜索用户（通过用户名或邮箱）"""
        search_pattern = f"%{keyword}%"
        rows = await db_service._fetch("""
            SELECT id, username, email, image_url, created_at, updated_at
            FROM users
            WHERE username LIKE $1 OR email LIKE $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        """, search_pattern, search_pattern, limit, skip)
        
        return [
            {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "image_url": row.get("image_url"),
                "created_at": row.get("created_at"),
                "updated_at": row.get("updated_at"),
            }
            for row in rows
        ]

    async def leave_organization(self, user_id: str, organization_id: str) -> bool:
        """
        用户退出组织
        
        Args:
            user_id: 用户ID
            organization_id: 组织ID
            
        Returns:
            是否成功退出
        """
        # 检查用户是否是组织成员
        member = await db_service._fetchrow("""
            SELECT id FROM organization_members
            WHERE user_id = $1 AND organization_id = $2
        """, user_id, organization_id)
        
        if not member:
            return False
        
        # 删除成员关系
        await db_service._execute("""
            DELETE FROM organization_members
            WHERE user_id = $1 AND organization_id = $2
        """, user_id, organization_id)
        
        logger.info(f"User {user_id} left organization: {organization_id}")
        return True

    async def get_organization_members(
        self, 
        organization_id: str, 
        skip: int = 0, 
        limit: int = 100
    ) -> list[Dict[str, Any]]:
        """
        获取组织成员列表
        
        Args:
            organization_id: 组织ID
            skip: 跳过的记录数
            limit: 返回的记录数
            
        Returns:
            成员列表（包含用户基本信息和角色）
        """
        rows = await db_service._fetch("""
            SELECT 
                om.id as member_id,
                om.role,
                om.joined_at,
                u.id as user_id,
                u.username,
                u.email,
                u.image_url
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = $1
            ORDER BY om.joined_at ASC
            LIMIT $2 OFFSET $3
        """, organization_id, limit, skip)
        
        return [
            {
                "member_id": row["member_id"],
                "role": row["role"],
                "joined_at": row["joined_at"],
                "user": {
                    "id": row["user_id"],
                    "username": row["username"],
                    "email": row["email"],
                    "image_url": row.get("image_url"),
                }
            }
            for row in rows
        ]

    async def search_organizations(
        self, 
        keyword: str, 
        skip: int = 0, 
        limit: int = 100
    ) -> list[Dict[str, Any]]:
        """
        搜索组织（通过组织名称或描述）
        仅返回激活状态的组织
        
        Args:
            keyword: 搜索关键词
            skip: 跳过的记录数
            limit: 返回的记录数
            
        Returns:
            匹配的组织列表
        """
        search_pattern = f"%{keyword}%"
        rows = await db_service._fetch("""
            SELECT 
                id,
                name,
                description,
                logo_url,
                max_members,
                owner_id,
                created_at
            FROM organizations
            WHERE (name LIKE $1 OR description LIKE $2)
              AND is_active = TRUE
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        """, search_pattern, search_pattern, limit, skip)
        
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "description": row.get("description"),
                "logo_url": row.get("logo_url"),
                "max_members": row.get("max_members"),
                "owner_id": row["owner_id"],
                "created_at": row.get("created_at"),
            }
            for row in rows
        ]


# 创建单例
user_service = UserService()
