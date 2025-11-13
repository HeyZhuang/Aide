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
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

from services.auth_service import auth_service
from services.user_service import user_service
from services.manager_service import get_manager_service
from utils.logger import get_logger

logger = get_logger("routers.user_router")
router = APIRouter()


# ================== Pydantic 模型 ==================

class UserRegisterRequest(BaseModel):
    """用户注册请求"""
    username: str = Field(..., min_length=1, max_length=50, description="用户名，最长50字符")
    email: EmailStr = Field(..., max_length=255, description="邮箱，最长255字符")
    password: str = Field(..., min_length=6, description="密码，最少6字符")


class UserLoginRequest(BaseModel):
    """用户登录请求"""
    username: str
    password: str


class UserUpdateRequest(BaseModel):
    """用户信息更新请求"""
    username: Optional[str] = Field(None, min_length=1, max_length=50, description="用户名，最长50字符")
    email: Optional[EmailStr] = Field(None, max_length=255, description="邮箱，最长255字符")
    image_url: Optional[str] = None


class PasswordUpdateRequest(BaseModel):
    """密码修改请求"""
    old_password: str
    new_password: str = Field(..., min_length=6, description="新密码，最少6字符")


class JoinOrganizationRequest(BaseModel):
    """用户加入组织请求"""
    invite_code: str = Field(..., max_length=20, description="邀请码，最长20字符")
    message: Optional[str] = Field(None, max_length=100, description="申请留言，最长100字符")


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


# ================== 5. 组织相关接口 ==================

@router.get("/api/users/me/organizations", summary="获取我的组织列表", response_description="返回用户所属的组织列表")
async def get_my_organizations(current_user: dict = Depends(get_current_user)):
    """
    获取我的组织列表
    返回当前用户所属的所有组织
    
    接口名：获取我的组织列表
    请求地址：/api/users/me/organizations
    请求方法：GET
    入参：无
    出参：
      - status: str - 操作状态
      - organizations: list - 组织列表（包含角色信息）
      - count: int - 组织数量
    """
    manager_svc = await get_manager_service()
    
    organizations = await manager_svc.get_user_organizations(current_user["user_id"])
    
    return {
        "status": "success",
        "organizations": organizations,
        "count": len(organizations)
    }


