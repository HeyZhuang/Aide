import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useCanvas } from '@/contexts/canvas'
import {
  Layers,
  Crop,
  Scissors,
  Lock,
  Unlock,
  ChevronDown
} from 'lucide-react'
import { ExcalidrawImageElement } from '@excalidraw/excalidraw/element/types'

interface ImageToolbarProps {
  selectedElement: ExcalidrawImageElement
}

export function ImageToolbar({ selectedElement }: ImageToolbarProps) {
  const { excalidrawAPI } = useCanvas()
  const [opacity, setOpacity] = useState(100)
  const [cornerRadius, setCornerRadius] = useState(0)
  const [layersOpen, setLayersOpen] = useState(false)
  const [cropMode, setCropMode] = useState(false)
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 100, height: 100 })
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(1)
  const layersRef = useRef<HTMLDivElement>(null)

  // 使用 ref 存储当前选中元素的 ID，避免依赖整个对象
  const selectedElementIdRef = useRef<string>(selectedElement.id)

  // 从选中元素同步状态
  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
      setOpacity(selectedElement.opacity || 100)
      setCornerRadius(selectedElement.roundness?.value || 0)
    }
  }, [selectedElement?.opacity, selectedElement?.roundness])

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layersRef.current && !layersRef.current.contains(event.target as Node)) {
        setLayersOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 更新图片属性 - 只依赖 excalidrawAPI，使用 ref 获取元素 ID
  const updateImageElement = useCallback((updates: Partial<ExcalidrawImageElement>) => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const elementIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)

    if (elementIndex === -1) return

    // 只更新目标元素，避免遍历整个数组
    const updatedElement = {
      ...elements[elementIndex],
      ...updates,
      versionNonce: elements[elementIndex].versionNonce + 1
    }

    const updatedElements = [
      ...elements.slice(0, elementIndex),
      updatedElement,
      ...elements.slice(elementIndex + 1)
    ]

    excalidrawAPI.updateScene({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      elements: updatedElements as any
    })
  }, [excalidrawAPI])

  const handleOpacityChange = (value: number) => {
    setOpacity(value)
    updateImageElement({ opacity: value })
  }

  const handleCornerRadiusChange = (value: number) => {
    setCornerRadius(value)
    updateImageElement({
      roundness: { type: 3, value: value }
    })
  }

  const handleLayerAction = (action: string) => {
    if (!excalidrawAPI || !selectedElement) return

    const elements = excalidrawAPI.getSceneElements()
    const currentIndex = elements.findIndex(el => el.id === selectedElement.id)

    if (currentIndex === -1) return

    const newElements = [...elements]
    const [element] = newElements.splice(currentIndex, 1)

    switch (action) {
      case 'sendToBack':
        newElements.unshift(element)
        break
      case 'sendBackward':
        if (currentIndex > 0) {
          newElements.splice(currentIndex - 1, 0, element)
        } else {
          newElements.splice(currentIndex, 0, element)
        }
        break
      case 'bringForward':
        if (currentIndex < elements.length - 1) {
          newElements.splice(currentIndex + 1, 0, element)
        } else {
          newElements.splice(currentIndex, 0, element)
        }
        break
      case 'bringToFront':
        newElements.push(element)
        break
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    excalidrawAPI.updateScene({ elements: newElements as any })
    excalidrawAPI.refresh()
    setLayersOpen(false)
  }

  const handleRemoveBackground = () => {
    console.log('Remove Background')
    // TODO: 实现移除背景功能
  }

  const handleCrop = () => {
    if (!excalidrawAPI || !selectedElement) return;

    // 调用Excalidraw原生的裁剪功能
    console.log("Activating Excalidraw native crop tool for element:", selectedElement.id);

    // 设置为选择工具，确保选中了图片元素
    excalidrawAPI.setActiveTool({ type: "selection" });

    // Excalidraw的原生裁剪功能通常通过以下方式激活：
    // 1. 选中图片元素
    // 2. 使用快捷键 Ctrl+Shift+C (Windows) 或 Cmd+Shift+C (Mac)
    // 3. 或者通过上下文菜单选择裁剪选项

    // 由于Excalidraw的API没有直接暴露裁剪功能，
    // 我们提示用户使用快捷键来激活原生裁剪工具
    console.log("Please use Ctrl+Shift+C (Windows) or Cmd+Shift+C (Mac) to activate crop tool in Excalidraw");
  }

  const applyCrop = useCallback(async () => {
    // 使用Excalidraw原生裁剪，不需要自定义实现
    // 原生裁剪会直接修改元素的crop属性
    console.log("Using Excalidraw native crop functionality");
    setCropMode(false);
    setAspectRatioLocked(false);
  }, [excalidrawAPI, selectedElement]);

  const cancelCrop = () => {
    setCropMode(false);
    setAspectRatioLocked(false);

    // 取消裁剪模式，回到选择工具
    if (excalidrawAPI) {
      excalidrawAPI.setActiveTool({ type: "selection" });
    }
  }

  // 设置快捷比例
  const setQuickRatio = (ratio: string) => {
    const currentWidth = cropRect.width
    const newWidth = currentWidth
    let newHeight = currentWidth

    switch (ratio) {
      case '1:1':
        newHeight = currentWidth
        setAspectRatio(1)
        setAspectRatioLocked(true)
        break
      case '16:9':
        newHeight = currentWidth * 9 / 16
        setAspectRatio(16 / 9)
        setAspectRatioLocked(true)
        break
      case '4:3':
        newHeight = currentWidth * 3 / 4
        setAspectRatio(4 / 3)
        setAspectRatioLocked(true)
        break
      case '3:2':
        newHeight = currentWidth * 2 / 3
        setAspectRatio(3 / 2)
        setAspectRatioLocked(true)
        break
      case 'free':
        setAspectRatioLocked(false)
        return
    }

    setCropRect(prev => ({
      ...prev,
      width: newWidth,
      height: newHeight
    }))
  }

  // 处理裁剪区域 X 坐标变化
  const handleCropXChange = (newX: number) => {
    if (!selectedElement) return
    const maxX = Math.abs(selectedElement.width) - cropRect.width
    setCropRect(prev => ({ ...prev, x: Math.max(0, Math.min(newX, maxX)) }))
  }

  // 处理裁剪区域 Y 坐标变化
  const handleCropYChange = (newY: number) => {
    if (!selectedElement) return
    const maxY = Math.abs(selectedElement.height) - cropRect.height
    setCropRect(prev => ({ ...prev, y: Math.max(0, Math.min(newY, maxY)) }))
  }

  // 处理裁剪区域宽度变化
  const handleCropWidthChange = (newWidth: number) => {
    if (!selectedElement) return
    const maxWidth = Math.abs(selectedElement.width) - cropRect.x
    const validWidth = Math.max(1, Math.min(newWidth, maxWidth))

    if (aspectRatioLocked) {
      const newHeight = validWidth / aspectRatio
      const maxHeight = Math.abs(selectedElement.height) - cropRect.y
      const validHeight = Math.min(newHeight, maxHeight)
      const adjustedWidth = validHeight * aspectRatio

      setCropRect(prev => ({
        ...prev,
        width: adjustedWidth,
        height: validHeight
      }))
    } else {
      setCropRect(prev => ({ ...prev, width: validWidth }))
    }
  }

  // 处理裁剪区域高度变化
  const handleCropHeightChange = (newHeight: number) => {
    if (!selectedElement) return
    const maxHeight = Math.abs(selectedElement.height) - cropRect.y
    const validHeight = Math.max(1, Math.min(newHeight, maxHeight))

    if (aspectRatioLocked) {
      const newWidth = validHeight * aspectRatio
      const maxWidth = Math.abs(selectedElement.width) - cropRect.x
      const validWidth = Math.min(newWidth, maxWidth)
      const adjustedHeight = validWidth / aspectRatio

      setCropRect(prev => ({
        ...prev,
        width: validWidth,
        height: adjustedHeight
      }))
    } else {
      setCropRect(prev => ({ ...prev, height: validHeight }))
    }
  }

  const handleExtractLayers = () => {
    console.log('Extract Layers')
    // TODO: 实现提取图层功能
  }

  return (
    <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md border border-white/60 text-foreground px-2 py-1.5 rounded-xl shadow-lg">
      {/* 透明度控制 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground">透明度</span>
        <Slider
          value={[opacity]}
          onValueChange={([value]) => handleOpacityChange(value)}
          max={100}
          step={1}
          className="w-24"
        />
        <span className="text-xs text-foreground w-8">{opacity}%</span>
      </div>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 圆角控制 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground">圆角</span>
        <Slider
          value={[cornerRadius]}
          onValueChange={([value]) => handleCornerRadiusChange(value)}
          max={50}
          step={1}
          className="w-24"
        />
        <span className="text-xs text-foreground w-8">{cornerRadius}</span>
      </div>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 图层操作 */}
      <div className="relative" ref={layersRef}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <Layers className="h-3 w-3 mr-1" />
          图层
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>

        {layersOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white/50 backdrop-blur-md border border-white/60 rounded-lg shadow-lg z-10 w-48 py-1">
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/30 text-foreground transition-all duration-200"
              onClick={() => handleLayerAction('sendToBack')}
            >
              置于底层
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/30 text-foreground transition-all duration-200"
              onClick={() => handleLayerAction('sendBackward')}
            >
              下移一层
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/30 text-foreground transition-all duration-200"
              onClick={() => handleLayerAction('bringForward')}
            >
              上移一层
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/30 text-foreground transition-all duration-200"
              onClick={() => handleLayerAction('bringToFront')}
            >
              置于顶层
            </button>
          </div>
        )}
      </div>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 裁剪功能 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
        onClick={handleCrop}
      >
        <Crop className="h-3 w-3 mr-1" />
        裁剪
      </Button>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 移除背景 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
        onClick={handleRemoveBackground}
      >
        <Scissors className="h-3 w-3 mr-1" />
        移除背景
      </Button>
    </div>
  )
}
