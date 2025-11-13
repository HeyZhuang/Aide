# services/chat_service.py

# Import necessary modules
import asyncio
import json
from typing import Dict, Any, List, Optional

# Import service modules
from models.tool_model import ToolInfoJson
from services.db_service import db_service
from services.langgraph_service import langgraph_multi_agent
from services.websocket_service import send_to_websocket
from services.stream_service import add_stream_task, remove_stream_task
from models.config_model import ModelInfo


async def handle_chat(data: Dict[str, Any]) -> None:
    """
    Handle an incoming chat request.

    Workflow:
    - Parse incoming chat data.
    - Optionally inject system prompt.
    - Save chat session and messages to the database.
    - Launch langgraph_agent task to process chat.
    - Manage stream task lifecycle (add, remove).
    - Notify frontend via WebSocket when stream is done.

    Args:
        data (dict): Chat request data containing:
            - messages: list of message dicts
            - session_id: unique session identifier
            - canvas_id: canvas identifier (contextual use)
            - text_model: text model configuration
            - tool_list: list of tool model configurations (images/videos)
    """
    print('='*80)
    print('📥 [前端请求] 收到 /api/chat 请求')
    print('='*80)

    # Extract fields from incoming data
    messages: List[Dict[str, Any]] = data.get('messages', [])
    session_id: str = data.get('session_id', '')
    canvas_id: str = data.get('canvas_id', '')
    text_model: ModelInfo = data.get('text_model', {})
    tool_list: List[ToolInfoJson] = data.get('tool_list', [])

    print(f'📋 session_id: {session_id}')
    print(f'📋 canvas_id: {canvas_id}')
    print(f'📋 messages 数量: {len(messages)}')
    if messages:
        last_msg = messages[-1]
        print(f'📋 最后一条消息: role={last_msg.get("role")}, content={str(last_msg.get("content"))[:100]}...')
    print(f'📋 原始 text_model: {text_model}')
    print(f'📋 tool_list: {tool_list}')

    # TODO: [Gemini集成] 自动使用 Gemini 作为默认 planner 模型
    # 原因: 避免依赖 OpenAI/jaaz API Key 配置
    # 当 text_model 未指定或使用 openai/jaaz 时，自动切换到 Gemini
    # 修复步骤: 如果需要恢复使用 OpenAI，确保 config.toml 中 [openai] 或 [jaaz] 的 api_key 有效
    # 影响范围: LangGraph planner 使用 Gemini 进行工具选择和推理
    if not text_model or not text_model.get('model') or text_model.get('provider') in ['openai', 'jaaz']:
        from services.config_service import config_service
        gemini_config = config_service.app_config.get('gemini', {})
        if gemini_config.get('api_key'):
            # TODO: [Gemini模型选择] 使用 gemini-2.5-flash 替代实验性的 2.0-flash-exp
            # 原因: gemini-2.0-flash-exp 可能不稳定，导致工具调用问题
            # 如需切换回 2.0-flash-exp，修改下面的 model 值
            text_model = {
                'model': 'gemini-2.5-flash',  # 使用稳定版本
                'provider': 'gemini',
                'url': gemini_config.get('url', 'https://generativelanguage.googleapis.com/v1beta'),
                'max_tokens': 8192
            }
            print(f'🔄 [自动切换] 使用 Gemini 作为 planner 模型: {text_model["model"]}')

    print(f'✅ 最终 text_model: {text_model}')
    print('='*80)

    # TODO: save and fetch system prompt from db or settings config
    system_prompt: Optional[str] = data.get('system_prompt')

    # If there is only one message, create a new chat session
    if len(messages) == 1:
        # create new session
        prompt = messages[0].get('content', '')
        # TODO: Better way to determin when to create new chat session.
        await db_service.create_chat_session(session_id, text_model.get('model'), text_model.get('provider'), canvas_id, (prompt[:200] if isinstance(prompt, str) else ''))

    await db_service.create_message(session_id, messages[-1].get('role', 'user'), json.dumps(messages[-1])) if len(messages) > 0 else None

    # Create and start langgraph_agent task for chat processing
    print(f'🚀 [启动任务] 开始 LangGraph 多智能体处理')
    task = asyncio.create_task(langgraph_multi_agent(
        messages, canvas_id, session_id, text_model, tool_list, system_prompt))

    # Register the task in stream_tasks (for possible cancellation)
    add_stream_task(session_id, task)
    try:
        # Await completion of the langgraph_agent task
        print(f'⏳ [等待响应] 等待 LangGraph 返回结果...')
        await task
        print(f'✅ [任务完成] LangGraph 处理完成')
    except asyncio.exceptions.CancelledError:
        print(f"🛑 [任务取消] Session {session_id} cancelled during stream")
    except Exception as e:
        print(f"❌ [任务错误] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Always remove the task from stream_tasks after completion/cancellation
        remove_stream_task(session_id)
        # Notify frontend WebSocket that chat processing is done
        print(f'📤 [发送完成] 通知前端任务完成')
        await send_to_websocket(session_id, {
            'type': 'done'
        })
        print('='*80)