@router.post("/api/users/me/join-requests", summary="申请加入组织", response_description="返回申请信息")
async def create_join_request(
    request: JoinOrganizationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    申请加入组织
    用户通过邀请码申请加入组织
    
    接口名：申请加入组织
    请求地址：/api/users/me/join-requests
    请求方法：POST
    入参：
      - invite_code: str - 组织邀请码
      - message: str（可选）- 申请留言，最长100字符
    出参：
      - status: str - 操作状态
      - message: str - 操作结果消息
      - join_request: dict - 申请信息
    """
    manager_svc = await get_manager_service()
    
    # 验证邀请码
    organization = await manager_svc.verify_invite_code(request.invite_code)
    
    if not organization:
        raise HTTPException(status_code=404, detail="邀请码无效")
    
    # 检查留言长度
    if request.message and len(request.message) > 500:
        raise HTTPException(status_code=400, detail="留言长度不能超过500字符")
    
    # 创建加入申请
    join_request = await manager_svc.create_join_request(
        organization_id=organization["id"],
        user_id=current_user["user_id"],
        invite_code=request.invite_code,
        message=request.message
    )
    
    logger.info(f"User {current_user['username']} requested to join organization: {organization['id']}")
    
    return {
        "status": "success",
        "message": "申请已提交，请等待管理员审核",
        "join_request": join_request
    }


@router.get("/api/users/me/join-requests", summary="获取我的加入申请列表", response_description="返回用户的申请列表")
async def get_my_join_requests(current_user: dict = Depends(get_current_user)):
    """
    获取我的加入申请列表
    返回当前用户的所有加入申请
    
    接口名：获取我的加入申请列表
    请求地址：/api/users/me/join-requests
    请求方法：GET
    入参：无
    出参：
      - status: str - 操作状态
      - requests: list - 申请列表
      - count: int - 申请数量
    """
    manager_svc = await get_manager_service()
    
    requests = await manager_svc.get_user_join_requests(current_user["user_id"])
    
    return {
        "status": "success",
        "requests": requests,
        "count": len(requests)
    }


@router.post("/api/organizations/{organization_id}/join-requests", summary="申请加入指定组织", response_description="返回申请信息")
async def join_organization_by_id(
    organization_id: str,
    request: JoinOrganizationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    申请加入指定组织
    用户通过组织ID和邀请码申请加入
    
    接口名：申请加入指定组织
    请求地址：/api/organizations/{organization_id}/join-requests
    请求方法：POST
    入参：
      - organization_id: str - 组织ID（路径参数）
      - invite_code: str - 组织邀请码
      - message: str（可选）- 申请留言，最长500字符
    出参：
      - status: str - 操作状态
      - message: str - 操作结果消息
      - join_request: dict - 申请信息
    """
    manager_svc = await get_manager_service()
    
    # 验证组织存在
    organization = await manager_svc.get_organization(organization_id)
    
    if not organization:
        raise HTTPException(status_code=404, detail="组织不存在")
    
    # 验证邀请码是否匹配
    if organization["invite_code"] != request.invite_code:
        raise HTTPException(status_code=400, detail="邀请码不匹配")
    
    # 检查留言长度
    if request.message and len(request.message) > 500:
        raise HTTPException(status_code=400, detail="留言长度不能超过500字符")
    
    # 创建加入申请
    join_request = await manager_svc.create_join_request(
        organization_id=organization_id,
        user_id=current_user["user_id"],
        invite_code=request.invite_code,
        message=request.message
    )
    
    logger.info(f"User {current_user['username']} requested to join organization: {organization_id}")
    
    return {
        "status": "success",
        "message": "申请已提交，请等待管理员审核",
        "join_request": join_request
    }


@router.get("/api/organizations", summary="列出所有激活的组织", response_description="返回组织列表")
async def list_active_organizations(
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(get_current_user)
):
    """
    列出所有激活的组织
    用户可查看所有可加入的组织
    
    接口名：列出所有激活的组织
    请求地址：/api/organizations
    请求方法：GET
    入参：
      - skip: int（查询参数）- 跳过的记录数，默认0
      - limit: int（查询参数）- 返回的记录数，默认20，最大1100
    出参：
      - status: str - 操作状态
      - organizations: list - 组织列表
      - count: int - 返回数量
    """
    manager_svc = await get_manager_service()
    
    # 只返回激活的组织
    organizations = await manager_svc.list_organizations(
        skip=skip,
        limit=limit,
        is_active=True
    )
    
    return {
        "status": "success",
        "organizations": organizations,
        "count": len(organizations)
    }


@router.get("/api/organizations/{organization_id}", summary="获取组织详情", response_description="返回组织详细信息")
async def get_organization_detail(
    organization_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    获取组织详情
    用户可查看组织的详细信息
    
    接口名：获取组织详情
    请求地址：/api/organizations/{organization_id}
    请求方法：GET
    入参：
      - organization_id: str - 组织ID（路径参数）
    出参：
      - status: str - 操作状态
      - organization: dict - 组织详细信息
    """
    manager_svc = await get_manager_service()
    
    organization = await manager_svc.get_organization(organization_id)
    
    if not organization:
        raise HTTPException(status_code=404, detail="组织不存在")
    
    # 检查组织是否激活
    if not organization.get("is_active"):
        raise HTTPException(status_code=403, detail="组织已禁用")
    
    return {
        "status": "success",
        "organization": organization
    }


@router.delete("/api/users/me/organizations/{organization_id}", summary="退出组织", response_description="退出成功")
async def leave_organization(
    organization_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    退出组织
    用户主动退出已加入的组织
    
    接口名：退出组织
    请求地址：/api/users/me/organizations/{organization_id}
    请求方法：DELETE
    入参：
      - organization_id: str - 组织ID（路径参数）
    出参：
      - status: str - 操作状态
      - message: str - 操作结果消息
    """
    success = await user_service.leave_organization(
        user_id=current_user["user_id"],
        organization_id=organization_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="您不是该组织的成员")
    
    logger.info(f"User {current_user['username']} left organization: {organization_id}")
    
    return {
        "status": "success",
        "message": "已成功退出组织"
    }


@router.get("/api/organizations/{organization_id}/members", summary="查看组织成员", response_description="返回成员列表")
async def get_organization_members(
    organization_id: str,
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(get_current_user)
):
    """
    查看组织成员列表
    返回组织的所有成员信息
    
    接口名：查看组织成员
    请求地址：/api/organizations/{organization_id}/members
    请求方法：GET
    入参：
      - organization_id: str - 组织ID（路径参数）
      - skip: int（查询参数）- 跳过的记录数，默认0
      - limit: int（查询参数）- 返回的记录数，默认20，最大100
    出参：
      - status: str - 操作状态
      - members: list - 成员列表（包含用户信息和角色）
      - count: int - 成员数量
    """
    manager_svc = await get_manager_service()
    
    # 验证组织存在
    organization = await manager_svc.get_organization(organization_id)
    if not organization:
        raise HTTPException(status_code=404, detail="组织不存在")
    
    # 获取成员列表
    members = await user_service.get_organization_members(
        organization_id=organization_id,
        skip=skip,
        limit=limit
    )
    
    return {
        "status": "success",
        "members": members,
        "count": len(members)
    }


@router.get("/api/organizations/search", summary="搜索组织", response_description="返回匹配的组织列表")
async def search_organizations(
    keyword: str = Query(..., min_length=1, description="搜索关键词（组织名称或描述）"),
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(get_current_user)
):
    """
    搜索组织
    通过关键词搜索可加入的组织（仅显示激活状态）
    
    接口名：搜索组织
    请求地址：/api/organizations/search
    请求方法：GET
    入参：
      - keyword: str（查询参数）- 搜索关键词，匹配组织名称或描述
      - skip: int（查询参数）- 跳过的记录数，默认0
      - limit: int（查询参数）- 返回的记录数，默认20，最大100
    出参：
      - status: str - 操作状态
      - organizations: list - 匹配的组织列表
      - keyword: str - 搜索关键词
      - count: int - 匹配数量
    """
    organizations = await user_service.search_organizations(
        keyword=keyword,
        skip=skip,
        limit=limit
    )
    
    logger.info(f"User {current_user['username']} searched organizations with keyword: {keyword}")
    
    return {
        "status": "success",
        "organizations": organizations,
        "keyword": keyword,
        "count": len(organizations)
    }
