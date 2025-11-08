"""
Permission Dependency - 权限检查依赖
提供基于角色的权限检查功能
"""
from typing import Optional, List
from fastapi import HTTPException, Depends
from utils.auth_dependency import get_current_user, get_current_user_optional
from utils.logger import get_logger

logger = get_logger("utils.permission_dependency")


def require_role(allowed_roles: List[str]):
    """
    权限检查装饰器
    检查用户是否具有允许的角色
    
    Args:
        allowed_roles: 允许的角色列表，例如 ["admin", "user"]
    """
    def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "guest")
        
        if user_role not in allowed_roles:
            logger.warning(f"User {current_user.get('username')} with role {user_role} attempted to access resource requiring {allowed_roles}")
            raise HTTPException(
                status_code=403,
                detail=f"权限不足，需要以下角色之一: {', '.join(allowed_roles)}"
            )
        
        return current_user
    
    return role_checker


def require_admin(current_user: dict = Depends(get_current_user)):
    """要求管理员权限"""
    user_role = current_user.get("role", "guest")
    
    if user_role != "admin":
        logger.warning(f"User {current_user.get('username')} with role {user_role} attempted to access admin resource")
        raise HTTPException(
            status_code=403,
            detail="权限不足，需要管理员权限"
        )
    
    return current_user


def require_user(current_user: dict = Depends(get_current_user)):
    """要求注册用户权限（非游客）"""
    user_role = current_user.get("role", "guest")
    
    if user_role == "guest":
        raise HTTPException(
            status_code=401,
            detail="请先登录"
        )
    
    return current_user


def get_user_role_optional(current_user: Optional[dict] = Depends(get_current_user_optional)) -> str:
    """获取用户角色（可选，游客返回'guest'）"""
    if current_user is None:
        return "guest"
    
    return current_user.get("role", "guest")



