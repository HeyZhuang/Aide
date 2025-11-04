import { Separator } from '@/components/ui/separator'
import { useCanvas } from '@/contexts/canvas'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import CanvasMenuButton from './CanvasMenuButton'
import { ToolType } from './CanvasMenuIcon'
import { PSDCanvasUploader } from '../PSDCanvasUploader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Type, Layers, Settings, Eye, EyeOff, Edit3, Bookmark, X, ChevronDown, ChevronRight } from 'lucide-react'
import { TemplateManager } from '@/components/template/TemplateManager'
import { applyTemplateToExcalidraw } from '@/utils/templateCanvas'
import { FontSelector } from '../FontSelector'
import { FontItem } from '@/api/font'
import { toast } from 'sonner'

import { uploadPSD, uploadImage, updateLayerProperties, type PSDUploadResponse, type PSDLayer } from '@/api/upload'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, AlertCircle } from 'lucide-react'

interface CanvasToolMenuProps {
  canvasId: string
}

const CanvasToolMenu = ({ canvasId }: CanvasToolMenuProps) => {
  const { t } = useTranslation()
  const { excalidrawAPI } = useCanvas()

  const [activeTool, setActiveTool] = useState<ToolType | undefined>(undefined)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showFontSelector, setShowFontSelector] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [currentFont, setCurrentFont] = useState<string>('Arial')
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
  // 用于跟踪手型/选择工具切换状态
  const [isHandToolActive, setIsHandToolActive] = useState(false)

  // 图层列表相关状态
  const [showLayerList, setShowLayerList] = useState(false)
  const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'text' | 'layer' | 'group'>('all')
  const [canvasElements, setCanvasElements] = useState<ExcalidrawElement[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)

  // Resize功能相关状态
  const [showResizeTool, setShowResizeTool] = useState(false)
  const [targetWidth, setTargetWidth] = useState<number>(800)
  const [targetHeight, setTargetHeight] = useState<number>(600)
  const [apiKey, setApiKey] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [result, setResult] = useState<PSDUploadResponse | null>(null)
  const [error, setError] = useState<string>('')

  // 形状工具相关状态
  const [selectedShapeTool, setSelectedShapeTool] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<string>('hand')

  // 用于跟踪菜单元素的引用
  const uploadButtonRef = useRef<HTMLDivElement>(null);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const shapeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 判断是否选中了形状工具
  const isShapeToolSelected = ['rectangle', 'circle', 'triangle', 'star', 'image'].includes(selectedTool)
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false)

  const handleToolChange = (tool: ToolType) => {
    // 将本地 ToolType 映射为 Excalidraw 合法的 active-tool type
    const toExcalidrawTool = (t: ToolType): Exclude<ToolType, 'plus'> => {
      // 'plus' 只是 UI 上的占位，实际应切换到 selection
      if (t === 'plus') return 'selection'
      return t
    }
    excalidrawAPI?.setActiveTool({ type: toExcalidrawTool(tool) })
  }

  // 点击外部区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 关闭上传菜单
      if (showUploadMenu && uploadButtonRef.current && uploadMenuRef.current) {
        if (!uploadButtonRef.current.contains(event.target as Node) && !uploadMenuRef.current.contains(event.target as Node)) {
          setShowUploadMenu(false);
        }
      }

      // 关闭形状菜单
      if (showShapeMenu && shapeButtonRef.current && shapeMenuRef.current) {
        if (!shapeButtonRef.current.contains(event.target as Node) && !shapeMenuRef.current.contains(event.target as Node)) {
          setShowShapeMenu(false);
        }
      }
    };

    // 添加事件监听器
    document.addEventListener('mousedown', handleClickOutside);

    // 清理事件监听器
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUploadMenu, showShapeMenu]);

  excalidrawAPI?.onChange((_elements, appState, _files) => {
    setActiveTool(appState.activeTool.type as ToolType)
  })

  const handlePSDUploaded = (psdData: PSDUploadResponse) => {
    console.log('PSD uploaded:', psdData)
    setPsdData(psdData)
    // 可以在這裡添加額外的處理邏輯
  }

  // 处理图片上传并添加到画布
  const handleImageUploaded = async (file: File) => {
    if (!excalidrawAPI) {
      toast.error('画布API不可用')
      return
    }

    try {
      // 先转换为Base64（使用本地文件，更快）
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 获取图片尺寸
      const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          resolve({ width: img.width, height: img.height })
        }
        img.onerror = reject
        img.src = dataURL
      })

      // 同时上传图片到服务器（异步，不阻塞添加画布）
      uploadImage(file).then(result => {
        console.log('图片已上传到服务器:', result)
      }).catch(error => {
        console.warn('图片上传到服务器失败（不影响画布显示）:', error)
      })

      // 生成唯一的文件ID
      const fileId = `uploaded-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as any

      // 创建Excalidraw文件数据
      const fileData = {
        mimeType: (file.type || 'image/png') as any,
        id: fileId,
        dataURL: dataURL as any,
        created: Date.now()
      }

      // 添加到Excalidraw文件系统
      excalidrawAPI.addFiles([fileData])
      console.log('文件已添加到Excalidraw:', fileId)

      // 等待文件完全加载
      await new Promise(resolve => setTimeout(resolve, 200))

      // 获取当前画布元素和状态
      const currentElements = excalidrawAPI.getSceneElements()
      const appState = excalidrawAPI.getAppState()
      const canvasWidth = appState.width || 800
      const canvasHeight = appState.height || 600

      // 计算居中位置
      const centerX = (canvasWidth - imageDimensions.width) / 2
      const centerY = (canvasHeight - imageDimensions.height) / 2

      // 创建图片元素
      const imageElement = {
        type: 'image' as const,
        id: `uploaded-image-element-${Date.now()}`,
        x: centerX > 0 ? centerX : 100,
        y: centerY > 0 ? centerY : 100,
        width: imageDimensions.width,
        height: imageDimensions.height,
        angle: 0,
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'solid' as const,
        strokeWidth: 0,
        strokeStyle: 'solid' as const,
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        fileId: fileId as any,
        scale: [1, 1] as [number, number],
        status: 'saved' as const,
        index: null,
        crop: null,
      } as any

      // 更新场景，添加新图片元素
      excalidrawAPI.updateScene({
        elements: [...currentElements, imageElement],
      })

      console.log('图片已添加到画布')
      toast.success('图片上传成功并已添加到画布')
    } catch (error) {
      console.error('图片上传失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      toast.error(`图片上传失败: ${errorMessage}`)
    }
  }

  const handleFontSelect = (font: FontItem | string) => {
    let fontFamily: string

    if (typeof font === 'string') {
      fontFamily = font
      setCurrentFont(font)
    } else {
      fontFamily = font.font_family
      setCurrentFont(font.font_family)

      // 动态加载自定义字体
      const fontFace = new FontFace(font.font_family, `url(${font.font_file_url})`)
      fontFace.load().then(() => {
        document.fonts.add(fontFace)
        console.log(`字体 ${font.name} 已加载`)
      }).catch((error) => {
        console.error('Failed to load font:', error)
        toast.error('字体加载失败')
      })
    }

    // 通过CSS变量设置全局字体
    document.documentElement.style.setProperty('--excalidraw-font-family', fontFamily)

    // 同时设置Excalidraw容器的字体
    const excalidrawContainer = document.querySelector('.excalidraw')
    if (excalidrawContainer) {
      (excalidrawContainer as HTMLElement).style.fontFamily = fontFamily
    }

    // 通过CSS强制更新所有文本元素的字体
    setTimeout(() => {
      const textElements = document.querySelectorAll('.excalidraw .excalidraw-element[data-type="text"]')
      textElements.forEach(element => {
        (element as HTMLElement).style.fontFamily = fontFamily
      })
    }, 100)

    toast.success(`已选择字体: ${typeof font === 'string' ? font : font.name}`)
  }

  // 图层列表相关函数
  const getLayerCanvasState = (layerIndex: number) => {
    const canvasElement = canvasElements.find(element =>
      element.customData?.psdLayerIndex === layerIndex
    )

    if (!canvasElement) {
      return {
        exists: false,
        visible: false,
        opacity: 100,
        element: null
      }
    }

    const opacityVisible = canvasElement.opacity > 0
    const customDataVisible = canvasElement.customData?.visible !== false
    const isVisible = opacityVisible && customDataVisible

    return {
      exists: true,
      visible: isVisible,
      opacity: canvasElement.opacity || 100,
      element: canvasElement
    }
  }

  const handleLayerVisibilityToggle = async (layerIndex: number) => {
    if (!psdData || !excalidrawAPI) return

    try {
      const canvasState = getLayerCanvasState(layerIndex)
      const newVisible = !canvasState.visible

      if (canvasState.exists) {
        const currentElements = excalidrawAPI.getSceneElements()
        const updatedElements = currentElements.map(element => {
          if (element.customData?.psdLayerIndex === layerIndex) {
            const originalOpacity = element.customData?.originalOpacity || 100
            return {
              ...element,
              opacity: newVisible ? originalOpacity : 0,
              isDeleted: false,
              customData: {
                ...element.customData,
                visible: newVisible
              }
            }
          }
          return element
        })

        excalidrawAPI.updateScene({
          elements: updatedElements,
          appState: excalidrawAPI.getAppState()
        })

        excalidrawAPI.history.clear()
      } else {
        const updatedLayers = psdData.layers.map((layer) =>
          layer.index === layerIndex ? { ...layer, visible: newVisible } : layer
        )

        await updateLayerProperties(psdData.file_id, layerIndex, {
          visible: newVisible
        })

        setPsdData({
          ...psdData,
          layers: updatedLayers,
        })
      }

      toast.success(`图层可见性已切换为: ${newVisible ? '可见' : '隐藏'}`)
    } catch (error) {
      console.error('更新图层可见性失败:', error)
      toast.error('更新图层可见性失败')
    }
  }

  const handleTextPropertyUpdate = async (layerIndex: number, property: string, value: string | number | boolean) => {
    if (!psdData || !excalidrawAPI) return

    try {
      const canvasState = getLayerCanvasState(layerIndex)

      if (canvasState.exists) {
        const currentElements = excalidrawAPI.getSceneElements()
        const updatedElements = currentElements.map(element => {
          if (element.customData?.psdLayerIndex === layerIndex) {
            // 创建更新对象，而不是直接修改属性
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updates: Partial<ExcalidrawElement> & { [key: string]: any } = {}

            if (property === 'text_content') {
              if (element.type === 'text') {
                // 对于只读属性，我们需要创建一个新对象而不是直接修改
                return {
                  ...element,
                  text: value as string,
                  customData: {
                    ...element.customData,
                    [property]: value
                  }
                }
              }
            } else if (property === 'font_weight') {
              if (element.type === 'text') {
                return {
                  ...element,
                  fontWeight: value === 'bold' ? 600 : 400,
                  customData: {
                    ...element.customData,
                    [property]: value
                  }
                }
              }
            } else if (property === 'font_style') {
              if (element.type === 'text') {
                return {
                  ...element,
                  fontStyle: value === 'italic' ? 'italic' : 'normal',
                  customData: {
                    ...element.customData,
                    [property]: value
                  }
                }
              }
            } else {
              // 对于其他属性，直接更新customData
              return {
                ...element,
                customData: {
                  ...element.customData,
                  [property]: value
                }
              }
            }
          }
          return element
        })

        excalidrawAPI.updateScene({
          elements: updatedElements,
          appState: excalidrawAPI.getAppState()
        })
      } else {
        const updatedLayers = psdData.layers.map((layer) =>
          layer.index === layerIndex ? { ...layer, [property]: value } : layer
        )

        await updateLayerProperties(psdData.file_id, layerIndex, { [property]: value })

        setPsdData({
          ...psdData,
          layers: updatedLayers,
        })
      }

      toast.success('文字属性已更新')
    } catch (error) {
      console.error('更新文字属性失败:', error)
      toast.error('更新文字属性失败')
    }
  }

  // 自动添加PSD图层到画布的函数
  const handleAutoAddLayers = async (psdData: PSDUploadResponse) => {
    if (!excalidrawAPI) {
      console.error('excalidrawAPI 不可用')
      toast.error('画布API不可用')
      return
    }

    try {
      console.log('开始处理 PSD 数据:', psdData)

      // 过滤出可见的图层（排除群组）
      const visibleLayers = psdData.layers.filter(layer =>
        layer.visible !== false && layer.type !== 'group'
      )

      if (visibleLayers.length === 0) {
        toast.warning('没有可添加的图层')
        return
      }

      // 计算画布中心位置
      const appState = excalidrawAPI.getAppState()
      const canvasWidth = appState.width || 800
      const canvasHeight = appState.height || 600
      const canvasCenterX = canvasWidth / 2
      const canvasCenterY = canvasHeight / 2

      // 计算PSD内容的中心位置
      let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity
      visibleLayers.forEach(layer => {
        minLeft = Math.min(minLeft, layer.left)
        minTop = Math.min(minTop, layer.top)
        maxRight = Math.max(maxRight, layer.left + layer.width)
        maxBottom = Math.max(maxBottom, layer.top + layer.height)
      })

      const psdCenterX = (minLeft + maxRight) / 2
      const psdCenterY = (minTop + maxBottom) / 2

      // 计算偏移量使PSD内容居中
      const offsetX = canvasCenterX - psdCenterX
      const offsetY = canvasCenterY - psdCenterY

      // 收集所有要添加的图片元素和文件数据
      const newImageElements: any[] = []
      const newFileData: any[] = []

      // 准备所有图层数据
      for (const layer of visibleLayers) {
        if (!layer.image_url) continue

        try {
          // 获取图片数据
          const response = await fetch(layer.image_url)
          if (!response.ok) {
            console.warn(`获取图层 "${layer.name}" 图片失败: ${response.status}`)
            continue
          }

          const blob = await response.blob()
          const file = new File([blob], `${layer.name}.png`, { type: 'image/png' })

          // 转换为Base64
          const dataURL = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          // 生成文件ID
<<<<<<< HEAD
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fileId = `psd-layer-${layer.index}-${Date.now()}` as any
=======
          const fileId = `psd-layer-${layer.index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
>>>>>>> b1f46578d018559363a59918f36e72f87b92998c

          // 创建文件数据
          const fileData: BinaryFileData = {
            mimeType: 'image/png' as const,
<<<<<<< HEAD
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            id: fileId as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
=======
            id: fileId as any,
>>>>>>> b1f46578d018559363a59918f36e72f87b92998c
            dataURL: dataURL as any,
            created: Date.now()
          }

          // 创建图片元素
          const imageElement = {
            type: 'image' as const,
            id: `psd-layer-element-${layer.index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: layer.left + offsetX,
            y: layer.top + offsetY,
            width: layer.width,
            height: layer.height,
            angle: 0,
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid' as const,
            strokeWidth: 1,
            strokeStyle: 'solid' as const,
            roughness: 1,
            opacity: Math.round((layer.opacity || 255) / 255 * 100),
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 1000000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 1000000),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
<<<<<<< HEAD
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
=======
>>>>>>> b1f46578d018559363a59918f36e72f87b92998c
            fileId: fileId as any,
            scale: [1, 1] as [number, number],
            status: 'saved' as const,
            index: null,
            crop: null,
            customData: {
              psdLayerIndex: layer.index,
              psdFileId: psdData.file_id,
              layerName: layer.name
            }
          } as any
<<<<<<< HEAD
=======

          newFileData.push(fileData)
          newImageElements.push(imageElement)
        } catch (error) {
          console.error(`准备图层 "${layer.name}" 失败:`, error)
        }
      }

      // 逐个添加图层，确保每个图层都正确添加到画布
      if (newFileData.length > 0 && newImageElements.length > 0) {
        try {
          let successfullyAdded = 0

          // 逐个添加文件和图层
          for (let i = 0; i < newFileData.length && i < newImageElements.length; i++) {
            try {
              const fileData = newFileData[i]
              const imageElement = newImageElements[i]

              // 添加文件
              excalidrawAPI.addFiles([fileData])
              
              // 等待文件加载完成
              await new Promise(resolve => setTimeout(resolve, 100))

              // 获取当前画布元素（每次都获取最新的）
              const currentElements = excalidrawAPI.getSceneElements()

              // 检查是否已存在相同ID的元素（防止重复添加）
              const exists = currentElements.some(el => el.id === imageElement.id)
              if (exists) {
                console.warn(`图层 "${imageElement.customData?.layerName}" 已存在，跳过`)
                continue
              }

              // 添加图层元素
              excalidrawAPI.updateScene({
                elements: [...currentElements, imageElement],
              })

              successfullyAdded++
              console.log(`✅ 已添加图层 ${i + 1}/${newImageElements.length}: "${imageElement.customData?.layerName || '未知'}"`)

              // 添加小延迟，确保图层正确添加
              await new Promise(resolve => setTimeout(resolve, 50))
            } catch (error) {
              console.error(`添加图层 ${i + 1} 失败:`, error)
            }
          }
>>>>>>> b1f46578d018559363a59918f36e72f87b92998c

          // 验证最终添加的元素
          const finalElements = excalidrawAPI.getSceneElements()
          const psdElements = finalElements.filter(el => 
            el.customData?.psdFileId === psdData.file_id
          )
          
          console.log(`成功添加 ${psdElements.length} 个图层到画布 (预期: ${newImageElements.length})`)
          
          if (psdElements.length < newImageElements.length) {
            console.warn(`警告: 只添加了 ${psdElements.length}/${newImageElements.length} 个图层`)
          }
        } catch (error) {
          console.error('批量添加图层失败:', error)
          toast.error('添加图层到画布失败')
        }
      }

      toast.success(`PSD文件处理完成，已添加 ${visibleLayers.length} 个图层到画布`)
    } catch (error) {
      console.error('处理PSD文件失败:', error)
      toast.error('处理PSD文件失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 添加缩放后的图片到画布
  const addResizedImageToCanvas = async (imageUrl: string, width: number, height: number) => {
    if (!excalidrawAPI) {
      console.error('excalidrawAPI 不可用')
      toast.error('画布API不可用')
      return
    }

    try {
      console.log('正在添加缩放后的图片到画布:', imageUrl)

      // 获取图片
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status}`)
      }

      const blob = await response.blob()
      const file = new File([blob], `resized_${Date.now()}.png`, { type: 'image/png' })

      // 转换为 Base64
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 生成唯一的文件ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileId = `resized-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as any

      // 创建 Excalidraw 文件数据
      const fileData: BinaryFileData = {
        mimeType: 'image/png' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: fileId as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dataURL: dataURL as any,
        created: Date.now()
      }

      // 添加到 Excalidraw 文件系统
      excalidrawAPI.addFiles([fileData])

      // 等待文件完全加载
      await new Promise(resolve => setTimeout(resolve, 200))

      // 获取当前画布元素
      const currentElements = excalidrawAPI.getSceneElements()

      // 计算画布中心位置
      const appState = excalidrawAPI.getAppState()
      const canvasWidth = appState.width || 800
      const canvasHeight = appState.height || 600
      const centerX = (canvasWidth - width) / 2
      const centerY = (canvasHeight - height) / 2

      // 创建图片元素
      const imageElement = {
        type: 'image' as const,
        id: `resized-${Date.now()}`,
        x: centerX > 0 ? centerX : 100,
        y: centerY > 0 ? centerY : 100,
        width: width,
        height: height,
        angle: 0,
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        fillStyle: 'solid' as const,
        strokeWidth: 1,
        strokeStyle: 'solid' as const,
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1000000),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1000000),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fileId: fileId as any,
        scale: [1, 1] as [number, number],
        status: 'saved' as const,
        index: null,
        crop: null,
        customData: {
          isResizedPSD: true,
          originalPSDFileId: psdData?.file_id,
          resizedAt: Date.now()
        }
      } as any

      // 更新场景，添加新图片元素
      excalidrawAPI.updateScene({
        elements: [...currentElements, imageElement],
      })

      console.log('缩放后的图片已添加到画布')

    } catch (error) {
      console.error('添加图片到画布失败:', error)
      toast.error('添加图片到画布失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // Resize功能相关函数
  //  - 使用服务端直接处理（无需下载大文件）
  const handleResize = async () => {
    if (!psdData) {
      setError('没有可用的PSD数据')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setCurrentStep('正在处理PSD文件...')
    setError('')
    setResult(null)

    try {
      setProgress(10)
      setCurrentStep('正在准备缩放请求...')

      // 使用新的服务端处理API，直接传递file_id，无需下载大文件
      const formData = new FormData()
      formData.append('file_id', psdData.file_id)
      formData.append('target_width', targetWidth.toString())
      formData.append('target_height', targetHeight.toString())
      if (apiKey) {
        formData.append('api_key', apiKey)
      }

      setProgress(30)
      setCurrentStep('正在调用Gemini API分析图层（这可能需要1-2分钟）...')

      console.log('开始智能缩放:', {
        file_id: psdData.file_id,
        target_width: targetWidth,
        target_height: targetHeight,
        original_size: { width: psdData.width, height: psdData.height }
      })

      // 增加超时时间到5分钟（300秒），并添加更好的错误处理
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.warn('请求超时，已取消')
      }, 300000) // 300秒超时

      try {
        // 检查API端点是否可访问
        const resizeResponse = await fetch('/api/psd/resize/resize-by-id', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!resizeResponse.ok) {
          let errorMessage = '缩放失败'
          try {
            const errorData = await resizeResponse.json()
            errorMessage = errorData.detail || errorData.error || errorMessage

            // 检查是否是后端服务器未运行
            if (resizeResponse.status === 502 || resizeResponse.status === 503) {
              errorMessage = '后端服务器未运行或无法访问。请确保后端服务器已启动。'
            }
          } catch {
            errorMessage = `HTTP ${resizeResponse.status}: ${resizeResponse.statusText}`
          }
          throw new Error(errorMessage)
        }

        setProgress(90)
        setCurrentStep('正在处理结果...')

        const resultData = await resizeResponse.json()

        setProgress(95)
        setCurrentStep('正在添加图片到画布...')

        // 自动添加缩放后的图片到画布
        if (resultData.output_url && excalidrawAPI) {
          await addResizedImageToCanvas(
            resultData.output_url,
            resultData.target_size.width,
            resultData.target_size.height
          )
        }

        setProgress(100)
        setCurrentStep('缩放完成')
        setResult(resultData)

        console.log('缩放完成:', resultData)
        toast.success('智能缩放完成！图片已添加到画布')

      } catch (fetchError: unknown) {
        clearTimeout(timeoutId)

        if ((fetchError as Error).name === 'AbortError') {
          throw new Error('处理超时（超过5分钟）。可能原因：\n1. Gemini API响应慢\n2. 图层数量过多\n3. 网络连接问题\n4. 后端服务器未运行\n\n请稍后重试或减少图层数量。')
        }

        // 处理网络错误
        if ((fetchError as Error).message === 'Failed to fetch') {
          throw new Error('无法连接到后端服务器。请确保：\n1. 后端服务器已启动\n2. API路径正确\n3. 网络连接正常')
        }

        throw fetchError
      }

    } catch (err) {
      console.error('PSD缩放错误:', err)

      let errorMessage = err instanceof Error ? err.message : '缩放失败'

      // 检查是否是配额错误
      if (errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('配额')) {
        errorMessage = `🚫 Gemini API 配额已用尽\n\n` +
          `免费配额限制：\n` +
          `• 每分钟：15 次请求\n` +
          `• 每天：1,500 次请求\n\n` +
          `解决方案：\n` +
          `1. ⏰ 等待几分钟后重试\n` +
          `2. 📊 访问配额管理页面查看使用情况\n` +
          `3. 💳 考虑升级到付费计划\n\n` +
          `📎 配额管理：https://ai.dev/usage?tab=rate-limit`
      }

      setError(errorMessage)
      toast.error('智能缩放失败')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadResult = () => {
    if (result && 'output_url' in result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.open((result as any).output_url, '_blank')
    }
  }

  const getLayerIcon = (layer: PSDLayer) => {
    switch (layer.type) {
      case 'text':
        return <Type className="h-3 w-3 text-blue-500" />
      case 'group':
        return <Layers className="h-3 w-3 text-yellow-500" />
      default:
        return <Layers className="h-3 w-3 text-green-500" />
    }
  }

  const getLayerTypeLabel = (layer: PSDLayer) => {
    switch (layer.type) {
      case 'text':
        return '文字'
      case 'group':
        return '群组'
      default:
        return '图层'
    }
  }

  const filteredLayers = psdData?.layers.filter(layer => {
    const matchesSearch = layer.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || layer.type === filterType
    return matchesSearch && matchesFilter
  }).sort((a, b) => a.index - b.index) || []

  // 工具定义现在直接在JSX中使用，不再需要这个数组

  return (
    <>
      <div
        className="absolute left-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 rounded-xl p-1 shadow-lg border border-white/30 bg-white/50 backdrop-blur-md canvas-left-toolbar"
      >
        {/* 手型/选择工具切换按钮 - 默认显示选择工具 */}
        <CanvasMenuButton
          type={isHandToolActive ? 'hand' : 'selection'}
          active={activeTool === (isHandToolActive ? 'hand' : 'selection')}
          onClick={() => {
            const newTool = isHandToolActive ? 'selection' : 'hand';
            handleToolChange(newTool as ToolType);
            setIsHandToolActive(!isHandToolActive);
          }}
          className="h-9 w-9 p-0"
        />

        {/* Frame按钮 */}
        <CanvasMenuButton
          type="frame"
          activeTool={activeTool}
          onClick={() => handleToolChange('frame')}
          className="h-9 w-9 p-0"
        />

        {/* 核心添加按钮 - 上传按钮 */}
        <div className="relative" ref={uploadButtonRef}>
          <CanvasMenuButton
            type="plus" // 使用plus类型作为上传按钮
            activeTool={activeTool}
            onClick={() => {
              // 点击上传按钮时，如果形状菜单是打开的，先关闭形状菜单
              if (showShapeMenu) {
                setShowShapeMenu(false);
              }
              // 切换上传菜单的显示状态
              setShowUploadMenu(!showUploadMenu);
            }}
            className="h-12 w-12 p-0 rounded-full text-white border border-white/30 bg-black/50 backdrop-blur-md hover:bg-gray-800/70 transition-all duration-200 hover:scale-105 shadow-lg"
            iconClassName="size-5 text-white"
          />

          {showUploadMenu && (
            <div
              className="absolute left-16 top-0 z-30 w-48 rounded-xl overflow-hidden shadow-lg backdrop-blur-md border border-white/30"
              ref={uploadMenuRef}
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <div className="p-2 text-sm font-medium text-foreground">{t('canvas:toolbar.menu.addContent')}</div>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-9 text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                onClick={() => {
                  // 触发文件选择器
                  fileInputRef.current?.click();
                  setShowUploadMenu(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 3L12 7M12 3L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 13L12 21M8 17L12 21M16 17L12 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('canvas:toolbar.menu.uploadImage')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-9 text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                onClick={() => {
                  // 上传PSD文件逻辑
                  // 创建一个隐藏的文件输入元素来选择PSD文件
                  const psdInput = document.createElement('input');
                  psdInput.type = 'file';
                  psdInput.accept = '.psd';
                  psdInput.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file && file.name.toLowerCase().endsWith('.psd')) {
                      try {
                        // 使用现有的uploadPSD函数上传文件
                        const result = await uploadPSD(file);
                        console.log('PSD上传成功:', result);

                        // 隐藏上传菜单
                        setShowUploadMenu(false);

                        // 自动添加所有图层到画布
                        await handleAutoAddLayers(result);

                        // 显示成功消息
                        toast.success(`PSD文件"${file.name}"上传成功，已添加图层到画布`);
                      } catch (error) {
                        console.error('PSD上传失败:', error);
                        toast.error('PSD文件上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
                      }
                    } else {
                      toast.error('请选择有效的PSD文件');
                    }
                  };
                  psdInput.click();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('canvas:toolbar.menu.uploadPSD')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-4 py-2 h-9 text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  // 上传模板逻辑
                  setShowUploadMenu(false);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('canvas:toolbar.menu.uploadTemplate')}
              </Button>
            </div>
          )}
        </div>

        {/* 形状选择下拉菜单 */}
        <div className="relative">
          <CanvasMenuButton
            type="rectangle" // 使用rectangle类型作为形状菜单的默认图标
            active={['rectangle', 'ellipse', 'arrow', 'line', 'freedraw'].includes(activeTool || '')}
            onClick={() => {
              // 点击形状菜单时，如果上传菜单是打开的，先关闭上传菜单
              if (showUploadMenu) {
                setShowUploadMenu(false);
              }
              // 切换形状菜单的显示状态
              setShowShapeMenu(!showShapeMenu);
            }}
            className="h-9 w-9 p-0 rounded-lg hover:bg-white/30 backdrop-blur-sm"
          />

          {showShapeMenu && (
            <div
              className="absolute left-16 top-0 z-30 w-64 rounded-xl p-4 shadow-lg backdrop-blur-md border border-white/30"
              ref={shapeMenuRef}
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              <div className="text-base font-medium mb-3 text-foreground">{t('canvas:toolbar.menu.shapeTools')}</div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={activeTool === 'rectangle' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                  onClick={() => {
                    handleToolChange('rectangle');
                    setShowShapeMenu(false);
                  }}
                  title={t('canvas:toolbar.menu.rectangle')}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-xs">{t('canvas:toolbar.menu.rectangle')}</span>
                </Button>
                <Button
                  variant={activeTool === 'ellipse' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                  onClick={() => {
                    handleToolChange('ellipse');
                    setShowShapeMenu(false);
                  }}
                  title={t('canvas:toolbar.menu.circle')}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <ellipse cx="12" cy="12" rx="9" ry="9" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-xs">{t('canvas:toolbar.menu.circle')}</span>
                </Button>
                <Button
                  variant={activeTool === 'arrow' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                  onClick={() => {
                    handleToolChange('arrow');
                    setShowShapeMenu(false);
                  }}
                  title={t('canvas:toolbar.menu.arrow')}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-xs">{t('canvas:toolbar.menu.arrow')}</span>
                </Button>
                <Button
                  variant={activeTool === 'line' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center justify-center p-3 h-auto text-foreground hover:bg-white/30 backdrop-blur-sm transition-all duration-200 rounded-lg"
                  onClick={() => {
                    handleToolChange('line');
                    setShowShapeMenu(false);
                  }}
                  title={t('canvas:toolbar.menu.line')}
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <span className="text-xs">{t('canvas:toolbar.menu.line')}</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 文本工具 */}
        <CanvasMenuButton
          type="text"
          activeTool={activeTool}
          onClick={() => handleToolChange('text')}
          className="h-9 w-9 p-0"
        />

        {/* 画笔工具 */}
        <CanvasMenuButton
          type="freedraw"
          activeTool={activeTool}
          onClick={() => handleToolChange('freedraw')}
          className="h-9 w-9 p-0"
        />
        {/* PSD 上傳按鈕 */}
        {/* <div className="w-6 h-[1px] bg-gray-600 my-1"></div>
        <PSDCanvasUploader
          canvasId={canvasId}
          onPSDUploaded={handlePSDUploaded}
        /> */}
      </div>



      {/* 字体选择器 */}
      <FontSelector
        isOpen={showFontSelector}
        onClose={() => setShowFontSelector(false)}
        currentFont={currentFont}
        onFontSelect={handleFontSelect}
      />

      {/* 隐藏的文件输入元素 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUploaded(file);
          }
          // 清空文件输入，允许重复选择同一个文件
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />
    </>
  )
}

export default CanvasToolMenu


















































































