"""
Manager Router - 管理员路由模块
提供管理员专用的管理接口，包括模板管理、用户管理等

功能模块：
1. 模板管理：上传、删除模板
2. 用户管理：查看、编辑、删除用户
3. 系统管理：系统配置、数据统计等
"""
import os
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr

from services.template_service import template_service
from services.user_service import user_service
from utils.permission_dependency import require_admin
from utils.logger import get_logger

logger = get_logger("routers.manager_route")

router = APIRouter()

# 允许的文件类型
ALLOWED_FILE_TYPES = {
    "psd": "application/vnd.adobe.photoshop",
    "json": "application/json",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "svg": "image/svg+xml",
}


# ================== Pydantic 模型 ==================

class TemplateResponse(BaseModel):
    """模板响应模型"""
    id: str
    name: str
    description: Optional[str] = None
    file_path: str
    file_type: str
    file_size: int
    thumbnail_path: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str


class UserUpdateRequest(BaseModel):
    """用户信息更新请求（管理员）"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    vip_level: Optional[int] = None
    credits: Optional[int] = None


# ================== 1. 模板管理接口 ==================

@router.post("/api/admin/templates/upload", response_model=TemplateResponse)
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(require_admin)
):
    """
    上传模板文件（仅管理员）
    
    接口名：上传模板文件
    请求地址：/api/admin/templates/upload
    请求方法：POST
    入参：
      - file: UploadFile - 模板文件（PSD、JSON、PNG等）
      - name: str - 模板名称
      - description: str（可选）- 模板描述
      - category: str（可选）- 模板分类
      - tags: str（可选）- 模板标签，多个标签用逗号分隔
    出参：
      - id: str - 模板唯一标识
      - name: str - 模板名称
      - description: str - 模板描述
      - file_path: str - 文件存储路径
      - file_type: str - 文件类型
      - file_size: int - 文件大小（字节）
      - thumbnail_path: str - 缩略图路径
      - category: str - 分类
      - tags: str - 标签
      - created_by: str - 创建者ID
      - created_at: str - 创建时间
      - updated_at: str - 更新时间
    """
    # 检查文件名
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    # 检查文件类型
    file_extension = Path(file.filename).suffix.lower().lstrip(".")
    if file_extension not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_extension}。支持的类型: {', '.join(ALLOWED_FILE_TYPES.keys())}"
        )
    
    # 读取文件内容
    file_content = await file.read()
    file_size = len(file_content)
    
    # 生成模板ID和文件路径
    template_id = str(uuid.uuid4())
    template_dir = template_service.templates_dir / template_id
    template_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = template_dir / file.filename
    
    # 保存文件
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    logger.info(f"Admin {current_user['username']} uploaded template: {file.filename} (size: {file_size} bytes)")
    
    # 创建模板记录
    template = await template_service.create_template(
        name=name,
        file_path=str(file_path),
        file_type=file_extension,
        file_size=file_size,
        created_by=current_user["user_id"],
        description=description,
        category=category,
        tags=tags,
        thumbnail_path=None  # TODO: 生成缩略图
    )
    
    return template


@router.delete("/api/admin/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    删除模板（仅管理员）
    
    接口名：删除模板
    请求地址：/api/admin/templates/{template_id}
    请求方法：DELETE
    入参：
      - template_id: str - 模板ID（路径参数）
    出参：
      - message: str - 操作结果消息
    """
    success = await template_service.delete_template(
        template_id=template_id,
        user_id=current_user["user_id"],
        user_role=current_user.get("role", "user")
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    logger.info(f"Admin {current_user['username']} deleted template: {template_id}")
    
    return {"message": "模板已删除"}


# ================== 2. 用户管理接口 ==================

@router.get("/api/admin/users")
async def get_all_users(
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(require_admin)
):
    """
    获取所有用户列表（仅管理员）
    
    接口名：获取所有用户列表
    请求地址：/api/admin/users
    请求方法：GET
    入参：
      - skip: int（查询参数）- 跳过的记录数，默认0
      - limit: int（查询参数）- 返回的记录数，默认20，最大100
    出参：
      - status: str - 操作状态
      - users: list - 用户列表
      - skip: int - 跳过的记录数
      - limit: int - 返回的记录数
      - count: int - 实际返回的用户数量
    """
    users = await user_service.get_all_users(skip=skip, limit=limit)
    
    logger.info(f"Admin {current_user['username']} queried users list (skip={skip}, limit={limit})")
    
    return {
        "status": "success",
        "users": users,
        "skip": skip,
        "limit": limit,
        "count": len(users)
    }


@router.get("/api/admin/users/search")
async def search_users(
    keyword: str = Query(..., min_length=1, description="搜索关键词（用户名或邮箱）"),
    skip: int = Query(0, ge=0, description="跳过的记录数（分页偏移）"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数（每页数量）"),
    current_user: dict = Depends(require_admin)
):
    """
    搜索用户（仅管理员）
    
    接口名：搜索用户
    请求地址：/api/admin/users/search
    请求方法：GET
    入参：
      - keyword: str（查询参数）- 搜索关键词，匹配用户名或邮箱
      - skip: int（查询参数）- 跳过的记录数，默认0
      - limit: int（查询参数）- 返回的记录数，默认20，最大100
    出参：
      - status: str - 操作状态
      - users: list - 匹配的用户列表
      - keyword: str - 搜索关键词
      - count: int - 匹配的用户数量
    """
    users = await user_service.search_users(keyword=keyword, skip=skip, limit=limit)
    
    logger.info(f"Admin {current_user['username']} searched users with keyword: {keyword}")
    
    return {
        "status": "success",
        "users": users,
        "keyword": keyword,
        "count": len(users)
    }


@router.get("/api/admin/users/{user_id}")
async def get_user_detail(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    获取用户详细信息（仅管理员）
    
    接口名：获取用户详细信息
    请求地址：/api/admin/users/{user_id}
    请求方法：GET
    入参：
      - user_id: str - 用户ID（路径参数）
    出参：
      - status: str - 操作状态
      - user: dict - 用户详细信息
    """
    user = await user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    logger.info(f"Admin {current_user['username']} queried user: {user_id}")
    
    return {
        "status": "success",
        "user": user
    }


@router.put("/api/admin/users/{user_id}")
async def update_user(
    user_id: str,
    request: UserUpdateRequest,
    current_user: dict = Depends(require_admin)
):
    """
    更新用户信息（仅管理员）
    
    接口名：更新用户信息
    请求地址：/api/admin/users/{user_id}
    请求方法：PUT
    入参：
      - user_id: str - 用户ID（路径参数）
      - username: str（可选）- 新用户名
      - email: str（可选）- 新邮箱
      - role: str（可选）- 新角色（admin/editor/viewer）
      - is_admin: bool（可选）- 是否为管理员
      - vip_level: int（可选）- VIP等级
      - credits: int（可选）- 积分余额
    出参：
      - status: str - 操作状态
      - message: str - 操作结果消息
      - user: dict - 更新后的用户信息
    """
    try:
        # 构建更新参数
        update_data = {}
        if request.username is not None:
            update_data["username"] = request.username
        if request.email is not None:
            update_data["email"] = request.email
        if request.role is not None:
            update_data["role"] = request.role
        if request.is_admin is not None:
            update_data["is_admin"] = request.is_admin
        if request.vip_level is not None:
            update_data["vip_level"] = request.vip_level
        if request.credits is not None:
            update_data["credits"] = request.credits
        
        # 调用服务层更新用户
        updated_user = await user_service.update_user(user_id=user_id, **update_data)
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="用户不存在")
        
        logger.info(f"Admin {current_user['username']} updated user: {user_id}")
        
        return {
            "status": "success",
            "message": "用户信息更新成功",
            "user": updated_user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        raise HTTPException(status_code=500, detail="更新失败")


@router.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    删除用户（仅管理员）
    
    接口名：删除用户
    请求地址：/api/admin/users/{user_id}
    请求方法：DELETE
    入参：
      - user_id: str - 用户ID（路径参数）
    出参：
      - status: str - 操作状态
      - message: str - 操作结果消息
    """
    # 不允许删除自己
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="不能删除自己的账号")
    
    success = await user_service.delete_user(user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    logger.info(f"Admin {current_user['username']} deleted user: {user_id}")
    
    return {
        "status": "success",
        "message": "用户已删除"
    }


# ================== 3. 系统统计接口 ==================

@router.get("/api/admin/stats")
async def get_system_stats(
    current_user: dict = Depends(require_admin)
):
    """
    获取系统统计信息（仅管理员）
    
    接口名：获取系统统计信息
    请求地址：/api/admin/stats
    请求方法：GET
    入参：无
    出参：
      - status: str - 操作状态
      - stats: dict - 统计信息（用户数、模板数等）
    """
    # TODO: 实现系统统计功能
    # 可以统计：总用户数、今日新增用户、总模板数、存储空间使用等
    
    logger.info(f"Admin {current_user['username']} queried system stats")
    
    return {
        "status": "success",
        "stats": {
            "total_users": 0,
            "total_templates": 0,
            "message": "统计功能开发中"
        }
    }
