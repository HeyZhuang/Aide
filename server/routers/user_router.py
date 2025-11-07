"""
User Management Router - 用户管理路由模块
提供用户个人管理系统的完整 CRUD 接口

功能模块：
1. 用户认证：注册、登录、登出
2. 用户查询：获取个人信息、用户列表、搜索用户
3. 用户更新：修改个人信息、修改密码
4. 用户删除：注销账号
"""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Header, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from services.auth_service import auth_service
from services.user_service import user_service
from utils.logger import get_logger

logger = get_logger("routers.user_router")
router = APIRouter()


# ================== Pydantic 模型 ==================

class UserRegisterRequest(BaseModel):
    """用户注册请求"""
    username: str
    email: EmailStr
    password: str


class UserLoginRequest(BaseModel):
    """用户登录请求"""
    username: str
    password: str


class UserUpdateRequest(BaseModel):
    """用户信息更新请求"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    image_url: Optional[str] = None


class PasswordUpdateRequest(BaseModel):
    """密码修改请求"""
    old_password: str
    new_password: str


# ================== 依赖注入函数 ==================

async def get_current_user(authorization: Optional[str] = Header(None, description="Bearer Token")):
    """
    获取当前登录用户
    从 Authorization header 中验证 token 并返回用户信息
    
    Args:
        authorization: Bearer token 格式的认证头
        
    Returns:
        dict: 用户信息字典，包含 user_id, username, email 等字段
        
    Raises:
        HTTPException: 401 - 未提供认证令牌或令牌无效
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="未提供认证令牌",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.replace("Bearer ", "")
    user_info = await auth_service.verify_token(token)
    
    if not user_info:
        raise HTTPException(
            status_code=401,
            detail="令牌无效或已过期",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user_info


# ================== 1. 用户认证接口 ==================

@router.post("/api/auth/register", summary="用户注册", response_description="注册成功返回用户信息")
async def register_user(request: UserRegisterRequest):
    """
    用户注册
    创建新用户账号
    """
    try:
        user = await auth_service.create_user(
            username=request.username,
            email=request.email,
            password=request.password
        )
        logger.info(f"User registered: {user['username']}")
        return {
            "status": "success",
            "message": "注册成功",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="注册失败")


@router.post("/api/auth/login", summary="用户登录", response_description="登录成功返回token和用户信息")
async def login_user(request: UserLoginRequest):
    """
    用户登录
    验证用户凭证并返回访问令牌
    """
    user = await auth_service.verify_user(
        username_or_email=request.username,
        password=request.password
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    # 创建访问令牌
    token = await auth_service.create_token(user["id"])
    
    logger.info(f"User logged in: {user['username']}")
    
    return {
        "status": "success",
        "message": "登录成功",
        "token": token,
        "user": user
    }


@router.post("/api/auth/logout", summary="用户登出", response_description="登出成功")
async def logout_user(
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """
    用户登出
    删除当前访问令牌
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        await auth_service.delete_token(token)
    
    logger.info(f"User logged out: {current_user['username']}")
    
    return {
        "status": "success",
        "message": "登出成功"
    }


# ================== 2. 用户信息查询接口 ==================

@router.get("/api/users/me", summary="获取当前用户信息", response_description="返回当前登录用户的详细信息")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    获取当前用户信息
    返回当前登录用户的个人资料
    """
    user = await user_service.get_user_by_id(current_user["user_id"])
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "status": "success",
        "user": user
    }


@router.get("/api/users/{user_id}", summary="根据ID获取用户信息", response_description="返回指定用户的详细信息")
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    根据ID获取用户信息
    需要登录权限
    """
    user = await user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "status": "success",
        "user": user
    }


@router.get("/api/users", summary="获取用户列表", response_description="返回分页的用户列表")
async def get_users_list(
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(get_current_user)
):
    """
    获取用户列表(分页)
    需要登录权限
    """
    users = await user_service.get_all_users(skip=skip, limit=limit)
    
    return {
        "status": "success",
        "users": users,
        "skip": skip,
        "limit": limit,
        "count": len(users)
    }


@router.get("/api/users/search", summary="搜索用户", response_description="返回匹配的用户列表")
async def search_users(
    keyword: str = Query(..., min_length=1, description="搜索关键词（用户名或邮箱）"),
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(get_current_user)
):
    """
    搜索用户
    通过用户名或邮箱关键词搜索
    """
    users = await user_service.search_users(keyword=keyword, skip=skip, limit=limit)
    
    return {
        "status": "success",
        "users": users,
        "keyword": keyword,
        "count": len(users)
    }


# ================== 3. 用户信息修改接口 ==================

@router.put("/api/users/me", summary="更新当前用户信息", response_description="返回更新后的用户信息")
async def update_current_user(
    request: UserUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    更新当前用户信息
    允许用户修改自己的个人资料
    """
    try:
        updated_user = await user_service.update_user(
            user_id=current_user["user_id"],
            username=request.username,
            email=request.email,
            image_url=request.image_url
        )
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        logger.info(f"User updated: {updated_user['username']}")
        
        return {
            "status": "success",
            "message": "更新成功",
            "user": updated_user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Update error: {str(e)}")
        raise HTTPException(status_code=500, detail="更新失败")


@router.put("/api/users/me/password", summary="修改当前用户密码", response_description="密码修改成功")
async def update_current_user_password(
    request: PasswordUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    修改当前用户密码
    需要提供旧密码进行验证
    """
    success = await user_service.update_password(
        user_id=current_user["user_id"],
        old_password=request.old_password,
        new_password=request.new_password
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="旧密码错误或用户不存在")
    
    logger.info(f"Password updated for user: {current_user['username']}")
    
    return {
        "status": "success",
        "message": "密码修改成功"
    }


# ================== 4. 用户删除接口 ==================

@router.delete("/api/users/me", summary="删除当前用户账号", response_description="账号删除成功")
async def delete_current_user(current_user: dict = Depends(get_current_user)):
    """
    删除当前用户账号
    用户自行注销账号
    """
    success = await user_service.delete_user(current_user["user_id"])
    
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    logger.info(f"User deleted: {current_user['username']}")
    
    return {
        "status": "success",
        "message": "账号已删除"
    }
