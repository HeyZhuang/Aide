from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel, Field
#from routers.agent import chat
from services.chat_service import handle_chat
from services.db_service import db_service
from utils.auth_dependency import get_current_user, get_current_user_optional
import asyncio
import json
import time
from fastapi.responses import JSONResponse
from starlette.requests import ClientDisconnect
from utils.logger import get_logger
from typing import Dict, Any, Optional

logger = get_logger("routers.canvas")

router = APIRouter(prefix="/api/canvas")

# ================== Pydantic 模型 ==================

class CanvasCreateRequest(BaseModel):
    """创建画布请求"""
    canvas_id: str
    name: str = Field(..., min_length=1, max_length=200, description="画布名称，最长200字符")

class CanvasRenameRequest(BaseModel):
    """重命名画布请求"""
    name: str = Field(..., min_length=1, max_length=200, description="画布名称，最长200字符")

@router.get("/list")
async def list_canvases(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    获取当前用户的画布列表
    需要登录，只返回当前用户拥有的画布
    """
    start_time = time.time()
    user_id = current_user["user_id"]
    logger.info(f"=== 接收到获取画布列表请求 === user_id: {user_id}")
    try:
        result = await db_service.list_canvases(user_id=user_id)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功获取画布列表: user_id={user_id}, 数量: {len(result)}, 耗时: {elapsed:.3f}秒")
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 获取画布列表失败: user_id={user_id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.post("/create")
async def create_canvas(request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    创建新画布
    需要登录，画布自动关联到当前用户
    """
    start_time = time.time()
    user_id = current_user["user_id"]
    try:
        data = await request.json()
        id = data.get('canvas_id')
        name = data.get('name')
        logger.info(f"=== 接收到创建画布请求 === user_id: {user_id}, canvas_id: {id}, name: {name}")

        asyncio.create_task(handle_chat(data))
        await db_service.create_canvas(id, name, user_id=user_id)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功创建画布: user_id={user_id}, canvas_id={id}, name={name}, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except ClientDisconnect:
        elapsed = time.time() - start_time
        logger.warning(f"⚠️ 客户端断开连接 (创建画布), user_id: {user_id}, 耗时: {elapsed:.3f}秒")
        # 客户端断开连接，静默处理
        return JSONResponse({"status": "client_disconnected"})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 创建画布失败: user_id={user_id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.get("/{id}")
async def get_canvas(id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)):
    """
    获取画布数据
    未登录用户也可以查看画布（只读模式），但只能查看，不能编辑
    登录用户可以查看和编辑自己拥有的画布
    """
    start_time = time.time()
    user_id = current_user["user_id"] if current_user else None
    logger.info(f"=== 接收到获取画布请求 === user_id: {user_id or '游客'}, canvas_id: {id}")
    try:
        # 检查画布是否存在
        canvas_owner = await db_service.get_canvas_owner(id)
        if canvas_owner is None:
            raise HTTPException(status_code=404, detail="画布不存在")
        
        # 如果用户已登录，检查是否是画布所有者
        # 如果未登录，允许查看（只读模式）
        if user_id and canvas_owner != user_id:
            raise HTTPException(
                status_code=403,
                detail="无权访问此画布，只能访问您自己的画布"
            )
        
        result = await db_service.get_canvas_data(id)
        elapsed = time.time() - start_time
        data_size = len(str(result.get('data', {}))) if result else 0
        sessions_count = len(result.get('sessions', [])) if result else 0
        logger.info(f"✅ 成功获取画布数据: user_id={user_id or '游客'}, canvas_id={id}, name={result.get('name', 'N/A')}, "
                   f"数据大小: {data_size}字符, 会话数: {sessions_count}, 耗时: {elapsed:.3f}秒")
        return result
    except HTTPException:
        raise
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 获取画布数据失败: user_id={user_id or '游客'}, canvas_id={id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.post("/{id}/save")
async def save_canvas(id: str, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    保存画布数据
    需要登录，只能保存当前用户拥有的画布
    """
    start_time = time.time()
    user_id = current_user["user_id"]
    try:
        # 检查画布所有权
        canvas_owner = await db_service.get_canvas_owner(id)
        if canvas_owner is None:
            raise HTTPException(status_code=404, detail="画布不存在")
        
        if canvas_owner != user_id:
            raise HTTPException(
                status_code=403,
                detail="无权修改此画布，只能修改您自己的画布"
            )
        
        payload = await request.json()
        data_str = json.dumps(payload['data'])
        data_size = len(data_str)
        has_thumbnail = bool(payload.get('thumbnail'))
        logger.info(f"=== 接收到保存画布请求 === user_id: {user_id}, canvas_id: {id}, 数据大小: {data_size}字符, 缩略图: {has_thumbnail}")
        
        await db_service.save_canvas_data(id, data_str, payload.get('thumbnail'))
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功保存画布: user_id={user_id}, canvas_id={id}, 数据大小: {data_size}字符, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except HTTPException:
        raise
    except ClientDisconnect:
        elapsed = time.time() - start_time
        logger.warning(f"⚠️ 客户端断开连接 (保存画布): user_id: {user_id}, canvas_id: {id}, 耗时: {elapsed:.3f}秒")
        # 客户端断开连接，静默处理
        return JSONResponse({"id": id, "status": "client_disconnected"})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 保存画布失败: user_id={user_id}, canvas_id={id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.post("/{id}/rename")
async def rename_canvas(id: str, request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    重命名画布
    需要登录，只能重命名当前用户拥有的画布
    """
    start_time = time.time()
    user_id = current_user["user_id"]
    try:
        # 检查画布所有权
        canvas_owner = await db_service.get_canvas_owner(id)
        if canvas_owner is None:
            raise HTTPException(status_code=404, detail="画布不存在")
        
        if canvas_owner != user_id:
            raise HTTPException(
                status_code=403,
                detail="无权修改此画布，只能修改您自己的画布"
            )
        
        data = await request.json()
        name = data.get('name')
        logger.info(f"=== 接收到重命名画布请求 === user_id: {user_id}, canvas_id: {id}, 新名称: {name}")
        
        await db_service.rename_canvas(id, name)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功重命名画布: user_id={user_id}, canvas_id={id}, 新名称={name}, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except HTTPException:
        raise
    except ClientDisconnect:
        elapsed = time.time() - start_time
        logger.warning(f"⚠️ 客户端断开连接 (重命名画布): user_id: {user_id}, canvas_id: {id}, 耗时: {elapsed:.3f}秒")
        # 客户端断开连接，静默处理
        return JSONResponse({"id": id, "status": "client_disconnected"})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 重命名画布失败: user_id={user_id}, canvas_id={id}, 新名称={name}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.delete("/{id}/delete")
async def delete_canvas(id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    删除画布
    需要登录，只能删除当前用户拥有的画布
    """
    start_time = time.time()
    user_id = current_user["user_id"]
    logger.info(f"=== 接收到删除画布请求 === user_id: {user_id}, canvas_id: {id}")
    try:
        # 检查画布所有权
        canvas_owner = await db_service.get_canvas_owner(id)
        if canvas_owner is None:
            raise HTTPException(status_code=404, detail="画布不存在")
        
        if canvas_owner != user_id:
            raise HTTPException(
                status_code=403,
                detail="无权删除此画布，只能删除您自己的画布"
            )
        
        await db_service.delete_canvas(id)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功删除画布: user_id={user_id}, canvas_id={id}, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except HTTPException:
        raise
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 删除画布失败: user_id={user_id}, canvas_id={id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise