import { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { useCanvas } from '@/contexts/canvas'
import { useTranslation } from 'react-i18next'
import {
  Wand2,
  Image as ImageIcon,
  Type,
  Square,
  Circle,
  Diamond,
  Check,
  Layers
} from 'lucide-react'
import { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

interface FrameToolbarProps {
  selectedElement: ExcalidrawElement
}

interface FrameChild {
  id: string
  type: string
  label: string
  x: number
  y: number
  width: number
  height: number
  thumbnail?: string
}

interface MaterialAsset {
  id: string
  name: string
  thumbnail?: string
  type: 'image' | 'template'
}

export function FrameToolbar({ selectedElement }: FrameToolbarProps) {
  const { t } = useTranslation()
  const { excalidrawAPI } = useCanvas()
  const { theme } = useTheme()
  const [isDark, setIsDark] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [frameElements, setFrameElements] = useState<FrameChild[]>([])
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [materialAssets, setMaterialAssets] = useState<MaterialAsset[]>([])
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null)
  const [elementThumbnails, setElementThumbnails] = useState<Map<string, string>>(new Map())
  const [groupedElements, setGroupedElements] = useState<{
    text: FrameChild[]
    image: FrameChild[]
    shape: FrameChild[]
  }>({
    text: [],
    image: [],
    shape: [],
  })

  // 监听主题变化
  useEffect(() => {
    const getActualTheme = (): boolean => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return theme === 'dark'
    }

    const updateTheme = () => {
      setIsDark(getActualTheme())
    }

    updateTheme()

    // 监听系统主题变化
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateTheme)
      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [theme])

  // 使用 ref 存储当前选中元素的 ID
  const selectedElementIdRef = useRef<string>(selectedElement.id)

  useEffect(() => {
    if (selectedElement) {
      selectedElementIdRef.current = selectedElement.id
    }
  }, [selectedElement?.id])

  // 生成元素缩略图
  const generateElementThumbnail = useCallback((el: ExcalidrawElement, width: number, height: number): Promise<string> => {
    return new Promise<string>((resolve) => {
      try {
        const canvas = document.createElement('canvas')
        // 设置合理的缩略图大小
        const maxSize = 40

        // 确保最小尺寸
        const minSize = Math.max(Math.min(width, height), 8)
        const scaledWidth = Math.max(minSize, Math.min(width, maxSize))
        const scaledHeight = Math.max(minSize, Math.min(height, maxSize))

        canvas.width = Math.ceil(scaledWidth)
        canvas.height = Math.ceil(scaledHeight)

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('')
          return
        }

        // 设置背景
        ctx.fillStyle = isDark ? '#2a2a2a' : '#f0f0f0'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 计算缩放比例
        const scaleX = canvas.width / width
        const scaleY = canvas.height / height
        const scale = Math.min(scaleX, scaleY)

        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.scale(scale, scale)
        ctx.translate(-width / 2, -height / 2)

        if (el.type === 'text') {
          const textEl = el as ExcalidrawElement & { text?: string; fontSize?: number }
          ctx.fillStyle = isDark ? '#e0e0e0' : '#333333'
          const fontSize = Math.max(6, Math.min((textEl.fontSize || 14) * scale, 12))
          ctx.font = `${fontSize}px Arial`
          const text = textEl.text?.slice(0, 10) || '文本'
          ctx.fillText(text, 2, height * 0.6)

          ctx.restore()
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl)
        } else if (el.type === 'image') {
          // 对于图片元素，尝试加载实际的图片数据
          const imageEl = el as ExcalidrawElement & { fileId?: string }

          let imageLoaded = false
          if (excalidrawAPI && imageEl.fileId) {
            try {
              const files = excalidrawAPI.getFiles()
              const fileData = files[imageEl.fileId]

              if (fileData && fileData.dataURL) {
                const img = new Image()
                img.onload = () => {
                  // 缩放图片以适应缩略图大小
                  const imgScaleX = width / img.width
                  const imgScaleY = height / img.height
                  const imgScale = Math.min(imgScaleX, imgScaleY)

                  const scaledImgWidth = img.width * imgScale
                  const scaledImgHeight = img.height * imgScale
                  const offsetX = (width - scaledImgWidth) / 2
                  const offsetY = (height - scaledImgHeight) / 2

                  ctx.drawImage(img, offsetX, offsetY, scaledImgWidth, scaledImgHeight)
                  ctx.restore()

                  const dataUrl = canvas.toDataURL('image/png')
                  console.log('Image thumbnail loaded:', {
                    id: imageEl.fileId,
                    width: img.width,
                    height: img.height,
                    dataUrlLength: dataUrl.length,
                  })
                  resolve(dataUrl)
                  imageLoaded = true
                }
                img.onerror = () => {
                  // 图片加载失败，使用占位符
                  drawImagePlaceholder(ctx, width, height)
                  ctx.restore()
                  resolve(canvas.toDataURL('image/png'))
                }
                img.onabort = () => {
                  drawImagePlaceholder(ctx, width, height)
                  ctx.restore()
                  resolve(canvas.toDataURL('image/png'))
                }
                img.crossOrigin = 'anonymous'
                img.src = fileData.dataURL

                // 设置超时时间，如果图片在 2 秒后仍未加载，使用占位符
                setTimeout(() => {
                  if (!imageLoaded) {
                    drawImagePlaceholder(ctx, width, height)
                    ctx.restore()
                    resolve(canvas.toDataURL('image/png'))
                  }
                }, 2000)
              } else {
                drawImagePlaceholder(ctx, width, height)
                ctx.restore()
                resolve(canvas.toDataURL('image/png'))
              }
            } catch (error) {
              console.warn('Failed to load image data:', error)
              drawImagePlaceholder(ctx, width, height)
              ctx.restore()
              resolve(canvas.toDataURL('image/png'))
            }
          } else {
            drawImagePlaceholder(ctx, width, height)
            ctx.restore()
            resolve(canvas.toDataURL('image/png'))
          }
        } else if (['rectangle', 'ellipse', 'diamond'].includes(el.type)) {
          const shapeEl = el as ExcalidrawElement & { strokeColor?: string; backgroundColor?: string }

          // 绘制填充
          if (shapeEl.backgroundColor && shapeEl.backgroundColor !== 'transparent') {
            ctx.fillStyle = shapeEl.backgroundColor
            if (el.type === 'rectangle') {
              ctx.fillRect(0, 0, width, height)
            } else if (el.type === 'ellipse') {
              ctx.beginPath()
              ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI)
              ctx.fill()
            } else if (el.type === 'diamond') {
              ctx.beginPath()
              ctx.moveTo(width / 2, 0)
              ctx.lineTo(width, height / 2)
              ctx.lineTo(width / 2, height)
              ctx.lineTo(0, height / 2)
              ctx.closePath()
              ctx.fill()
            }
          }

          // 绘制边框
          ctx.strokeStyle = shapeEl.strokeColor || '#000000'
          ctx.lineWidth = 1.5

          if (el.type === 'rectangle') {
            ctx.strokeRect(0, 0, width, height)
          } else if (el.type === 'ellipse') {
            ctx.beginPath()
            ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI)
            ctx.stroke()
          } else if (el.type === 'diamond') {
            ctx.beginPath()
            ctx.moveTo(width / 2, 0)
            ctx.lineTo(width, height / 2)
            ctx.lineTo(width / 2, height)
            ctx.lineTo(0, height / 2)
            ctx.closePath()
            ctx.stroke()
          }

          ctx.restore()
          const dataUrl = canvas.toDataURL('image/png')
          resolve(dataUrl)
        } else {
          ctx.restore()
          resolve(canvas.toDataURL('image/png'))
        }
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
        resolve('')
      }
    })
  }, [isDark, excalidrawAPI])

  // 绘制图片占位符
  const drawImagePlaceholder = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = isDark ? '#666' : '#ccc'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, width, height)
    ctx.fillStyle = isDark ? '#444' : '#e8e8e8'
    ctx.fillRect(0, 0, width, height)
    // 添加图片图标
    ctx.fillStyle = isDark ? '#666' : '#999'
    ctx.fillRect(width * 0.3, height * 0.3, width * 0.4, height * 0.4)
  }

  // 获取 Frame 内的所有元素
  const loadFrameElements = useCallback(async () => {
    if (!excalidrawAPI || !selectedElement) return

    const elements = excalidrawAPI.getSceneElements()
    const frameIndex = elements.findIndex(el => el.id === selectedElementIdRef.current)

    if (frameIndex === -1) return

    const frameElement = elements[frameIndex]
    const frameChildren = elements.filter(el => {
      return (
        el.id !== frameElement.id &&
        el.x >= frameElement.x &&
        el.y >= frameElement.y &&
        el.x + el.width <= frameElement.x + frameElement.width &&
        el.y + el.height <= frameElement.y + frameElement.height
      )
    })

    // 转换为 FrameChild 数组 - 并行生成所有缩略图
    const childrenDataPromises = frameChildren.map(async (el: ExcalidrawElement) => {
      let label = ''
      if (el.type === 'text') {
        const textEl = el as ExcalidrawElement & { text?: string }
        label = textEl.text?.slice(0, 30) || '文本'
      } else {
        label = el.type.charAt(0).toUpperCase() + el.type.slice(1)
      }

      // 生成缩略图
      const thumbnail = await generateElementThumbnail(el, el.width, el.height)
      console.log('Element thumbnail:', {
        id: el.id,
        type: el.type,
        hasThumb: !!thumbnail,
        thumbLength: thumbnail?.length || 0,
      })

      return {
        id: el.id,
        type: el.type,
        label,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        thumbnail,
      }
    })

    const childrenData = await Promise.all(childrenDataPromises)

    console.log('Frame elements loaded:', childrenData.length)

    // 按类型分组
    const grouped = {
      text: childrenData.filter(el => el.type === 'text'),
      image: childrenData.filter(el => el.type === 'image'),
      shape: childrenData.filter(el => ['rectangle', 'ellipse', 'diamond'].includes(el.type)),
    }
    setGroupedElements(grouped)
    setFrameElements(childrenData)
  }, [excalidrawAPI, selectedElement, generateElementThumbnail])

  // 加载素材库 - 从 PSDLayerSidebar 中的素材数据
  const loadMaterialAssets = useCallback(async () => {
    try {
      // 使用与PSDLayerSidebar 中相同的素材数据
      const mockPlatformImages = [
        // 素材模板中的图片
        '01-momo-M09-鋪底_專業抗敏護齦牙膏100g-8入+買舒酸定指定品-送_1200x1200.jpg',
        '02-momo-舒酸定-M09-0905,0908-滿888現折100_1200x1200.jpg',
        '04-9288701-好便宜0912-_1200x628.jpg',
        '60000000201964 舒酸定專業抗敏護齦牙膏 100g_正面立體圖.png',
        '60000000201964 舒酸定專業抗敏護齦牙膏 100g_正面立體圖.png',
        '60000000201964 舒酸定專業抗敏護齦牙膏 100g_直式立體圖.png',
        '60000000211457 舒酸定專業抗敏護齦強化琺瑯質牙膏_tube.png',
        'SSD SENSITIVITY_GUM_&_ENAMEL_100_g_正面立體圖.png',
        'SSD SENSITIVITY_GUM_&_ENAMEL_100_g_直式立體圖.png',
        '主圖測試.jpg',
        // 新增的图片
        '1.5倍渗透.png',
        '3重焕齿.png',
        '多效呵护.png'
      ]

      // 直接转换为 MaterialAsset 格式，不生成缩略图
      // 参考 PSDLayerSidebar 的实现，直接加载原始图片
      const assets: MaterialAsset[] = mockPlatformImages.map((imageName, index) => ({
        id: `asset-${index}`,
        name: imageName.replace(/\.\w+$/, ''), // 移除文件扩展名
        type: 'image',
        thumbnail: `/assets/${imageName}`, // 直接使用原图路径
      }))

      setMaterialAssets(assets)
    } catch (error) {
      console.error('加载素材库失败:', error)
      setMaterialAssets([])
    }
  }, [])

  // 获取元素类型的图标
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="h-4 w-4" />
      case 'image':
        return <ImageIcon className="h-4 w-4" />
      case 'rectangle':
        return <Square className="h-4 w-4" />
      case 'ellipse':
        return <Circle className="h-4 w-4" />
      case 'diamond':
        return <Diamond className="h-4 w-4" />
      default:
        return <Square className="h-4 w-4" />
    }
  }

  // 打开弹框
  const handleOpenDialog = useCallback(() => {
    loadFrameElements()
    loadMaterialAssets()
    setShowDialog(true)
    setSelectedElements(new Set())
  }, [loadFrameElements, loadMaterialAssets])

  // 切换素材选择
  const toggleAssetSelection = (assetId: string) => {
    const newSelected = new Set(selectedAssets)
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId)
    } else {
      newSelected.add(assetId)
    }
    setSelectedAssets(newSelected)
  }

  // ... existing code ...
  const toggleElementSelection = (elementId: string) => {
    const newSelected = new Set<string>()
    // 如果点击的是当前选中的元素，取消选择
    if (selectedElements.has(elementId)) {
      // 保持空选中状态
    } else {
      // 选择新的元素（单选模式）
      newSelected.add(elementId)
    }
    setSelectedElements(newSelected)
  }

  // 应用样式到选中的元素
  const applyStylesToSelected = useCallback(async () => {
    if (!excalidrawAPI || selectedElements.size === 0) return

    setIsGenerating(true)
    try {
      const elements = excalidrawAPI.getSceneElements()

      const updatedElements = elements.map(el => {
        if (!selectedElements.has(el.id)) return el

        const baseStyles: Partial<ExcalidrawElement> = {
          versionNonce: el.versionNonce + 1,
          updated: Date.now(),
        }

        if (el.type === 'text') {
          return {
            ...el,
            ...baseStyles,
            fontSize: 16,
            fontFamily: 1,
            textAlign: 'left' as const,
            opacity: 100,
          }
        } else if (['rectangle', 'ellipse', 'diamond'].includes(el.type)) {
          return {
            ...el,
            ...baseStyles,
            strokeWidth: 2,
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            opacity: 100,
          }
        } else if (el.type === 'image') {
          return {
            ...el,
            ...baseStyles,
            opacity: 100,
          }
        }

        return el
      })

      excalidrawAPI.updateScene({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elements: updatedElements as any
      })

      console.log(`已对 ${selectedElements.size} 个元素应用样式`)
      setShowDialog(false)
      setSelectedElements(new Set())
    } catch (error) {
      console.error('批量生成样式失败:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [excalidrawAPI, selectedElements])

  // 元素列表项组件
  const ElementListItem = ({ element, isSelected, onToggleSelect, onMouseEnter, onMouseLeave }: {
    element: FrameChild
    isSelected: boolean
    onToggleSelect: () => void
    onMouseEnter: () => void
    onMouseLeave: () => void
  }) => {
    const hasSelection = selectedElements.size > 0
    const isDisabled = hasSelection && !isSelected

    return (
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg border border-border transition-all cursor-pointer gap-2 ${isDisabled ? 'opacity-40 pointer-events-none' : 'hover:bg-accent/50'
          }`}
        onClick={!isDisabled ? onToggleSelect : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          background: isSelected
            ? isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'
            : 'transparent',
        }}
      >
        {/* 元素缩略图 */}
        <div className="w-12 h-12 flex-shrink-0 rounded border border-border bg-muted/40 overflow-hidden relative flex items-center justify-center" style={{
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}>
          {element.thumbnail && element.thumbnail.length > 100 ? (
            <img
              src={element.thumbnail}
              alt={element.label}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn('Thumbnail failed to load:', element.id)
                const img = e.target as HTMLImageElement
                img.style.display = 'none'
              }}
            />
          ) : null}
          {(!element.thumbnail || element.thumbnail.length <= 100) && (
            <div className="flex items-center justify-center text-muted-foreground/70">
              {getElementIcon(element.type)}
            </div>
          )}
        </div>
        {/* 元素信息 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getElementIcon(element.type)}
          <span className="truncate text-sm">{element.label}</span>
          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
            {Math.round(element.width)} × {Math.round(element.height)}
          </Badge>
        </div>
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={!isDisabled ? onToggleSelect : undefined}
          className="cursor-pointer flex-shrink-0 ml-2"
          onClick={(e) => e.stopPropagation()}
          disabled={isDisabled}
        />
      </div>
    )
  }

  return (
    <>
      <div
        className="flex items-center gap-2 backdrop-blur-md border text-foreground px-3 py-1.5 rounded-xl shadow-lg overflow-x-auto max-w-full"
        style={{
          background: isDark ? 'rgba(24, 24, 24, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)',
          color: isDark ? '#F5F5F7' : '#000000',
        }}
      >
        {/* 批量生成样式按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-3 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg flex items-center gap-1.5"
          onClick={handleOpenDialog}
          disabled={isGenerating}
          title={t('canvas:toolbar.frame.generateStyles') || 'Generate Styles'}
        >
          <Wand2 className="h-4 w-4" />
          <span>{isGenerating ? '生成中...' : '批量生成'}</span>
        </Button>
      </div>

      {/* 弹框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent
          className="max-w-4xl h-[80vh] p-0 flex flex-col"
          style={{
            background: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <DialogHeader className="p-4 border-b" style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }}>
            <DialogTitle>批量生成</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* 左侧：Frame 内的元素列表 - 参考 sidebar 风格 */}
            <div className="w-1/2 border-r flex flex-col min-h-0" style={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)',
            }}>
              <div className="p-4 border-b font-semibold text-sm flex items-center gap-2 flex-shrink-0" style={{
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }}>
                <Layers className="h-4 w-4" />
                Frame 元素 <span className="text-xs font-normal text-muted-foreground">({frameElements.length})</span>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 space-y-4 pr-4">
                  {frameElements.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-12 flex flex-col items-center gap-2">
                      <Layers className="h-8 w-8 opacity-30" />
                      <p>暂无元素</p>
                    </div>
                  ) : (
                    <>
                      {/* 文字图层分组 */}
                      {groupedElements.text.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-2 px-2">
                            <Type className="h-3 w-3 text-blue-500" />
                            <span className="text-xs font-semibold text-foreground">文字 ({groupedElements.text.length})</span>
                          </div>
                          <div className="space-y-1">
                            {groupedElements.text.map(element => (
                              <ElementListItem
                                key={element.id}
                                element={element}
                                isSelected={selectedElements.has(element.id)}
                                onToggleSelect={() => toggleElementSelection(element.id)}
                                onMouseEnter={() => setHoveredElementId(element.id)}
                                onMouseLeave={() => setHoveredElementId(null)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 图片图层分组 */}
                      {groupedElements.image.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-2 px-2">
                            <ImageIcon className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-semibold text-foreground">图片 ({groupedElements.image.length})</span>
                          </div>
                          <div className="space-y-1">
                            {groupedElements.image.map(element => (
                              <ElementListItem
                                key={element.id}
                                element={element}
                                isSelected={selectedElements.has(element.id)}
                                onToggleSelect={() => toggleElementSelection(element.id)}
                                onMouseEnter={() => setHoveredElementId(element.id)}
                                onMouseLeave={() => setHoveredElementId(null)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 形状图层分组 */}
                      {groupedElements.shape.length > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-2 px-2">
                            <Square className="h-3 w-3 text-purple-500" />
                            <span className="text-xs font-semibold text-foreground">形状 ({groupedElements.shape.length})</span>
                          </div>
                          <div className="space-y-1">
                            {groupedElements.shape.map(element => (
                              <ElementListItem
                                key={element.id}
                                element={element}
                                isSelected={selectedElements.has(element.id)}
                                onToggleSelect={() => toggleElementSelection(element.id)}
                                onMouseEnter={() => setHoveredElementId(element.id)}
                                onMouseLeave={() => setHoveredElementId(null)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* 右侧：素材库 */}
            <div className="w-1/2 flex flex-col min-h-0" style={{
              background: isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)',
            }}>
              <div className="p-4 border-b font-semibold text-sm flex items-center gap-2 flex-shrink-0" style={{
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }}>
                <ImageIcon className="h-4 w-4" />
                素材库
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 grid grid-cols-2 gap-2.5 pr-4">
                  {materialAssets.length === 0 ? (
                    <div className="col-span-2 text-sm text-muted-foreground text-center py-12 flex flex-col items-center gap-2">
                      <ImageIcon className="h-8 w-8 opacity-30" />
                      <p>暂无素材</p>
                    </div>
                  ) : (
                    materialAssets.map(asset => (
                      <div
                        key={asset.id}
                        className="rounded-xl border bg-gray-50/60 hover:bg-gray-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer aspect-square relative group"
                        style={{
                          background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                        }}
                        title={asset.name}
                      >
                        {/* 缩略图 */}
                        <img
                          src={asset.thumbnail}
                          alt={asset.name}
                          className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                          draggable
                          onLoad={() => {
                            console.log('Material image loaded:', asset.id, asset.name)
                          }}
                          onError={(e) => {
                            console.warn('Material thumbnail failed to load:', asset.id, asset.name, asset.thumbnail)
                            const img = e.target as HTMLImageElement
                            // 加载失败时，使用 SVG 占位符
                            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Cpath d="M50 30C60 30 68 38 68 48C68 58 60 66 50 66C40 66 32 58 32 48C32 38 40 30 50 30ZM50 20C33.4 20 20 33.4 20 50C20 66.6 33.4 80 50 80C66.6 80 80 66.6 80 50C80 33.4 66.6 20 50 20ZM50 75C36.2 75 25 63.8 25 50C25 36.2 36.2 25 50 25C63.8 25 75 36.2 75 50C75 63.8 63.8 75 50 75Z" fill="%23dddddd"/%3E%3C/svg%3E'
                          }}
                        />
                        {/* 右上角多选框 */}
                        <Checkbox
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={() => toggleAssetSelection(asset.id)}
                          className="absolute top-2 right-2 w-5 h-5 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="p-4 border-t gap-2" style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }}>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={applyStylesToSelected}
              disabled={selectedElements.size === 0 || isGenerating}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              应用 ({selectedAssets.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}