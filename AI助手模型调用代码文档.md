# AI助手模型调用代码文档

## 📋 目录

1. [整体架构](#整体架构)
2. [调用流程](#调用流程)
3. [核心代码实现](#核心代码实现)
4. [模型初始化](#模型初始化)
5. [Agent系统](#agent系统)
6. [工具调用](#工具调用)
7. [流式处理](#流式处理)
8. [图像/视频生成](#图像视频生成)

---

## 🏗️ 整体架构

```
前端请求
  ↓
POST /api/chat (chat_router.py)
  ↓
handle_chat (chat_service.py)
  ↓
langgraph_multi_agent (agent_service.py)
  ↓
创建文本模型实例 (_create_text_model)
  ↓
创建Agent (AgentManager.create_agents)
  ↓
创建Swarm (create_swarm)
  ↓
流式处理 (StreamProcessor.process_stream)
  ↓
工具调用 (tool_service.get_tool)
  ↓
图像/视频生成 (generate_image_with_provider / generate_video_with_provider)
  ↓
WebSocket推送结果
```

---

## 🔄 调用流程

### 1. API入口

**文件**: `server/routers/chat_router.py`

```python
@router.post("/chat")
async def chat(request: Request):
    """
    Endpoint to handle chat requests.
    
    Receives a JSON payload from the client, passes it to the chat handler,
    and returns a success status.
    """
    data = await request.json()
    await handle_chat(data)
    return {"status": "done"}
```

**请求数据格式**:
```json
{
  "messages": [
    {"role": "user", "content": "生成一张图片"}
  ],
  "session_id": "session_123",
  "canvas_id": "canvas_456",
  "text_model": {
    "model": "gpt-4o",
    "provider": "openai",
    "url": "https://api.openai.com/v1",
    "api_key": "sk-..."
  },
  "tool_list": [
    {
      "id": "generate_image_by_gpt_image_1_jaaz",
      "type": "image",
      "provider": "jaaz"
    }
  ],
  "system_prompt": "You are a helpful assistant."
}
```

---

### 2. 聊天服务处理

**文件**: `server/services/chat_service.py`

```python
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
    """
    # Extract fields from incoming data
    messages: List[Dict[str, Any]] = data.get('messages', [])
    session_id: str = data.get('session_id', '')
    canvas_id: str = data.get('canvas_id', '')
    text_model: ModelInfo = data.get('text_model', {})
    tool_list: List[ToolInfoJson] = data.get('tool_list', [])
    system_prompt: Optional[str] = data.get('system_prompt')

    # If there is only one message, create a new chat session
    if len(messages) == 1:
        prompt = messages[0].get('content', '')
        await db_service.create_chat_session(
            session_id, 
            text_model.get('model'), 
            text_model.get('provider'), 
            canvas_id, 
            (prompt[:200] if isinstance(prompt, str) else '')
        )

    # Save user message to database
    await db_service.create_message(
        session_id, 
        messages[-1].get('role', 'user'), 
        json.dumps(messages[-1])
    ) if len(messages) > 0 else None

    # Create and start langgraph_agent task for chat processing
    task = asyncio.create_task(
        langgraph_multi_agent(
            messages, canvas_id, session_id, text_model, tool_list, system_prompt
        )
    )

    # Register the task in stream_tasks (for possible cancellation)
    add_stream_task(session_id, task)
    try:
        # Await completion of the langgraph_agent task
        await task
    except asyncio.exceptions.CancelledError:
        print(f"🛑Session {session_id} cancelled during stream")
    finally:
        # Always remove the task from stream_tasks after completion/cancellation
        remove_stream_task(session_id)
        # Notify frontend WebSocket that chat processing is done
        await send_to_websocket(session_id, {
            'type': 'done'
        })
```

---

### 3. LangGraph多Agent处理

**文件**: `server/services/langgraph_service/agent_service.py`

```python
async def langgraph_multi_agent(
    messages: List[Dict[str, Any]],
    canvas_id: str,
    session_id: str,
    text_model: ModelInfo,
    tool_list: List[ToolInfoJson],
    system_prompt: Optional[str] = None
) -> None:
    """多智能体处理函数

    Args:
        messages: 消息历史
        canvas_id: 画布ID
        session_id: 会话ID
        text_model: 文本模型配置
        tool_list: 工具模型配置列表（图像或视频模型）
        system_prompt: 系统提示词
    """
    try:
        # 0. 修复消息历史
        fixed_messages = _fix_chat_history(messages)

        # 1. 创建文本模型实例
        text_model_instance = _create_text_model(text_model)

        # 2. 创建智能体
        agents = AgentManager.create_agents(
            text_model_instance,
            tool_list,  # 传入所有注册的工具
            system_prompt or ""
        )
        agent_names = [agent.name for agent in agents]
        print('👇agent_names', agent_names)
        
        # 3. 获取最后活跃的智能体
        last_agent = AgentManager.get_last_active_agent(
            fixed_messages, agent_names
        )
        print('👇last_agent', last_agent)

        # 4. 创建智能体群组
        swarm = create_swarm(
            agents=agents,  # type: ignore
            default_active_agent=last_agent if last_agent else agent_names[0]
        )

        # 5. 创建上下文
        context = {
            'canvas_id': canvas_id,
            'session_id': session_id,
            'tool_list': tool_list,
        }

        # 6. 流处理
        processor = StreamProcessor(
            session_id, db_service, send_to_websocket
        )  # type: ignore
        await processor.process_stream(swarm, fixed_messages, context)

    except Exception as e:
        await _handle_error(e, session_id)
```

---

## 🔧 核心代码实现

### 模型初始化

**文件**: `server/services/langgraph_service/agent_service.py`

```python
def _create_text_model(text_model: ModelInfo) -> Any:
    """创建语言模型实例"""
    model = text_model.get('model')
    provider = text_model.get('provider')
    url = text_model.get('url')
    api_key = config_service.app_config.get(
        provider, {}
    ).get("api_key", "")

    if provider == 'ollama':
        return ChatOllama(
            model=model,
            base_url=url,
        )
    else:
        # Create httpx client with SSL configuration for ChatOpenAI
        http_client = HttpClient.create_sync_client()
        http_async_client = HttpClient.create_async_client()
        return ChatOpenAI(
            model=model,
            api_key=api_key,  # type: ignore
            timeout=300,
            base_url=url,
            temperature=0,
            http_client=http_client,
            http_async_client=http_async_client
        )
```

**支持的模型提供商**:
- `ollama`: 本地Ollama模型
- `openai`: OpenAI API (GPT-4o, GPT-4等)
- `anthropic`: Claude API
- `google`: Gemini API
- 其他兼容OpenAI API格式的提供商

---

### Agent系统

**文件**: `server/services/langgraph_service/agent_manager.py`

```python
class AgentManager:
    """智能体管理器 - 负责创建和管理所有智能体"""

    @staticmethod
    def create_agents(
        model: Any,
        tool_list: List[ToolInfoJson],
        system_prompt: str = ""
    ) -> List[CompiledGraph]:
        """创建所有智能体

        Args:
            model: 语言模型实例
            tool_list: 工具模型配置列表
            system_prompt: 系统提示词

        Returns:
            List[CompiledGraph]: 创建好的智能体列表
        """
        # 为不同类型的智能体过滤合适的工具
        image_tools = [tool for tool in tool_list if tool.get('type') == 'image']
        video_tools = [tool for tool in tool_list if tool.get('type') == 'video']

        print(f"📸 图像工具: {image_tools}")
        print(f"🎬 视频工具: {video_tools}")

        # 1. 创建规划智能体
        planner_config = PlannerAgentConfig()
        planner_agent = AgentManager._create_langgraph_agent(
            model, planner_config
        )

        # 2. 创建图像/视频创建智能体
        image_video_creator_config = ImageVideoCreatorAgentConfig(tool_list)
        image_video_creator_agent = AgentManager._create_langgraph_agent(
            model, image_video_creator_config
        )

        return [planner_agent, image_video_creator_agent]

    @staticmethod
    def _create_langgraph_agent(
        model: Any,
        config: BaseAgentConfig
    ) -> CompiledGraph:
        """根据配置创建单个 LangGraph 智能体

        Args:
            model: 语言模型实例
            config: 智能体配置

        Returns:
            CompiledGraph: 创建好的 LangGraph 智能体实例
        """
        # 创建智能体间切换工具
        handoff_tools: List[BaseTool] = []
        for handoff in config.handoffs:
            handoff_tool = create_handoff_tool(
                agent_name=handoff['agent_name'],
                description=handoff['description'],
            )
            if handoff_tool:
                handoff_tools.append(handoff_tool)

        # 获取业务工具
        business_tools: List[BaseTool] = []
        for tool_json in config.tools:
            tool = tool_service.get_tool(tool_json['id'])
            if tool:
                business_tools.append(tool)

        # 创建并返回 LangGraph 智能体
        return create_react_agent(
            name=config.name,
            model=model,
            tools=[*business_tools, *handoff_tools],
            prompt=config.system_prompt
        )
```

**Agent类型**:

1. **Planner Agent** (规划智能体)
   - 负责制定执行计划
   - 可以切换到其他智能体
   - 工具: `write_plan`

2. **Image Video Creator Agent** (图像/视频创建智能体)
   - 负责生成图像和视频
   - 工具: 所有注册的图像/视频生成工具

---

### 工具调用

**文件**: `server/services/tool_service.py`

```python
class ToolService:
    def __init__(self):
        self.tools: Dict[str, ToolInfo] = {}
        self._register_required_tools()

    async def initialize(self):
        """初始化工具服务，注册所有可用的工具"""
        self.clear_tools()
        try:
            # 根据配置的API密钥注册工具
            for provider_name, provider_config in config_service.app_config.items():
                if provider_config.get("api_key", ""):
                    for tool_id, tool_info in TOOL_MAPPING.items():
                        if tool_info.get("provider") == provider_name:
                            self.register_tool(tool_id, tool_info)
            
            # 注册ComfyUI工作流工具
            if config_service.app_config.get("comfyui", {}).get("url", ""):
                await register_comfy_tools()
        except Exception as e:
            print(f"❌ Failed to initialize tool service: {e}")

    def get_tool(self, tool_name: str) -> BaseTool | None:
        """获取工具实例"""
        tool_info = self.tools.get(tool_name)
        return tool_info.get("tool_function") if tool_info else None
```

**工具注册映射** (`TOOL_MAPPING`):

```python
TOOL_MAPPING: Dict[str, ToolInfo] = {
    # 图像生成工具
    "generate_image_by_gpt_image_1_jaaz": {
        "display_name": "GPT Image 1",
        "type": "image",
        "provider": "jaaz",
        "tool_function": generate_image_by_gpt_image_1_jaaz,
    },
    "generate_image_by_imagen_4_jaaz": {
        "display_name": "Imagen 4",
        "type": "image",
        "provider": "jaaz",
        "tool_function": generate_image_by_imagen_4_jaaz,
    },
    # ... 更多工具
}
```

---

### 流式处理

**文件**: `server/services/langgraph_service/StreamProcessor.py`

```python
class StreamProcessor:
    """流式处理器 - 负责处理智能体的流式输出"""

    def __init__(self, session_id: str, db_service: Any, websocket_service: Callable):
        self.session_id = session_id
        self.db_service = db_service
        self.websocket_service = websocket_service
        self.tool_calls: List[ToolCall] = []
        self.last_saved_message_index = 0
        self.last_streaming_tool_call_id: Optional[str] = None

    async def process_stream(
        self, 
        swarm: StateGraph, 
        messages: List[Dict[str, Any]], 
        context: Dict[str, Any]
    ) -> None:
        """处理整个流式响应

        Args:
            swarm: 智能体群组
            messages: 消息列表
            context: 上下文信息
        """
        self.last_saved_message_index = len(messages) - 1

        compiled_swarm = swarm.compile()

        # 流式处理
        async for chunk in compiled_swarm.astream(
            {"messages": messages},
            config=context,
            stream_mode=["messages", "custom", 'values']
        ):
            await self._handle_chunk(chunk)

        # 发送完成事件
        await self.websocket_service(self.session_id, {
            'type': 'done'
        })

    async def _handle_chunk(self, chunk: Any) -> None:
        """处理单个chunk"""
        chunk_type = chunk[0]

        if chunk_type == 'values':
            await self._handle_values_chunk(chunk[1])
        else:
            await self._handle_message_chunk(chunk[1][0])

    async def _handle_message_chunk(self, ai_message_chunk: AIMessageChunk) -> None:
        """处理消息类型的 chunk"""
        try:
            content = ai_message_chunk.content

            if isinstance(ai_message_chunk, ToolMessage):
                # 工具调用结果
                oai_message = convert_to_openai_messages([ai_message_chunk])[0]
                await self.websocket_service(self.session_id, {
                    'type': 'tool_call_result',
                    'id': ai_message_chunk.tool_call_id,
                    'message': oai_message
                })
            elif content:
                # 发送文本内容
                await self.websocket_service(self.session_id, {
                    'type': 'delta',
                    'text': content
                })
            elif hasattr(ai_message_chunk, 'tool_calls') and ai_message_chunk.tool_calls:
                # 处理工具调用
                await self._handle_tool_calls(ai_message_chunk.tool_calls)

            # 处理工具调用参数流
            if hasattr(ai_message_chunk, 'tool_call_chunks'):
                await self._handle_tool_call_chunks(ai_message_chunk.tool_call_chunks)
        except Exception as e:
            print('🟠error', e)
            traceback.print_stack()

    async def _handle_tool_calls(self, tool_calls: List[ToolCall]) -> None:
        """处理工具调用"""
        self.tool_calls = [tc for tc in tool_calls if tc.get('name')]
        print('😘tool_call event', tool_calls)

        for tool_call in self.tool_calls:
            tool_name = tool_call.get('name')
            
            # 检查是否需要确认
            TOOLS_REQUIRING_CONFIRMATION = {
                'generate_video_by_veo3_fast_jaaz',
            }

            if tool_name in TOOLS_REQUIRING_CONFIRMATION:
                print(f'🔄 Tool {tool_name} requires confirmation, skipping StreamProcessor event')
                continue
            else:
                await self.websocket_service(self.session_id, {
                    'type': 'tool_call',
                    'id': tool_call.get('id'),
                    'name': tool_name,
                    'arguments': '{}'
                })
```

**WebSocket事件类型**:

- `delta`: 文本流式输出
- `tool_call`: 工具调用开始
- `tool_call_arguments`: 工具调用参数流
- `tool_call_result`: 工具调用结果
- `all_messages`: 所有消息更新
- `done`: 处理完成

---

## 🖼️ 图像/视频生成

### 图像生成工具示例

**文件**: `server/tools/generate_image_by_gpt_image_1_jaaz.py`

```python
from typing import Annotated
from pydantic import BaseModel, Field
from langchain_core.tools import tool, InjectedToolCallId
from langchain_core.runnables import RunnableConfig
from tools.utils.image_generation_core import generate_image_with_provider

class GenerateImageByGptImage1InputSchema(BaseModel):
    prompt: str = Field(
        description="Required. The prompt for image generation."
    )
    aspect_ratio: str = Field(
        description="Required. Aspect ratio: 1:1, 16:9, 4:3, 3:4, 9:16."
    )
    input_images: list[str] | None = Field(
        default=None,
        description="Optional; One or multiple images to use as reference."
    )
    tool_call_id: Annotated[str, InjectedToolCallId]

@tool(
    "generate_image_by_gpt_image_1_jaaz",
    description="Generate an image by gpt image model...",
    args_schema=GenerateImageByGptImage1InputSchema
)
async def generate_image_by_gpt_image_1_jaaz(
    prompt: str,
    aspect_ratio: str,
    config: RunnableConfig,
    tool_call_id: Annotated[str, InjectedToolCallId],
    input_images: list[str] | None = None,
) -> str:
    # 从配置中获取上下文信息
    ctx = config.get('configurable', {})
    canvas_id = ctx.get('canvas_id', '')
    session_id = ctx.get('session_id', '')
    
    # 调用图像生成核心函数
    return await generate_image_with_provider(
        canvas_id=canvas_id,
        session_id=session_id,
        provider='jaaz',
        model='openai/gpt-image-1',
        prompt=prompt,
        aspect_ratio=aspect_ratio,
        input_images=input_images,
    )
```

### 图像生成核心函数

**文件**: `server/tools/utils/image_generation_core.py`

```python
async def generate_image_with_provider(
    canvas_id: str,
    session_id: str,
    provider: str,
    model: str,
    prompt: str,
    aspect_ratio: str = "1:1",
    input_images: Optional[list[str]] = None,
) -> str:
    """
    通用图像生成函数，支持不同的模型和提供商

    Args:
        canvas_id: 画布ID
        session_id: 会话ID
        provider: 提供商名称 (jaaz, openai, replicate, volces等)
        model: 模型标识符 (如 'openai/gpt-image-1', 'google/imagen-4')
        prompt: 图像生成提示词
        aspect_ratio: 图像长宽比
        input_images: 可选的输入参考图像列表

    Returns:
        str: 生成结果消息
    """
    # 获取提供商实例
    provider_instance = IMAGE_PROVIDERS.get(provider)
    if not provider_instance:
        raise ValueError(f"Unknown provider: {provider}")

    # 处理输入图像
    processed_input_images: list[str] | None = None
    if input_images:
        processed_input_images = []
        for image_path in input_images:
            processed_image = await process_input_image(image_path)
            if processed_image:
                processed_input_images.append(processed_image)

    # 准备元数据
    metadata: Dict[str, Any] = {
        "prompt": prompt,
        "model": model,
        "provider": provider,
        "aspect_ratio": aspect_ratio,
        "input_images": input_images or [],
    }

    # 使用提供商生成图像
    mime_type, width, height, filename = await provider_instance.generate(
        prompt=prompt,
        model=model,
        aspect_ratio=aspect_ratio,
        input_images=processed_input_images,
        metadata=metadata,
    )

    # 保存图像到画布
    image_url = await save_image_to_canvas(
        session_id, canvas_id, filename, mime_type, width, height
    )

    return f"image generated successfully ![image_id: {filename}](http://localhost:{DEFAULT_PORT}{image_url})"
```

**支持的图像提供商**:

- `jaaz`: Jaaz API
- `openai`: OpenAI DALL-E
- `replicate`: Replicate平台
- `volces`: 火山引擎
- `wavespeed`: Wavespeed平台
- `comfyui`: 本地ComfyUI

---

## 📊 完整调用流程图

```
┌─────────────────────────────────────────────────────────────┐
│  前端发送请求                                                 │
│  POST /api/chat                                              │
│  {                                                           │
│    messages: [...],                                          │
│    text_model: {...},                                        │
│    tool_list: [...]                                          │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  chat_router.py                                             │
│  @router.post("/chat")                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  chat_service.py                                            │
│  handle_chat()                                              │
│  - 保存消息到数据库                                          │
│  - 创建异步任务                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  agent_service.py                                           │
│  langgraph_multi_agent()                                    │
│  - 修复消息历史                                              │
│  - 创建文本模型实例                                          │
│  - 创建Agent                                                 │
│  - 创建Swarm                                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  agent_manager.py                                           │
│  AgentManager.create_agents()                               │
│  - Planner Agent                                             │
│  - Image Video Creator Agent                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  StreamProcessor.py                                          │
│  process_stream()                                            │
│  - 流式处理Agent响应                                         │
│  - 处理工具调用                                              │
│  - WebSocket推送                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  tool_service.py                                            │
│  get_tool()                                                 │
│  - 获取工具实例                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  工具函数 (如 generate_image_by_gpt_image_1_jaaz)           │
│  - 解析参数                                                  │
│  - 调用生成核心函数                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  image_generation_core.py                                   │
│  generate_image_with_provider()                             │
│  - 获取Provider实例                                          │
│  - 调用Provider.generate()                                  │
│  - 保存结果到画布                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Provider (如 JaazImageProvider)                           │
│  generate()                                                 │
│  - 调用API生成图像                                           │
│  - 返回结果                                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  WebSocket推送结果                                           │
│  - tool_call_result                                          │
│  - done                                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 关键配置

### Agent配置

**Planner Agent** (`server/services/langgraph_service/configs/planner_config.py`):
- 负责制定执行计划
- 可以切换到 `image_video_creator` Agent
- 工具: `write_plan`

**Image Video Creator Agent** (`server/services/langgraph_service/configs/image_vide_creator_config.py`):
- 负责生成图像和视频
- 系统提示词包含详细的生成策略
- 工具: 所有注册的图像/视频生成工具

### 工具注册

工具在 `tool_service.py` 的 `TOOL_MAPPING` 中注册，根据配置的API密钥自动启用。

### 模型配置

模型配置通过 `config_service` 管理，存储在 `user_data/config.toml` 中。

---

## 📝 总结

AI助手模型调用系统采用以下架构：

1. **分层设计**: API路由 → 服务层 → Agent层 → 工具层 → Provider层
2. **多Agent协作**: Planner Agent 和 Image Video Creator Agent 协作完成任务
3. **流式处理**: 使用 LangGraph 的流式API实现实时响应
4. **工具系统**: 统一的工具接口，易于扩展新的生成工具
5. **Provider抽象**: 支持多个图像/视频生成提供商

整个系统设计清晰，易于维护和扩展。

