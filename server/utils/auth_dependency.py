"""
用户身份验证依赖项
用于 FastAPI 路由中验证用户身份
"""
from fastapi import HTTPException, Header, Depends
from typing import Optional
from services.auth_service import auth_service
from utils.logger import get_logger

logger = get_logger("utils.auth_dependency")


async def get_current_user(authorization: Optional[str] = Header(None, alias="Authorization")):
    """
    从请求头中获取当前用户
    需要 Authorization: Bearer <token> 格式
    """
    logger.debug(f"收到认证请求，authorization header: {authorization[:20] if authorization else None}...")
    
    if not authorization:
        logger.warning("缺少授权令牌")
        raise HTTPException(
            status_code=401,
            detail="缺少授权令牌，请先登录"
        )
    
    if not authorization.startswith("Bearer "):
        logger.warning(f"授权令牌格式错误: {authorization[:20]}...")
        raise HTTPException(
            status_code=401,
            detail="授权令牌格式错误，应为 'Bearer <token>'"
        )
    
    token = authorization.replace("Bearer ", "").strip()
    
    if not token:
        logger.warning("授权令牌为空")
        raise HTTPException(
            status_code=401,
            detail="授权令牌为空"
        )
    
    # 验证 token 并获取用户信息
    user_info = await auth_service.verify_token(token)
    
    if not user_info:
        logger.warning(f"授权令牌无效或已过期: {token[:20]}...")
        raise HTTPException(
            status_code=401,
            detail="授权令牌无效或已过期，请重新登录"
        )
    
    logger.debug(f"用户认证成功: user_id={user_info.get('user_id')}")
    return user_info


async def get_current_user_optional(authorization: Optional[str] = Header(None)):
    """
    可选的身份验证
    如果提供了 token，验证并返回用户信息；否则返回 None
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "").strip()
    
    if not token:
        return None
    
    try:
        user_info = await auth_service.verify_token(token)
        return user_info
    except Exception as e:
        logger.warning(f"可选身份验证失败: {str(e)}")
        return None

