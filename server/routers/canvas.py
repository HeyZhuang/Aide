from fastapi import APIRouter, Request
#from routers.agent import chat
from services.chat_service import handle_chat
from services.db_service import db_service
import asyncio
import json
import time
from fastapi.responses import JSONResponse
from starlette.requests import ClientDisconnect
from utils.logger import get_logger

logger = get_logger("routers.canvas")

router = APIRouter(prefix="/api/canvas")

@router.get("/list")
async def list_canvases():
    start_time = time.time()
    logger.info("=== 接收到获取画布列表请求 ===")
    try:
        result = await db_service.list_canvases()
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功获取画布列表，数量: {len(result)}, 耗时: {elapsed:.3f}秒")
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 获取画布列表失败: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.post("/create")
async def create_canvas(request: Request):
    start_time = time.time()
    try:
        data = await request.json()
        id = data.get('canvas_id')
        name = data.get('name')
        logger.info(f"=== 接收到创建画布请求 === canvas_id: {id}, name: {name}")

        asyncio.create_task(handle_chat(data))
        await db_service.create_canvas(id, name)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功创建画布: canvas_id={id}, name={name}, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except ClientDisconnect:
        elapsed = time.time() - start_time
        logger.warning(f"⚠️ 客户端断开连接 (创建画布), 耗时: {elapsed:.3f}秒")
        # 客户端断开连接，静默处理
        return JSONResponse({"status": "client_disconnected"})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 创建画布失败: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.get("/{id}")
async def get_canvas(id: str):
    start_time = time.time()
    logger.info(f"=== 接收到获取画布请求 === canvas_id: {id}")
    try:
        result = await db_service.get_canvas_data(id)
        elapsed = time.time() - start_time
        data_size = len(str(result.get('data', {}))) if result else 0
        sessions_count = len(result.get('sessions', [])) if result else 0
        logger.info(f"✅ 成功获取画布数据: canvas_id={id}, name={result.get('name', 'N/A')}, "
                   f"数据大小: {data_size}字符, 会话数: {sessions_count}, 耗时: {elapsed:.3f}秒")
        return result
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 获取画布数据失败: canvas_id={id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.post("/{id}/save")
async def save_canvas(id: str, request: Request):
    start_time = time.time()
    try:
        payload = await request.json()
        data_str = json.dumps(payload['data'])
        data_size = len(data_str)
        has_thumbnail = bool(payload.get('thumbnail'))
        logger.info(f"=== 接收到保存画布请求 === canvas_id: {id}, 数据大小: {data_size}字符, 缩略图: {has_thumbnail}")
        
        await db_service.save_canvas_data(id, data_str, payload.get('thumbnail'))
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功保存画布: canvas_id={id}, 数据大小: {data_size}字符, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except ClientDisconnect:
        elapsed = time.time() - start_time
        logger.warning(f"⚠️ 客户端断开连接 (保存画布): canvas_id={id}, 耗时: {elapsed:.3f}秒")
        # 客户端断开连接，静默处理
        return JSONResponse({"id": id, "status": "client_disconnected"})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 保存画布失败: canvas_id={id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.post("/{id}/rename")
async def rename_canvas(id: str, request: Request):
    start_time = time.time()
    try:
        data = await request.json()
        name = data.get('name')
        logger.info(f"=== 接收到重命名画布请求 === canvas_id: {id}, 新名称: {name}")
        
        await db_service.rename_canvas(id, name)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功重命名画布: canvas_id={id}, 新名称={name}, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except ClientDisconnect:
        elapsed = time.time() - start_time
        logger.warning(f"⚠️ 客户端断开连接 (重命名画布): canvas_id={id}, 耗时: {elapsed:.3f}秒")
        # 客户端断开连接，静默处理
        return JSONResponse({"id": id, "status": "client_disconnected"})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 重命名画布失败: canvas_id={id}, 新名称={name}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise

@router.delete("/{id}/delete")
async def delete_canvas(id: str):
    start_time = time.time()
    logger.info(f"=== 接收到删除画布请求 === canvas_id: {id}")
    try:
        await db_service.delete_canvas(id)
        elapsed = time.time() - start_time
        logger.info(f"✅ 成功删除画布: canvas_id={id}, 耗时: {elapsed:.3f}秒")
        return JSONResponse({"id": id})
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ 删除画布失败: canvas_id={id}, 错误: {str(e)}, 耗时: {elapsed:.3f}秒", exc_info=True)
        raise