# 画布图层智能排列与Resize技术文档

## 📋 目录

1. [功能概述](#功能概述)
2. [架构概览](#架构概览)
3. [前端实现](#前端实现)
4. [后端实现](#后端实现)
5. [数据流程](#数据流程)
6. [关键代码位置](#关键代码位置)

---

## 功能概述

画布图层智能排列功能允许用户选择多个画布元素，通过AI（Gemini 2.5 Pro）智能调整它们的位置和尺寸，以适应目标画布尺寸。该功能采用非破坏性设计，保留原始元素，创建新的排列后的元素。

### 核心特性

- ✅ **AI驱动**: 使用Gemini 2.5 Pro进行智能排列
- ✅ **非破坏性**: 保留原图层，创建新图层
- ✅ **等比例缩放**: 保持元素原始宽高比
- ✅ **智能布局**: 避免重叠，保持视觉平衡
- ✅ **预设尺寸**: 支持Instagram、Facebook等常用尺寸

---

## 架构概览

```
前端 (React)
  ├─ CanvasSmartArrangeButton 组件
  │   ├─ LayerArrangementDialog (尺寸设置)
  │   └─ handleArrangeLayers (排列处理)
  │
  ├─ API调用 (upload.ts)
  │   └─ arrangeCanvasElements()
  │
  └─ 画布更新 (Excalidraw API)
      └─ excalidrawAPI.updateScene()

后端 (FastAPI)
  ├─ 路由层 (layer_arrangement_router.py)
  │   └─ /api/psd/arrange-layers (POST)
  │
  └─ 服务层 (canvas_layer_arrangement_service.py)
      ├─ CanvasLayerArrangementService
      ├─ generate_arrangement_prompt()
      ├─ call_gemini_api()
      ├─ parse_gemini_response()
      └─ arrange_canvas_elements()
```

---

## 前端实现

### 1. 主组件：CanvasSmartArrangeButton

**文件位置**: `react/src/components/canvas/pop-bar/CanvasSmartArrangeButton.tsx`

#### 按钮显示条件

```typescript
// 只有当选择了2个或更多元素时才显示按钮
if (selectedElements.length < 2) {
  return null
}
```

#### 核心处理函数：handleArrangeLayers

```148:231:psd-canvas-jaaz/react/src/components/canvas/pop-bar/CanvasSmartArrangeButton.tsx
            // 创建新元素，复制原元素的所有属性，但使用新的位置和尺寸
            const newElement: OrderedExcalidrawElement = {
              ...originalElement,
              id: newId,
              // 使用排列后的坐标，并应用偏移量
              x: arrangement.new_coords.x + offsetX,
              y: arrangement.new_coords.y + offsetY,
              width: arrangement.new_coords.width,
              height: arrangement.new_coords.height,
              // 更新时间戳和版本号
              updated: Date.now(),
              versionNonce: Math.floor(Math.random() * 1000000),
              // 添加自定义标记，表示这是排列后的元素
              customData: {
                ...(originalElement.customData || {}),
                isArranged: true,
                originalElementId: originalElement.id,
                arrangementTimestamp: Date.now()
              }
            }
            
            console.log(`创建新元素 ${newId} (原元素: ${originalElement.id}):`, {
              old: { x: originalElement.x, y: originalElement.y, width: originalElement.width, height: originalElement.height },
              new: { 
                x: newElement.x, 
                y: newElement.y, 
                width: newElement.width, 
                height: newElement.height 
              },
              offset: { x: offsetX, y: offsetY }
            })
            
            newElements.push(newElement)
          } else {
            console.warn(`找不到原始元素，ID: ${arrangement.id}`)
          }
        })
        
        if (newElements.length > 0) {
          // 获取当前所有画布元素
          const currentElements = excalidrawAPI.getSceneElements()
          
          // 添加新元素到画布（原图层保持不变）
          excalidrawAPI.updateScene({
            elements: [...currentElements, ...newElements],
          })
          
          // 选中新创建的元素
          excalidrawAPI.updateScene({
            appState: {
              selectedElementIds: newElements.reduce((acc, element) => {
                acc[element.id] = true
                return acc
              }, {} as Record<string, boolean>)
            }
          })
          
          // 强制刷新以确保更新正确显示
          excalidrawAPI.refresh()
          
          console.log(`成功创建 ${newElements.length} 个新的排列图层，原图层保持不变`);
          
          toast.success(t('canvas:messages.layerArrangement.arrangementSuccess'))
        } else {
          console.warn('没有创建任何新元素');
          toast.error(t('canvas:messages.layerArrangement.arrangementFailed'))
        }
      } else {
        console.log('排列失败:', response);
        toast.error(t('canvas:messages.layerArrangement.arrangementFailed'))
      }
    } catch (error) {
      console.error('图层排列失败:', error);
      // 检查是否是由于模型过载导致的错误
      if (error instanceof Error && error.message.includes('overloaded')) {
        toast.error(t('canvas:messages.layerArrangement.modelOverloaded'));
      } else {
        toast.error(t('canvas:messages.layerArrangement.arrangementError'));
      }
    } finally {
      setIsArranging(false)
      setIsDialogOpen(false)
    }
  }
```

#### 关键步骤说明

1. **计算画布尺寸** (第33-52行)
   - 从AppState获取画布尺寸
   - 如果画布为空，基于元素边界计算实际尺寸

2. **准备请求数据** (第54-81行)
   - 提取选中元素的属性（id, type, x, y, width, height等）
   - 过滤无效元素
   - 确保数值有效且为正数

3. **调用API** (第99行)
   ```typescript
   const response = await arrangeCanvasElements(requestData)
   ```

4. **处理排列结果** (第103-214行)
   - 计算偏移量（使新图层与原图层并排显示）
   - 创建新元素，应用新的位置和尺寸
   - 保留原元素的所有属性
   - 更新画布并选中新元素

#### 画布元素Resize实现

**关键代码** (第148-167行):
```typescript
const newElement: OrderedExcalidrawElement = {
  ...originalElement,
  id: newId,
  // 使用排列后的坐标，并应用偏移量
  x: arrangement.new_coords.x + offsetX,    // 新X坐标
  y: arrangement.new_coords.y + offsetY,    // 新Y坐标
  width: arrangement.new_coords.width,       // 新宽度 (resize)
  height: arrangement.new_coords.height,    // 新高度 (resize)
  updated: Date.now(),
  versionNonce: Math.floor(Math.random() * 1000000),
  customData: {
    isArranged: true,
    originalElementId: originalElement.id,
    arrangementTimestamp: Date.now()
  }
}
```

**画布更新** (第191-206行):
```typescript
// 添加新元素到画布（原图层保持不变）
excalidrawAPI.updateScene({
  elements: [...currentElements, ...newElements],
})

// 选中新创建的元素
excalidrawAPI.updateScene({
  appState: {
    selectedElementIds: newElements.reduce((acc, element) => {
      acc[element.id] = true
      return acc
    }, {} as Record<string, boolean>)
  }
})

// 强制刷新以确保更新正确显示
excalidrawAPI.refresh()
```

### 2. API调用函数

**文件位置**: `react/src/api/upload.ts`

```259:271:psd-canvas-jaaz/react/src/api/upload.ts
export async function arrangeCanvasElements(request: ArrangeLayersRequest): Promise<ArrangeLayersResponse> {
  const response = await fetch('/api/psd/arrange-layers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error(`Failed to arrange layers: ${response.statusText}`)
  }
  return await response.json()
}
```

#### 请求数据类型

```typescript
interface ArrangeLayersRequest {
  selectedElements: {
    id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    angle?: number
    strokeColor?: string
    backgroundColor?: string
    fillStyle?: string
    strokeWidth?: number
  }[]
  canvasWidth: number
  canvasHeight: number
  targetWidth: number
  targetHeight: number
  apiKey?: string
}
```

#### 响应数据类型

```typescript
interface ArrangeLayersResponse {
  success: boolean
  arrangements: ElementArrangement[]
}

interface ElementArrangement {
  id: string
  type: string
  original_coords: {
    x: number
    y: number
    width: number
    height: number
  }
  new_coords: {
    x: number
    y: number
    width: number    // Resize后的宽度
    height: number   // Resize后的高度
  }
  scale_factor: number
  adjustment_reason: string
  quality_check: string
  warnings: string[]
}
```

### 3. 对话框组件：LayerArrangementDialog

**文件位置**: `react/src/components/canvas/LayerArrangementDialog.tsx`

提供目标尺寸设置界面，包含：
- 宽度和高度输入
- 预设尺寸选择（Instagram、Facebook等）
- 排列按钮

---

## 后端实现

### 1. 路由层：layer_arrangement_router.py

**文件位置**: `server/routers/layer_arrangement_router.py`

```24:150:psd-canvas-jaaz/server/routers/layer_arrangement_router.py
@router.post("/arrange-layers")
async def arrange_layers(request: Request):
    """
    智能排列选中的画布元素
    
    Args:
        request: 包含选中元素信息和目标尺寸的请求
        
    Request body:
        {
            "selectedElements": [...],  # 选中的画布元素列表
            "canvasWidth": 1200,        # 当前画布宽度
            "canvasHeight": 800,        # 当前画布高度
            "targetWidth": 800,         # 目标宽度
            "targetHeight": 600,        # 目标高度
            "apiKey": "optional_gemini_api_key"  # 可选的Gemini API密钥
        }
    
    Returns:
        排列后的元素位置信息
    """
    try:
        data = await request.json()
        logger.info(f"收到图层排列请求: {data}")
        logger.info("开始处理图层排列请求...")
        
        # 提取参数
        selected_elements = data.get('selectedElements', [])
        canvas_width = data.get('canvasWidth', 0)
        canvas_height = data.get('canvasHeight', 0)
        target_width = data.get('targetWidth', 0)
        target_height = data.get('targetHeight', 0)
        api_key = data.get('apiKey', None)
        
        logger.info(f"接收到的图层数量: {len(selected_elements)}")
        for i, element in enumerate(selected_elements):
            x = element.get('x', 0)
            y = element.get('y', 0)
            width = element.get('width', 0)
            height = element.get('height', 0)
            logger.info(f"  图层 {i+1}: ID={element.get('id')}, 类型={element.get('type')}, 位置=({x}, {y}), 尺寸={width}x{height}")
        
        logger.info(f"画布尺寸: {canvas_width}x{canvas_height}")
        logger.info(f"目标尺寸: {target_width}x{target_height}")
        
        # 验证参数
        if len(selected_elements) < 2:
            raise HTTPException(status_code=400, detail="至少需要选择2个元素进行排列")
        
        # 确保尺寸为正数
        canvas_width = abs(canvas_width)
        canvas_height = abs(canvas_height)
        target_width = abs(target_width)
        target_height = abs(target_height)
        
        if target_width <= 0 or target_height <= 0:
            raise HTTPException(status_code=400, detail="目标尺寸必须为正数")
        
        if canvas_width <= 0 or canvas_height <= 0:
            raise HTTPException(status_code=400, detail="画布尺寸必须为正数")
        
        # 验证元素数据
        for i, element in enumerate(selected_elements):
            if not all(k in element for k in ['id', 'type', 'x', 'y', 'width', 'height']):
                raise HTTPException(status_code=400, detail=f"元素 {i+1} 缺少必要字段")
            
            # 确保数值字段有效
            for field in ['x', 'y', 'width', 'height']:
                if not isinstance(element[field], (int, float)) or not math.isfinite(element[field]):
                    logger.warning(f"元素 {element.get('id')} 的 {field} 字段无效: {element[field]}")
                    element[field] = 0  # 设置默认值
            
            # 确保尺寸为正数
            element['width'] = abs(element['width'])
            element['height'] = abs(element['height'])
        
        logger.info(f"开始排列 {len(selected_elements)} 个元素")
        logger.info(f"画布尺寸: {canvas_width}x{canvas_height}")
        logger.info(f"目标尺寸: {target_width}x{target_height}")
        
        # 初始化服务
        try:
            service = CanvasLayerArrangementService(api_key=api_key)
        except ValueError as ve:
            logger.error(f"服务初始化失败: {ve}")
            raise HTTPException(status_code=500, detail=f"服务初始化失败: {str(ve)}")
        
        # 执行排列
        try:
            arrangements = await service.arrange_canvas_elements(
                selected_elements=selected_elements,
                canvas_width=canvas_width,
                canvas_height=canvas_height,
                target_width=target_width,
                target_height=target_height
            )
        except ValueError as ve:
            logger.error(f"排列处理失败: {ve}")
            raise HTTPException(status_code=400, detail=f"排列处理失败: {str(ve)}")
        
        # 验证返回结果
        if not arrangements or len(arrangements) == 0:
            logger.warning("排列服务返回空结果")
            raise HTTPException(status_code=500, detail="排列服务返回空结果，请检查 Gemini API 配置")
        
        if len(arrangements) != len(selected_elements):
            logger.warning(f"排列结果数量 ({len(arrangements)}) 与选中元素数量 ({len(selected_elements)}) 不匹配")
        
        logger.info(f"成功生成 {len(arrangements)} 个元素的排列方案")
        
        return {
            "success": True,
            "arrangements": arrangements
        }
        
    except HTTPException as he:
        logger.error(f"HTTP错误: {he.detail}")
        raise he
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"图层排列失败: {e}\n{error_trace}")
        # 提供更详细的错误信息
        error_detail = str(e)
        if "API密钥" in error_detail or "api_key" in error_detail.lower() or "GEMINI_API_KEY" in error_detail:
            error_detail = "需要配置Gemini API密钥，请设置GEMINI_API_KEY环境变量或在请求中提供apiKey参数"
        raise HTTPException(status_code=500, detail=f"图层排列失败: {error_detail}")
```

### 2. 服务层：CanvasLayerArrangementService

**文件位置**: `server/services/canvas_layer_arrangement_service.py`

#### 核心方法：arrange_canvas_elements

```357:424:psd-canvas-jaaz/server/services/canvas_layer_arrangement_service.py
    async def arrange_canvas_elements(self, 
                                    selected_elements: List[Dict[str, Any]],
                                    canvas_width: int,
                                    canvas_height: int,
                                    target_width: int,
                                    target_height: int) -> List[Dict[str, Any]]:
        """
        完整的画布元素排列流程
        
        Args:
            selected_elements: 选中的画布元素列表
            canvas_width: 当前画布宽度
            canvas_height: 当前画布高度
            target_width: 目标宽度
            target_height: 目标高度
            
        Returns:
            调整后的元素信息列表
        """
        logger.info("=== CanvasLayerArrangementService.arrange_canvas_elements 被调用 ===")
        logger.info(msg=f"接收到的参数 - 元素数量: {len(selected_elements)}, 画布尺寸: {canvas_width}x{canvas_height}, 目标尺寸: {target_width}x{target_height}")
        try:
            logger.info(f"开始处理画布元素排列，元素数量: {len(selected_elements)}")
            logger.info(f"画布尺寸: {canvas_width}x{canvas_height}")
            logger.info(f"目标尺寸: {target_width}x{target_height}")
            
            # 验证和清理元素数据
            cleaned_elements: List[Dict[str, Any]] = self._clean_element_data(selected_elements)
            
            # 生成提示词
            prompt = self.generate_arrangement_prompt(
                cleaned_elements, canvas_width, canvas_height, 
                target_width, target_height
            )
            
            logger.info("生成提示词完成，准备调用Gemini API")
            
            # 调用Gemini API
            response_text = await self.call_gemini_api(prompt)
            
            logger.info("Gemini API调用完成，准备解析响应")
            logger.debug(f"Gemini API响应内容: {response_text[:50]}...")
            
            # 解析响应
            arrangements = self.parse_gemini_response(response_text)
            
            logger.info(f"成功生成 {len(arrangements)} 个元素的调整方案")
            
            # 转换格式：将 left/top/right/bottom 转换为 x/y/width/height
            # 并确保 id 是字符串格式，匹配前端期望
            converted_arrangements = self._convert_arrangements_format(arrangements, selected_elements)
            
            logger.info(f"转换后的排列方案数量: {len(converted_arrangements)}")
            if converted_arrangements:
                logger.info(f"第一个排列方案示例: {converted_arrangements[0]}")
            else:
                logger.error("转换后的排列方案为空，可能是 ID 匹配失败或格式转换问题")
                raise ValueError("无法转换排列方案格式，请检查 Gemini API 返回的数据格式")
            
            # 验证转换后的数据格式
            if len(converted_arrangements) < len(selected_elements):
                logger.warning(f"转换后的排列方案数量 ({len(converted_arrangements)}) 少于原始元素数量 ({len(selected_elements)})")
            
            return converted_arrangements
            
        except Exception as e:
            logger.error(f"画布元素排列失败: {e}")
            raise
```

#### 关键方法说明

1. **generate_arrangement_prompt** (第120-213行)
   - 生成详细的AI提示词
   - 包含元素信息表格
   - 定义调整规则和策略

2. **call_gemini_api** (第251-306行)
   - 调用Gemini 2.5 Pro模型
   - 使用流式API获取响应
   - 处理错误和异常

3. **parse_gemini_response** (第308-355行)
   - 解析JSON响应
   - 支持多种JSON格式（直接JSON、代码块中的JSON等）
   - 错误处理和日志记录

4. **_convert_arrangements_format** (第426-528行)
   - 将Gemini返回的格式转换为前端期望的格式
   - 处理left/top/right/bottom到x/y/width/height的转换
   - ID匹配和验证

5. **_clean_element_data** (第530-565行)
   - 清理和验证元素数据
   - 确保坐标和尺寸有效
   - 处理无效值

---

## 数据流程

### 完整调用链路

```
┌─────────────────────────────────────────────────────────────┐
│  前端：CanvasSmartArrangeButton                              │
│  └─ handleArrangeLayers()                                   │
│     ├─ 计算画布尺寸                                          │
│     ├─ 准备请求数据                                          │
│     └─ 调用 arrangeCanvasElements()                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  前端API：upload.ts                                           │
│  └─ arrangeCanvasElements()                                 │
│     └─ POST /api/psd/arrange-layers                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  后端路由：layer_arrangement_router.py                     │
│  └─ arrange_layers()                                         │
│     ├─ 解析请求参数                                          │
│     ├─ 验证数据有效性                                        │
│     └─ 调用服务层                                            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  后端服务：CanvasLayerArrangementService                    │
│  └─ arrange_canvas_elements()                                │
│     ├─ _clean_element_data()                                │
│     ├─ generate_arrangement_prompt()                        │
│     ├─ call_gemini_api() ──────┐                            │
│     ├─ parse_gemini_response() │                            │
│     └─ _convert_arrangements_format()                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Gemini 2.5 Pro API                                         │
│  └─ 生成智能排列方案                                         │
│     └─ 返回JSON格式的排列结果                                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  后端返回响应                                                │
│  └─ { success: true, arrangements: [...] }                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  前端：处理响应并更新画布                                    │
│  └─ 创建新元素 (应用resize)                                  │
│     ├─ x: new_coords.x + offsetX                            │
│     ├─ y: new_coords.y + offsetY                            │
│     ├─ width: new_coords.width   ← Resize                   │
│     ├─ height: new_coords.height ← Resize                  │
│     └─ excalidrawAPI.updateScene()                          │
└─────────────────────────────────────────────────────────────┘
```

### Resize数据转换

1. **后端返回格式**:
```json
{
  "new_coords": {
    "x": 100,
    "y": 200,
    "width": 300,    // Resize后的宽度
    "height": 400   // Resize后的高度
  }
}
```

2. **前端应用Resize**:
```typescript
const newElement = {
  ...originalElement,
  x: arrangement.new_coords.x + offsetX,
  y: arrangement.new_coords.y + offsetY,
  width: arrangement.new_coords.width,   // ← 应用resize
  height: arrangement.new_coords.height,  // ← 应用resize
}
```

3. **画布更新**:
```typescript
excalidrawAPI.updateScene({
  elements: [...currentElements, ...newElements]
})
```

---

## 关键代码位置

### 前端代码

| 功能 | 文件路径 | 关键行数 |
|------|----------|----------|
| 主按钮组件 | `react/src/components/canvas/pop-bar/CanvasSmartArrangeButton.tsx` | 27-231 |
| Resize应用逻辑 | `react/src/components/canvas/pop-bar/CanvasSmartArrangeButton.tsx` | 148-167 |
| 画布更新 | `react/src/components/canvas/pop-bar/CanvasSmartArrangeButton.tsx` | 186-206 |
| API调用 | `react/src/api/upload.ts` | 259-271 |
| 对话框组件 | `react/src/components/canvas/LayerArrangementDialog.tsx` | 全文件 |

### 后端代码

| 功能 | 文件路径 | 关键行数 |
|------|----------|----------|
| API路由 | `server/routers/layer_arrangement_router.py` | 24-150 |
| 核心服务类 | `server/services/canvas_layer_arrangement_service.py` | 53-565 |
| 排列主方法 | `server/services/canvas_layer_arrangement_service.py` | 357-424 |
| Gemini调用 | `server/services/canvas_layer_arrangement_service.py` | 251-306 |
| 格式转换 | `server/services/canvas_layer_arrangement_service.py` | 426-528 |

### 路由注册

**文件**: `server/main.py` (第82行)

```python
app.include_router(layer_arrangement_router.router)
```

---

## 技术细节

### Resize实现原理

1. **非破坏性设计**
   - 保留原始元素
   - 创建新元素应用resize结果
   - 使用唯一ID区分新旧元素

2. **坐标计算**
   - 原始坐标 + 排列后的相对坐标 + 偏移量
   - X偏移：使新图层与原图层并排显示
   - Y偏移：顶部对齐

3. **尺寸应用**
   - 直接使用Gemini返回的新尺寸
   - 保持等比例缩放（由AI确保）
   - 确保不超出目标画布范围

### 错误处理

- **前端**: try-catch捕获API错误，显示toast提示
- **后端**: HTTPException处理验证错误，详细日志记录
- **Gemini API**: 重试机制和错误恢复

### 性能优化

- **前端**: 使用React.memo优化组件渲染
- **后端**: 异步处理，支持流式响应
- **日志**: 分级日志，便于调试和监控

---

## 总结

画布图层智能排列与Resize功能通过以下方式实现：

1. **前端**: 用户选择元素 → 设置目标尺寸 → 调用API → 接收排列结果 → 创建新元素应用resize → 更新画布
2. **后端**: 接收请求 → 验证数据 → 调用Gemini API → 解析响应 → 格式转换 → 返回结果
3. **Resize**: 通过更新元素的`width`和`height`属性实现，Excalidraw API自动处理渲染更新

该设计实现了非破坏性的智能排列，用户可以随时对比原图和新排列结果。




