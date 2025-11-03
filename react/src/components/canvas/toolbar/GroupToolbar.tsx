import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { useCanvas } from '@/contexts/canvas'
import {
  Layers,
  Merge,
  ChevronDown,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Edit3,
  Sparkles
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { LayerArrangementDialog } from '@/components/canvas/LayerArrangementDialog'
import { arrangeCanvasElements, ElementArrangement } from '@/api/upload'
import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export function GroupToolbar() {
  const { excalidrawAPI } = useCanvas()
  const { t } = useTranslation()
  const [showAlignMenu, setShowAlignMenu] = useState(false)
  const [showResizeMenu, setShowResizeMenu] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isArranging, setIsArranging] = useState(false)

  const handleGroup = useCallback(() => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    // 至少需要两个元素才能分组
    if (selectedElements.length < 2) {
      console.log('至少需要选择两个元素才能进行分组')
      return
    }

    // 生成一个新的group ID
    const groupId = `${Date.now()}-${Math.random().toString(36)}`

    // 为选中的元素添加group ID
    const updatedElements = selectedElements.map(element => ({
      ...element,
      groupIds: [...element.groupIds, groupId]
    }))

    // 更新场景中的元素
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })

    console.log(`成功将 ${selectedElements.length} 个元素分组`)
  }, [excalidrawAPI])

  const handleUngroup = useCallback(() => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    // 至少需要一个元素才能取消分组
    if (selectedElements.length < 1) {
      console.log('至少需要选择一个元素才能取消分组')
      return
    }

    // 移除选中元素的最后一个group ID（实现取消分组）
    const updatedElements = selectedElements.map(element => {
      const newElement = { ...element }
      if (newElement.groupIds.length > 0) {
        // 移除最后一个group ID
        newElement.groupIds = newElement.groupIds.slice(0, -1)
      }
      return newElement
    })

    // 更新场景中的元素
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })

    console.log(`成功将 ${selectedElements.length} 个元素取消分组`)
  }, [excalidrawAPI])

  const handleAlign = useCallback((alignment: string) => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    if (selectedElements.length < 2) return

    // 计算边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    selectedElements.forEach(element => {
      minX = Math.min(minX, element.x)
      minY = Math.min(minY, element.y)
      maxX = Math.max(maxX, element.x + element.width)
      maxY = Math.max(maxY, element.y + element.height)
    })

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // 根据对齐类型调整元素位置
    const updatedElements = selectedElements.map(element => {
      const newElement = { ...element }

      switch (alignment) {
        case 'left':
          // 将元素的左侧对齐到整体的最左侧
          newElement.x = minX
          break
        case 'horizontal-center':
          // 将元素的中心对齐到整体的水平中心
          newElement.x = centerX - element.width / 2
          break
        case 'right':
          // 将元素的右侧对齐到整体的最右侧
          newElement.x = maxX - element.width
          break
        case 'top':
          // 将元素的顶部对齐到整体的顶部
          newElement.y = minY
          break
        case 'vertical-center':
          // 将元素的中心对齐到整体的垂直中心
          newElement.y = centerY - element.height / 2
          break
        case 'bottom':
          // 将元素的底部对齐到整体的底部
          newElement.y = maxY - element.height
          break
      }

      return newElement
    })

    // 更新场景
    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        const updatedElement = updatedElements.find(uEl => uEl.id === el.id)
        return updatedElement ? updatedElement : el
      })
    })
  }, [excalidrawAPI])

  // 智能排列函数（调用 Gemini API）
  const handleArrangeLayers = useCallback(async (targetWidth: number, targetHeight: number) => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    // 至少需要2个元素才能进行智能排列
    if (selectedElements.length < 2) {
      toast.error('至少需要选择2个元素才能进行智能排列')
      return
    }

    // 立即关闭弹窗，允许用户继续操作
    setIsDialogOpen(false)

    // 显示加载中的Toast通知，允许用户在后台继续操作
    const toastId = toast.loading(
      `正在智能排列 ${selectedElements.length} 个图层，您可以在后台继续操作...`,
      {
        duration: Infinity, // 不自动关闭
      }
    )

    try {
      setIsArranging(true)

      // 获取当前画布尺寸
      const sceneState = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()

      // 计算当前画布的实际尺寸
      let canvasWidth = appState.width || 800
      let canvasHeight = appState.height || 600

      // 如果有元素，基于元素计算画布边界
      if (sceneState.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        sceneState.forEach(element => {
          minX = Math.min(minX, element.x)
          minY = Math.min(minY, element.y)
          maxX = Math.max(maxX, element.x + element.width)
          maxY = Math.max(maxY, element.y + element.height)
        })
        canvasWidth = maxX - minX
        canvasHeight = maxY - minY
      }

      // 准备请求数据
      const requestData = {
        selectedElements: selectedElements.map(element => ({
          id: element.id,
          type: element.type,
          x: element.x,
          y: element.y,
          width: Math.abs(element.width),
          height: Math.abs(element.height),
          angle: element.angle || 0,
          strokeColor: element.strokeColor,
          backgroundColor: element.backgroundColor,
          fillStyle: element.fillStyle,
          strokeWidth: element.strokeWidth,
        })).filter(element =>
          element.width > 0 &&
          element.height > 0 &&
          isFinite(element.x) &&
          isFinite(element.y) &&
          isFinite(element.width) &&
          isFinite(element.height)
        ),
        canvasWidth: Math.abs(canvasWidth),
        canvasHeight: Math.abs(canvasHeight),
        targetWidth: Math.abs(targetWidth),
        targetHeight: Math.abs(targetHeight),
      }

      // 调用API进行图层排列
      const response = await arrangeCanvasElements(requestData)

      if (response.success) {
        // 获取当前所有画布元素
        const currentElements = excalidrawAPI.getSceneElements()

        // 获取当前选中元素的ID集合
        const selectedElementIds = new Set<string>()
        selectedElements.forEach(element => {
          selectedElementIds.add(String(element.id))
          if (element.customData?.originalElementId) {
            selectedElementIds.add(String(element.customData.originalElementId))
          }
        })

        // 清理之前通过智能缩放创建的图层
        const elementsToKeep = currentElements.filter(element => {
          const elementId = String(element.id)
          const isArrangedElement = element.customData?.isArranged === true

          if (selectedElementIds.has(elementId)) {
            return true
          }

          if (!isArrangedElement) {
            return true
          }

          return false
        })

        const cleanedCount = currentElements.length - elementsToKeep.length
        if (cleanedCount > 0) {
          excalidrawAPI.updateScene({
            elements: elementsToKeep,
          })
        }

        // 计算新图层的位置偏移
        let maxOriginalX = -Infinity
        elementsToKeep.forEach(element => {
          const rightEdge = element.x + element.width
          maxOriginalX = Math.max(maxOriginalX, rightEdge)
        })

        if (maxOriginalX === -Infinity) {
          maxOriginalX = 0
        }

        const spacing = 100
        const offsetX = maxOriginalX + spacing

        let minNewY = Infinity
        response.arrangements.forEach((arr: ElementArrangement) => {
          minNewY = Math.min(minNewY, arr.new_coords.y)
        })

        let minOriginalY = Infinity
        selectedElements.forEach(element => {
          minOriginalY = Math.min(minOriginalY, element.y)
        })

        const offsetY = minOriginalY - minNewY

        // 创建新的排列后的元素
        const newElements: OrderedExcalidrawElement[] = []

        response.arrangements.forEach((arrangement: ElementArrangement) => {
          let originalElement = selectedElements.find(
            elem => String(elem.id) === String(arrangement.id)
          )

          if (!originalElement) {
            const arrangementIdStr = String(arrangement.id).trim()
            originalElement = selectedElements.find(elem => {
              const elemIdStr = String(elem.id).trim()
              return elemIdStr === arrangementIdStr ||
                elemIdStr.includes(arrangementIdStr) ||
                arrangementIdStr.includes(elemIdStr) ||
                elemIdStr.endsWith(arrangementIdStr) ||
                arrangementIdStr.endsWith(elemIdStr)
            })
          }

          if (originalElement && arrangement.new_coords &&
            typeof arrangement.new_coords.width === 'number' &&
            typeof arrangement.new_coords.height === 'number' &&
            arrangement.new_coords.width > 0 &&
            arrangement.new_coords.height > 0) {
            const newId = `${originalElement.id}_arranged_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

            const newElement: OrderedExcalidrawElement = {
              ...originalElement,
              id: newId,
              x: arrangement.new_coords.x + offsetX,
              y: arrangement.new_coords.y + offsetY,
              width: arrangement.new_coords.width,
              height: arrangement.new_coords.height,
              updated: Date.now(),
              versionNonce: Math.floor(Math.random() * 1000000),
              customData: {
                ...(originalElement.customData || {}),
                isArranged: true,
                originalElementId: originalElement.id,
                arrangementTimestamp: Date.now()
              }
            }

            newElements.push(newElement)
          }
        })

        if (newElements.length > 0) {
          const cleanedElements = excalidrawAPI.getSceneElements()

          excalidrawAPI.updateScene({
            elements: [...cleanedElements, ...newElements],
          })

          excalidrawAPI.updateScene({
            appState: {
              selectedElementIds: newElements.reduce((acc, element) => {
                acc[element.id] = true as const
                return acc
              }, {} as Record<string, true>)
            }
          })

          excalidrawAPI.refresh()

          // 更新Toast为成功状态
          toast.success(
            `智能排列完成！已创建 ${newElements.length} 个新图层`,
            { id: toastId }
          )
        } else {
          // 更新Toast为失败状态
          toast.error(
            t('canvas:messages.layerArrangement.arrangementFailed'),
            { id: toastId }
          )
        }
      } else {
        // 更新Toast为失败状态
        toast.error(
          t('canvas:messages.layerArrangement.arrangementFailed'),
          { id: toastId }
        )
      }
    } catch (error) {
      console.error('图层排列失败:', error);
      // 更新Toast为错误状态
      let errorMessage = t('canvas:messages.layerArrangement.arrangementError')
      if (error instanceof Error && error.message.includes('overloaded')) {
        errorMessage = t('canvas:messages.layerArrangement.modelOverloaded')
      }
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsArranging(false)
    }
  }, [excalidrawAPI, t])

  // 简单缩放函数（用于单个元素或不需要智能排列的情况）
  const handleResize = useCallback((width: number, height: number) => {
    if (!excalidrawAPI) return

    // 获取选中的元素
    const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
    const allElements = excalidrawAPI.getSceneElements()
    const selectedElements = allElements.filter(el => selectedElementIds[el.id])

    if (selectedElements.length === 0) return

    // 如果选择2个或更多元素，使用智能排列
    if (selectedElements.length >= 2) {
      handleArrangeLayers(width, height)
      return
    }

    // 单个元素使用简单缩放
    const element = selectedElements[0]

    const newElement = {
      ...element,
      width: width,
      height: height,
      updated: Date.now(),
      versionNonce: Math.floor(Math.random() * 1000000),
    }

    excalidrawAPI.updateScene({
      elements: allElements.map(el => {
        return el.id === element.id ? newElement : el
      })
    })
  }, [excalidrawAPI, handleArrangeLayers])

  // 预设尺寸
  const presetSizes = [
    { name: 'Instagram Post', width: 1080, height: 1080 },
    { name: 'Instagram Story', width: 1080, height: 1920 },
    { name: 'Facebook Post', width: 1200, height: 630 },
    { name: 'Facebook Cover', width: 851, height: 315 },
    { name: 'Twitter Post', width: 1024, height: 512 }
  ]

  const alignments = [
    { icon: AlignStartVertical, label: 'Align Left', value: 'left' },
    { icon: AlignCenterHorizontal, label: 'Horizontal Center', value: 'horizontal-center' },
    { icon: AlignEndVertical, label: 'Align Right', value: 'right' },
    { icon: AlignStartHorizontal, label: 'Align Top', value: 'top' },
    { icon: AlignCenterVertical, label: 'Vertical Center', value: 'vertical-center' },
    { icon: AlignEndHorizontal, label: 'Align Bottom', value: 'bottom' }
  ]

  return (
    <div className="flex items-center gap-1 bg-white/50 backdrop-blur-md border border-white/30 text-foreground px-2 py-1.5 rounded-xl shadow-lg">
      {/* Group按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
        onClick={handleGroup}
      >
        <Layers className="h-4 w-4 mr-1" />
        <span className="text-xs">Group</span>
      </Button>

      {/* Merge按钮 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg"
        onClick={handleUngroup}
      >
        <Merge className="h-4 w-4 mr-1" />
        <span className="text-xs">Ungroup</span>
      </Button>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* 对齐菜单 */}
      <DropdownMenu open={showAlignMenu} onOpenChange={setShowAlignMenu}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg">
            <AlignCenterHorizontal className="h-4 w-4 mr-1" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-white/50 backdrop-blur-md text-foreground border border-white/30 w-48 rounded-lg"
          align="start"
        >
          {alignments.map((alignment, index) => (
            <div key={alignment.value}>
              <DropdownMenuItem
                onClick={() => {
                  handleAlign(alignment.value)
                  setShowAlignMenu(false)
                }}
                className="hover:bg-white/30 flex items-center gap-2 rounded-md"
              >
                <alignment.icon className="h-4 w-4" />
                <span className="text-xs">{alignment.label}</span>
                <span className="ml-auto text-xs text-foreground">
                  {alignment.value === 'left' && '⌘ H'}
                  {alignment.value === 'vertical-center' && '⌘ V'}
                </span>
              </DropdownMenuItem>
              {index === 2 && <DropdownMenuSeparator className="bg-border" />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-5 bg-white/30" />

      {/* Resize按钮 */}
      <DropdownMenu open={showResizeMenu} onOpenChange={setShowResizeMenu}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs hover:bg-white/30 backdrop-blur-sm rounded-lg">
            <Edit3 className="h-4 w-4 mr-1" />
            <span className="text-xs">Resize</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-white/50 backdrop-blur-md text-foreground border border-white/30 w-56 p-3 rounded-lg"
          align="start"
        >
          <div className="space-y-3">
            {/* 智能排列选项 */}
            <DropdownMenuItem
              onClick={() => {
                setIsDialogOpen(true)
                setShowResizeMenu(false)
              }}
              className="hover:bg-white/30 flex items-center gap-2 text-xs bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-md"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium">{t('resize.title')}</div>
                <div className="text-gray-400 text-[10px]">{t('resize.ai_description')}</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/30" />

            <div className="text-xs font-medium text-foreground/70 uppercase">预设尺寸</div>
            {presetSizes.map((preset) => (
              <DropdownMenuItem
                key={preset.name}
                onClick={() => {
                  handleResize(preset.width, preset.height)
                  setShowResizeMenu(false)
                }}
                className="hover:bg-white/30 flex items-center gap-2 text-xs rounded-md"
              >
                <div className="flex-1">
                  <div className="font-medium">{preset.name}</div>
                </div>
                <div className="text-foreground">
                  {preset.width} × {preset.height}
                </div>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="bg-white/30" />

            {/* 自定义尺寸 */}
            <div className="text-xs font-medium text-foreground uppercase mb-2">自定义尺寸</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="W"
                  className="h-7 bg-white/50 backdrop-blur-sm border border-white/30 text-foreground text-xs rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      const width = parseInt(target.value)
                      const heightInput = target.parentElement?.nextElementSibling?.nextElementSibling?.firstChild as HTMLInputElement
                      const height = parseInt(heightInput?.value || '0')
                      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                        handleResize(width, height)
                        setShowResizeMenu(false)
                      }
                    }
                  }}
                />
              </div>
              <span className="text-xs">×</span>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="H"
                  className="h-7 bg-white/50 backdrop-blur-sm border border-white/30 text-foreground text-xs rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      const height = parseInt(target.value)
                      const widthInput = target.parentElement?.previousElementSibling?.previousElementSibling?.firstChild as HTMLInputElement
                      const width = parseInt(widthInput?.value || '0')
                      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                        handleResize(width, height)
                        setShowResizeMenu(false)
                      }
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border border-white/30 text-foreground hover:bg-white/30 backdrop-blur-sm rounded-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  const widthInput = e.currentTarget.parentElement?.previousElementSibling?.previousElementSibling?.firstChild as HTMLInputElement
                  const heightInput = e.currentTarget.parentElement?.previousElementSibling?.nextElementSibling?.firstChild as HTMLInputElement
                  const width = parseInt(widthInput?.value || '0')
                  const height = parseInt(heightInput?.value || '0')
                  if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                    handleResize(width, height)
                    setShowResizeMenu(false)
                  }
                }}
              >
                应用
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 智能排列对话框 */}
      <LayerArrangementDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onArrange={handleArrangeLayers}
        isArranging={isArranging}
        selectedCount={(() => {
          if (!excalidrawAPI) return 0
          const selectedElementIds = excalidrawAPI.getAppState().selectedElementIds
          const allElements = excalidrawAPI.getSceneElements()
          return allElements.filter(el => selectedElementIds[el.id]).length
        })()}
      />
    </div>
  )
}