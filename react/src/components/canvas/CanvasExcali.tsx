import { saveCanvas } from '@/api/canvas'
import { useCanvas } from '@/contexts/canvas'
import useDebounce from '@/hooks/use-debounce'
import { useTheme } from '@/hooks/use-theme'
import { eventBus } from '@/lib/event'
import * as ISocket from '@/types/socket'
import { CanvasData } from '@/types/types'
import { Excalidraw, convertToExcalidrawElements, exportToCanvas } from '@excalidraw/excalidraw'
import {
  ExcalidrawImageElement,
  ExcalidrawEmbeddableElement,
  OrderedExcalidrawElement,
  Theme,
  NonDeleted,
} from '@excalidraw/excalidraw/element/types'
import '@excalidraw/excalidraw/index.css'
import {
  AppState,
  BinaryFileData,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { VideoElement } from './VideoElement'
import { CanvasTopToolbar } from './toolbar/CanvasTopToolbar'

import '@/assets/style/canvas.css'

// 图片替换相关接口
interface DragImageData {
  type: string;
  image: {
    id: string;
    name: string;
    url: string;
    type?: string;
  };
}

// PSD图层拖拽数据接口
interface DragPsdLayerData {
  type: string;
  layer: {
    index: number;
    name: string;
    image_url: string;
    left: number;
    top: number;
    width: number;
    height: number;
    opacity?: number;
    visible?: boolean;
  };
  psdFileId: string;
}

type LastImagePosition = {
  x: number
  y: number
  width: number
  height: number
  col: number // col index
}

type CanvasExcaliProps = {
  canvasId: string
  initialData?: ExcalidrawInitialDataState
}

const CanvasExcali: React.FC<CanvasExcaliProps> = ({
  canvasId,
  initialData,
}) => {
  const { excalidrawAPI, setExcalidrawAPI } = useCanvas()
  const { authStatus } = useAuth()

  const { i18n } = useTranslation()

  // 所有用户都可以编辑，不启用只读模式
  const viewModeEnabled = false

  // Immediate handler for UI updates (no debounce)
  const handleSelectionChange = (
    elements: Readonly<OrderedExcalidrawElement[]>,
    appState: AppState
  ) => {
    if (!appState) return

    // Check if any selected element is embeddable type
    const selectedElements = elements.filter((element) =>
      appState.selectedElementIds[element.id]
    )
    const hasEmbeddableSelected = selectedElements.some(
      (element) => element.type === 'embeddable'
    )

    // Toggle CSS class to hide/show left panel immediately
    const excalidrawContainer = document.querySelector('.excalidraw')
    if (excalidrawContainer) {
      if (hasEmbeddableSelected) {
        excalidrawContainer.classList.add('hide-left-panel')
      } else {
        excalidrawContainer.classList.remove('hide-left-panel')
      }
    }
  }

  // 辅助函数：加载文件URL为dataURL（使用 useCallback 包装）
  const loadFileAsDataURL = useCallback(async (url: string): Promise<string> => {
    try {
      // 如果已经是dataURL，直接返回
      if (url.startsWith('data:')) {
        return url
      }

      // 如果是相对路径，添加协议和域名
      let fullUrl = url
      if (url.startsWith('/')) {
        fullUrl = window.location.origin + url
      }

      const response = await fetch(fullUrl)
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status}`)
      }

      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('加载文件失败:', url, error)
      throw error
    }
  }, [])

  // 辅助函数：确保所有文件都有dataURL（用于生成缩略图，使用 useCallback 包装）
  const ensureFilesHaveDataURL = useCallback(async (files: BinaryFiles): Promise<BinaryFiles> => {
    const filesWithDataURL: BinaryFiles = {}

    for (const [fileId, file] of Object.entries(files)) {
      if (file.dataURL) {
        // 如果已经有dataURL，检查是否需要加载
        if (file.dataURL.startsWith('data:')) {
          // 已经是base64，直接使用
          filesWithDataURL[fileId] = file
        } else {
          // 是URL，需要加载
          try {
            const dataURL = await loadFileAsDataURL(file.dataURL)
            filesWithDataURL[fileId] = {
              ...file,
              dataURL: dataURL as any,
            }
          } catch (error) {
            console.warn(`无法加载文件 ${fileId}:`, error)
            // 如果加载失败，仍然保留原文件（exportToCanvas可能会处理）
            filesWithDataURL[fileId] = file
          }
        }
      } else {
        // 没有dataURL，保留原文件
        filesWithDataURL[fileId] = file
      }
    }

    return filesWithDataURL
  }, [loadFileAsDataURL])

  // 生成完整画布缩略图的函数（使用 useCallback 包装以避免重复创建）
  const generateCanvasThumbnail = useCallback(async (
    elements: Readonly<OrderedExcalidrawElement[]>,
    appState: AppState,
    files: BinaryFiles
  ): Promise<string> => {
    try {
      // 过滤掉已删除的元素
      const visibleElements = elements.filter((el) => !el.isDeleted)

      // 只有当画布中有元素时才生成缩略图
      if (visibleElements.length === 0) {
        return ''
      }

      // 确保所有文件都有dataURL（用于exportToCanvas）
      const filesWithDataURL = await ensureFilesHaveDataURL(files)

      // 计算所有元素的边界框，确保缩略图包含所有内容
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      visibleElements.forEach((element) => {
        const x = element.x
        const y = element.y
        const width = 'width' in element ? element.width : 0
        const height = 'height' in element ? element.height : 0

        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + width)
        maxY = Math.max(maxY, y + height)
      })

      // 如果所有元素都在同一位置（边界框无效），使用默认值
      if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
        // 使用默认视口
        const defaultAppState = {
          ...appState,
          selectedElementIds: {},
        }
        const canvas = await exportToCanvas({
          elements: visibleElements,
          appState: defaultAppState,
          files: filesWithDataURL,
          mimeType: 'image/png',
          maxWidthOrHeight: 800,
          quality: 0.8,
        })
        return canvas.toDataURL('image/png', 0.8)
      }

      // 计算画布的中心点和尺寸
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      const canvasWidth = maxX - minX
      const canvasHeight = maxY - minY

      // 添加边距（20%）
      const padding = Math.max(canvasWidth, canvasHeight) * 0.2
      const viewportWidth = canvasWidth + padding * 2
      const viewportHeight = canvasHeight + padding * 2

      // 计算缩放比例，确保所有内容都在视图中
      const scale = Math.min(1, 800 / Math.max(viewportWidth, viewportHeight))

      // 调整 appState，使所有元素都在视图中
      const adjustedAppState = {
        ...appState,
        // 清除选中状态，确保缩略图显示所有元素
        selectedElementIds: {},
        // 调整视口位置，使所有元素居中
        scrollX: -centerX + viewportWidth / 2,
        scrollY: -centerY + viewportHeight / 2,
        // 调整缩放，确保所有内容可见
        zoom: {
          value: scale,
        },
        // 设置视口尺寸
        width: viewportWidth,
        height: viewportHeight,
      }

      // 使用 exportToCanvas 导出整个画布（包含所有元素）
      const canvas = await exportToCanvas({
        elements: visibleElements,
        appState: adjustedAppState,
        files: filesWithDataURL, // 使用包含dataURL的文件对象
        mimeType: 'image/png',
        maxWidthOrHeight: 800, // 缩略图最大尺寸800px，保持性能
        quality: 0.8, // 质量0.8，平衡文件大小和清晰度
      })

      // 将 canvas 转换为 base64 作为缩略图
      return canvas.toDataURL('image/png', 0.8)
    } catch (error) {
      console.error('生成画布缩略图失败:', error)
      throw error
    }
  }, [ensureFilesHaveDataURL])

  // 用于保存的去抖处理器（性能优化）
  const handleSave = useDebounce(
    async (
      elements: Readonly<OrderedExcalidrawElement[]>,
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (elements.length === 0 || !appState) {
        return
      }

      // 优化files对象：移除base64数据，只保留必要的元数据和URL引用
      // 这样可以大幅减少保存的数据大小（从27MB减少到几KB）
      // 对于模板图片，它们已经有服务器URL（layer.image_url），不需要保存base64
      const optimizedFiles: BinaryFiles = {}
      for (const [fileId, file] of Object.entries(files)) {
        // 检查是否有服务器URL（如/api/file/xxx 或 /api/psd/...）
        const hasServerUrl = file.dataURL && (
          file.dataURL.startsWith('http://') ||
          file.dataURL.startsWith('https://') ||
          file.dataURL.startsWith('/api/')
        )

        // 如果有服务器URL，只保存URL引用；否则保留base64（但这种情况应该很少）
        // 模板图片应该都已经有URL，所以大部分情况下可以移除base64
        optimizedFiles[fileId] = {
          id: file.id,
          mimeType: file.mimeType,
          created: file.created,
          // 只保留URL引用，移除base64数据以大幅减小数据大小
          ...(hasServerUrl ? { dataURL: file.dataURL } : {}),
        } as any
      }

      const data: CanvasData = {
        elements,
        appState: {
          ...appState,
          collaborators: undefined!,
        },
        files: optimizedFiles, // 使用优化后的files对象
      }

      // 生成包含所有元素的完整画布缩略图
      let thumbnail = ''
      try {
        thumbnail = await generateCanvasThumbnail(elements, appState, files)
      } catch (error) {
        console.error('生成画布缩略图失败:', error)
        // 如果生成失败，尝试使用最新的图片作为后备方案
        const latestImage = elements
          .filter((element) => element.type === 'image' && !element.isDeleted)
          .sort((a, b) => b.updated - a.updated)[0] as ExcalidrawImageElement | undefined
        if (latestImage && latestImage.fileId) {
          const file = files[latestImage.fileId]
          if (file && file.dataURL) {
            // 如果是URL，尝试加载
            if (file.dataURL.startsWith('data:')) {
              thumbnail = file.dataURL
            } else {
              try {
                thumbnail = await loadFileAsDataURL(file.dataURL)
              } catch {
                // 如果加载失败，使用空字符串
                thumbnail = ''
              }
            }
          }
        }
      }

      saveCanvas(canvasId, { data, thumbnail })
    },
    300
  )

  // 同时调用立即函数和去抖函数的组合处理程序
  const handleChange = (
    elements: Readonly<OrderedExcalidrawElement[]>,
    appState: AppState,
    files: BinaryFiles
  ) => {
    // 即时用户界面更新
    handleSelectionChange(elements, appState)
    // 防抖保存操作
    handleSave(elements, appState, files)
  }

  const lastImagePosition = useRef<LastImagePosition | null>(
    localStorage.getItem('excalidraw-last-image-position')
      ? JSON.parse(localStorage.getItem('excalidraw-last-image-position')!)
      : null
  )
  const { theme } = useTheme()

  // 添加自定义类名以便应用我们的CSS修复
  const excalidrawClassName = `excalidraw-custom ${theme === 'dark' ? 'excalidraw-dark-fix' : ''}`

  // 处理拖拽悬停事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 检查是否是图片文件
    const types = Array.from(e.dataTransfer.types);
    if (types.includes('application/json') || types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // 处理拖拽释放事件
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    // 立即阻止所有默认行为和事件传播
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // 获取拖拽的数据
    const dragData = e.dataTransfer.getData('application/json');

    if (!excalidrawAPI) return;

    if (!dragData) {
      console.log('⚠️ 未检测到拖拽数据');
      return;
    }

    try {
      const parsedData = JSON.parse(dragData) as DragImageData | DragPsdLayerData;

      // 处理Library图片拖拽
      if (parsedData.type === 'library-image' && 'image' in parsedData && parsedData.image && parsedData.image.url) {
        console.log('🎨 从Library拖拽的图片:', parsedData.image);

        // 获取鼠标位置下的元素
        const { clientX, clientY } = e;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        // 获取画布容器
        const canvasContainer = document.querySelector('.excalidraw') as HTMLElement;
        if (!canvasContainer) {
          console.error('❌ 未找到画布容器');
          return;
        }

        const containerRect = canvasContainer.getBoundingClientRect();

        // 使用正确的坐标转换公式（参考 Excalidraw 的 viewportCoordsToSceneCoords）
        // 注意: Excalidraw 的 scrollX/scrollY 在向右/向下滚动时是负值
        const sceneX = (clientX - containerRect.left) / appState.zoom.value - appState.scrollX;
        const sceneY = (clientY - containerRect.top) / appState.zoom.value - appState.scrollY;

        console.log('🎯 鼠标场景坐标:', { sceneX, sceneY });
        console.log('📊 画布状态:', {
          zoom: appState.zoom.value,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
          clientX,
          clientY,
          containerLeft: containerRect.left,
          containerTop: containerRect.top
        });

        // 找到鼠标位置下的图片元素 - 从后往前遍历（优先选择最上层的元素）
        let targetElement = null;
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];

          if (el.type !== 'image' || el.isDeleted) continue;

          // 计算元素的边界框
          const elementLeft = el.x;
          const elementTop = el.y;
          const elementRight = el.x + el.width;
          const elementBottom = el.y + el.height;

          console.log(`🔍 检查图片元素 ${el.id}:`, {
            bounds: { left: elementLeft, top: elementTop, right: elementRight, bottom: elementBottom },
            mouseIn: sceneX >= elementLeft && sceneX <= elementRight && sceneY >= elementTop && sceneY <= elementBottom
          });

          // 判断鼠标是否在图片元素范围内
          if (sceneX >= elementLeft &&
            sceneX <= elementRight &&
            sceneY >= elementTop &&
            sceneY <= elementBottom) {
            targetElement = el;
            break; // 找到最上层的元素后立即停止
          }
        }

        // 如果找到了目标图片元素，则替换它
        if (targetElement) {
          console.log('✅ 找到目标图片元素:', {
            id: targetElement.id,
            position: { x: targetElement.x, y: targetElement.y },
            size: { width: targetElement.width, height: targetElement.height }
          });

          // 创建新的图片文件
          try {
            console.log('🔄 开始替换图片...');

            // 获取新图片的数据
            let dataURL = parsedData.image.url;
            let mimeType = 'image/png';

            // 如果是相对路径，需要fetch获取blob
            if (!dataURL.startsWith('data:')) {
              const response = await fetch(parsedData.image.url);
              const blob = await response.blob();
              mimeType = blob.type;

              // 转换为DataURL
              dataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }

            // 获取新图片的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 新图片原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 获取被替换图片的尺寸作为参考
            const targetWidth = targetElement.width;
            const targetHeight = targetElement.height;
            const targetRatio = targetWidth / targetHeight;

            console.log('📐 目标图片尺寸:', { width: targetWidth, height: targetHeight, ratio: targetRatio });

            // 计算保持宽高比的新尺寸
            let finalWidth: number;
            let finalHeight: number;

            if (newImageRatio > targetRatio) {
              // 新图片更宽，以宽度为基准
              finalWidth = targetWidth;
              finalHeight = targetWidth / newImageRatio;
            } else {
              // 新图片更高，以高度为基准
              finalHeight = targetHeight;
              finalWidth = targetHeight * newImageRatio;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('📁 新文件ID:', fileId);

            // 添加新图片文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 保留原图片的位置，使用计算后的尺寸
            const replacementElement: any = {
              ...targetElement,
              fileId: fileId as any,
              width: finalWidth,
              height: finalHeight,
              updated: Date.now(),
              version: (targetElement.version || 0) + 1,
              versionNonce: Math.floor(Math.random() * 1000000000)
            };

            // 更新场景
            const updatedElements = elements.map(el =>
              el.id === targetElement.id ? replacementElement : el
            );

            excalidrawAPI.updateScene({ elements: updatedElements as any });
            console.log('✅ 图片替换成功！');
          } catch (error) {
            console.error('❌ 图片替换失败:', error);
            alert('替换图片失败，请重试');
          }
        } else {
          // 如果没有找到目标图片元素，在鼠标位置添加新图片
          console.log('📍 鼠标位置下没有图片元素，将在此位置添加新图片');

          try {
            // 获取新图片的数据
            let dataURL = parsedData.image.url;
            let mimeType = 'image/png';

            // 如果是相对路径，需要fetch获取blob
            if (!dataURL.startsWith('data:')) {
              const response = await fetch(parsedData.image.url);
              const blob = await response.blob();
              mimeType = blob.type;

              // 转换为DataURL
              dataURL = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }

            // 获取新图片的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 新图片原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 计算保持宽高比的适当尺寸（默认最大宽度300）
            const maxWidth = 300;
            let finalWidth: number;
            let finalHeight: number;

            if (newImageWidth > maxWidth) {
              // 图片较大，需要缩放
              finalWidth = maxWidth;
              finalHeight = maxWidth / newImageRatio;
            } else {
              // 使用原始尺寸
              finalWidth = newImageWidth;
              finalHeight = newImageHeight;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // 添加文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 在鼠标位置创建新图片元素
            const newImageElement: any = {
              id: `image-${fileId}`,
              type: 'image' as const,
              x: sceneX - finalWidth / 2, // 图片中心对齐鼠标位置
              y: sceneY - finalHeight / 2,
              width: finalWidth,
              height: finalHeight,
              angle: 0,
              strokeColor: 'transparent',
              backgroundColor: 'transparent',
              fillStyle: 'solid' as const,
              strokeWidth: 1,
              strokeStyle: 'solid' as const,
              roughness: 0,
              opacity: 100,
              fileId: fileId as any,
              scale: [1, 1] as [number, number],
              status: 'saved' as const,
              locked: false,
              version: 1,
              versionNonce: Math.floor(Math.random() * 1000000000),
              isDeleted: false,
              groupIds: [],
              boundElements: null,
              updated: Date.now(),
              link: null,
              customData: {
                libraryImage: true,
                imageName: parsedData.image.name
              }
            };

            // 添加到画布
            excalidrawAPI.updateScene({
              elements: [...elements, newImageElement]
            });

            console.log('✅ 新图片已添加到画布');
          } catch (error) {
            console.error('❌ 添加图片失败:', error);
          }
        }
      }
      // 处理PSD图层拖拽
      else if (parsedData.type === 'psd-layer' && 'layer' in parsedData && parsedData.layer && parsedData.layer.image_url) {
        console.log('🎨 从PSD拖拽的图层:', parsedData.layer);

        // 获取鼠标位置下的元素
        const { clientX, clientY } = e;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();

        // 获取画布容器
        const canvasContainer = document.querySelector('.excalidraw') as HTMLElement;
        if (!canvasContainer) {
          console.error('❌ 未找到画布容器');
          return;
        }

        const containerRect = canvasContainer.getBoundingClientRect();

        // 使用正确的坐标转换公式（参考 Excalidraw 的 viewportCoordsToSceneCoords）
        // 注意: Excalidraw 的 scrollX/scrollY 在向右/向下滚动时是负值
        const sceneX = (clientX - containerRect.left) / appState.zoom.value - appState.scrollX;
        const sceneY = (clientY - containerRect.top) / appState.zoom.value - appState.scrollY;

        console.log('🎯 鼠标场景坐标:', { sceneX, sceneY });

        // 找到鼠标位置下的图片元素 - 从后往前遍历（优先选择最上层的元素）
        let targetElement = null;
        for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];

          if (el.type !== 'image' || el.isDeleted) continue;

          // 计算元素的边界框
          const elementLeft = el.x;
          const elementTop = el.y;
          const elementRight = el.x + el.width;
          const elementBottom = el.y + el.height;

          // 判断鼠标是否在图片元素范围内
          if (sceneX >= elementLeft &&
            sceneX <= elementRight &&
            sceneY >= elementTop &&
            sceneY <= elementBottom) {
            targetElement = el;
            break;
          }
        }

        // 如果找到了目标图片元素，则替换它
        if (targetElement) {
          console.log('✅ 找到目标图片元素，开始替换');

          try {
            // 获取PSD图层的数据
            const dataURL = parsedData.layer.image_url;
            const mimeType = 'image/png';

            // 获取图层的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 PSD图层原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 获取被替换图片的尺寸作为参考
            const targetWidth = targetElement.width;
            const targetHeight = targetElement.height;
            const targetRatio = targetWidth / targetHeight;

            // 计算保持宽高比的新尺寸
            let finalWidth: number;
            let finalHeight: number;

            if (newImageRatio > targetRatio) {
              finalWidth = targetWidth;
              finalHeight = targetWidth / newImageRatio;
            } else {
              finalHeight = targetHeight;
              finalWidth = targetHeight * newImageRatio;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `psd-layer-${parsedData.layer.index}-${Date.now()}`;

            // 添加新图片文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 保留原图片的位置，使用计算后的尺寸
            const replacementElement: any = {
              ...targetElement,
              fileId: fileId as any,
              width: finalWidth,
              height: finalHeight,
              opacity: parsedData.layer.opacity ? Math.round(parsedData.layer.opacity / 255 * 100) : 100,
              updated: Date.now(),
              version: (targetElement.version || 0) + 1,
              versionNonce: Math.floor(Math.random() * 1000000000),
              customData: {
                ...targetElement.customData,
                psdLayerIndex: parsedData.layer.index,
                psdLayerName: parsedData.layer.name,
                psdFileId: parsedData.psdFileId
              }
            };

            // 更新场景
            const updatedElements = elements.map(el =>
              el.id === targetElement.id ? replacementElement : el
            );

            excalidrawAPI.updateScene({ elements: updatedElements as any });
            console.log('✅ PSD图层替换成功！');
          } catch (error) {
            console.error('❌ PSD图层替换失败:', error);
          }
        } else {
          // 如果没有找到目标图片元素，在鼠标位置添加新图层
          console.log('📍 鼠标位置下没有图片元素，将在此位置添加PSD图层');

          try {
            const dataURL = parsedData.layer.image_url;
            const mimeType = 'image/png';

            // 获取图层的实际尺寸
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = dataURL;
            });

            const newImageWidth = img.naturalWidth;
            const newImageHeight = img.naturalHeight;
            const newImageRatio = newImageWidth / newImageHeight;

            console.log('📐 PSD图层原始尺寸:', { width: newImageWidth, height: newImageHeight, ratio: newImageRatio });

            // 计算保持宽高比的适当尺寸（默认最大宽度300）
            const maxWidth = 300;
            let finalWidth: number;
            let finalHeight: number;

            if (newImageWidth > maxWidth) {
              finalWidth = maxWidth;
              finalHeight = maxWidth / newImageRatio;
            } else {
              finalWidth = newImageWidth;
              finalHeight = newImageHeight;
            }

            console.log('📐 最终尺寸（保持宽高比）:', { width: finalWidth, height: finalHeight });

            const fileId = `psd-layer-${parsedData.layer.index}-${Date.now()}`;

            // 添加文件到Excalidraw
            excalidrawAPI.addFiles([{
              id: fileId as any,
              dataURL: dataURL as any,
              mimeType: mimeType as any,
              created: Date.now()
            }]);

            // 在鼠标位置创建新图层元素
            const newImageElement: any = {
              id: `image-${fileId}`,
              type: 'image' as const,
              x: sceneX - finalWidth / 2,
              y: sceneY - finalHeight / 2,
              width: finalWidth,
              height: finalHeight,
              angle: 0,
              strokeColor: 'transparent',
              backgroundColor: 'transparent',
              fillStyle: 'solid' as const,
              strokeWidth: 1,
              strokeStyle: 'solid' as const,
              roughness: 0,
              opacity: parsedData.layer.opacity ? Math.round(parsedData.layer.opacity / 255 * 100) : 100,
              fileId: fileId as any,
              scale: [1, 1] as [number, number],
              status: 'saved' as const,
              locked: false,
              version: 1,
              versionNonce: Math.floor(Math.random() * 1000000000),
              isDeleted: false,
              groupIds: [],
              boundElements: null,
              updated: Date.now(),
              link: null,
              customData: {
                psdLayerIndex: parsedData.layer.index,
                psdLayerName: parsedData.layer.name,
                psdFileId: parsedData.psdFileId
              }
            };

            // 添加到画布
            excalidrawAPI.updateScene({
              elements: [...elements, newImageElement]
            });

            console.log('✅ PSD图层已添加到画布');
          } catch (error) {
            console.error('❌ 添加PSD图层失败:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ 处理拖拽数据失败:', error);
    }
  }, [excalidrawAPI]);

  // 在深色模式下使用自定义主题设置，避免使用默认的滤镜
  // 这样可以确保颜色在深色模式下正确显示
  const customTheme = theme === 'dark' ? 'light' : theme

  // 在组件挂载和主题变化时设置深色模式下的背景色
  useEffect(() => {
    if (excalidrawAPI && theme === 'dark') {
      // 设置深色背景，但保持light主题以避免颜色反转
      excalidrawAPI.updateScene({
        appState: {
          viewBackgroundColor: '#121212',
        }
      })
    } else if (excalidrawAPI && theme === 'light') {
      // 恢复浅色背景
      excalidrawAPI.updateScene({
        appState: {
          viewBackgroundColor: '#ffffff',
        }
      })
    }
  }, [excalidrawAPI, theme])

  const addImageToExcalidraw = useCallback(
    async (imageElement: ExcalidrawImageElement, file: BinaryFileData) => {
      if (!excalidrawAPI) return

      // 获取当前画布元素以便添加新元素
      const currentElements = excalidrawAPI.getSceneElements()

      excalidrawAPI.addFiles([file])
      console.log('👇 Adding new image element to canvas:', imageElement.id)
      console.log('👇 Image element properties:', {
        id: imageElement.id,
        type: imageElement.type,
        locked: imageElement.locked,
        groupIds: imageElement.groupIds,
        isDeleted: imageElement.isDeleted,
        x: imageElement.x,
        y: imageElement.y,
        width: imageElement.width,
        height: imageElement.height,
      })


      // Ensure image is not locked and can be manipulated
      const unlockedImageElement = {
        ...imageElement,
        locked: false,
        groupIds: [],
        isDeleted: false,
      }

      excalidrawAPI.updateScene({
        elements: [...(currentElements || []), unlockedImageElement],
      })

      localStorage.setItem(
        'excalidraw-last-image-position',
        JSON.stringify(lastImagePosition.current)
      )
    },
    [excalidrawAPI]
  )

  const addVideoEmbed = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (elementData: any, videoSrc: string) => {
      if (!excalidrawAPI) return

      // Function to create video element with given dimensions
      const createVideoElement = (finalWidth: number, finalHeight: number) => {
        console.log('👇 Video element properties:', {
          id: elementData.id,
          type: elementData.type,
          locked: elementData.locked,
          groupIds: elementData.groupIds,
          isDeleted: elementData.isDeleted,
          x: elementData.x,
          y: elementData.y,
          width: elementData.width,
          height: elementData.height,
        })

        const videoElements = convertToExcalidrawElements([
          {
            type: 'embeddable',
            id: elementData.id,
            x: elementData.x,
            y: elementData.y,
            width: elementData.width,
            height: elementData.height,
            link: videoSrc,
            // 添加必需的基本样式属性
            strokeColor: '#000000',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roundness: null,
            roughness: 1,
            opacity: 100,
            // 添加必需的变换属性
            angle: 0,
            seed: Math.random(),
            version: 1,
            versionNonce: Math.random(),
            // 添加必需的状态属性
            locked: false,
            isDeleted: false,
            groupIds: [],
            // 添加绑定框属性
            boundElements: [],
            updated: Date.now(),
            // 添加必需的索引和帧ID属性
            frameId: null,
            index: null, // 添加缺失的index属性
            // 添加自定义数据属性
            customData: {},
          },
        ])

        console.log('👇 Converted video elements:', videoElements)

        const currentElements = excalidrawAPI.getSceneElements()
        const newElements = [...currentElements, ...videoElements]

        console.log(
          '👇 Updating scene with elements count:',
          newElements.length
        )

        excalidrawAPI.updateScene({
          elements: newElements,
        })

        console.log(
          '👇 Added video embed element:',
          videoSrc,
          `${elementData.width}x${elementData.height}`
        )
      }

      // If dimensions are provided, use them directly
      if (elementData.width && elementData.height) {
        createVideoElement(elementData.width, elementData.height)
        return
      }

      // Otherwise, try to get video's natural dimensions
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'

      video.onloadedmetadata = () => {
        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight

        if (videoWidth && videoHeight) {
          // Scale down if video is too large (max 800px width)
          const maxWidth = 800
          let finalWidth = videoWidth
          let finalHeight = videoHeight

          if (videoWidth > maxWidth) {
            const scale = maxWidth / videoWidth
            finalWidth = maxWidth
            finalHeight = videoHeight * scale
          }

          createVideoElement(finalWidth, finalHeight)
        } else {
          // Fallback to default dimensions
          createVideoElement(320, 180)
        }
      }

      video.onerror = () => {
        console.warn('Could not load video metadata, using default dimensions')
        createVideoElement(320, 180)
      }

      video.src = videoSrc
    },
    [excalidrawAPI]
  )

  const renderEmbeddable = useCallback(
    (element: NonDeleted<ExcalidrawEmbeddableElement>, appState: AppState) => {
      const { link } = element

      // Check if this is a video URL
      if (
        link &&
        (link.includes('.mp4') ||
          link.includes('.webm') ||
          link.includes('.ogg') ||
          link.startsWith('blob:') ||
          link.includes('video'))
      ) {
        // Return the VideoPlayer component
        return (
          <VideoElement
            src={link}
            width={element.width}
            height={element.height}
          />
        )
      }

      console.log('👇 Not a video URL, returning null for:', link)
      // Return null for non-video embeds to use default rendering
      return null
    },
    []
  )

  const handleImageGenerated = useCallback(
    (imageData: ISocket.SessionImageGeneratedEvent) => {
      console.log('👇 CanvasExcali received image_generated:', imageData)

      // Only handle if it's for this canvas
      if (imageData.canvas_id !== canvasId) {
        console.log('👇 Image not for this canvas, ignoring')
        return
      }

      // Check if this is actually a video generation event that got mislabeled
      if (imageData.file?.mimeType?.startsWith('video/')) {
        console.log(
          '👇 This appears to be a video, not an image. Ignoring in image handler.'
        )
        return
      }

      addImageToExcalidraw(imageData.element, imageData.file)
    },
    [addImageToExcalidraw, canvasId]
  )

  const handleVideoGenerated = useCallback(
    (videoData: ISocket.SessionVideoGeneratedEvent) => {
      console.log('👇 CanvasExcali received video_generated:', videoData)

      // Only handle if it's for this canvas
      if (videoData.canvas_id !== canvasId) {
        console.log('👇 Video not for this canvas, ignoring')
        return
      }

      // Create video embed element using the video URL
      addVideoEmbed(videoData.element, videoData.video_url)
    },
    [addVideoEmbed, canvasId]
  )

  useEffect(() => {
    eventBus.on('Socket::Session::ImageGenerated', handleImageGenerated)
    eventBus.on('Socket::Session::VideoGenerated', handleVideoGenerated)
    return () => {
      eventBus.off('Socket::Session::ImageGenerated', handleImageGenerated)
      eventBus.off('Socket::Session::VideoGenerated', handleVideoGenerated)
    }
  }, [handleImageGenerated, handleVideoGenerated])

  // 在画布加载后恢复所有图像文件（确保文件能够正确加载）
  useEffect(() => {
    if (!excalidrawAPI || !initialData) {
      return
    }

    // 延迟执行，确保画布完全加载
    const timer = setTimeout(async () => {
      try {
        const files = excalidrawAPI.getFiles()
        const elements = excalidrawAPI.getSceneElements()

        // 检查所有图像元素对应的文件
        const imageElements = elements.filter(
          (el) => el.type === 'image' && !el.isDeleted && 'fileId' in el
        ) as ExcalidrawImageElement[]

        // 需要恢复的文件列表
        const filesToRestore: BinaryFileData[] = []

        for (const imageElement of imageElements) {
          if (!imageElement.fileId) continue

          const file = files[imageElement.fileId]
          if (!file) {
            // 文件不存在，尝试从 initialData 中恢复
            if (initialData?.files?.[imageElement.fileId]) {
              const savedFile = initialData.files[imageElement.fileId]
              if (savedFile.dataURL && !savedFile.dataURL.startsWith('data:')) {
                // 如果是 URL，尝试加载为 dataURL
                try {
                  const dataURL = await loadFileAsDataURL(savedFile.dataURL)
                  filesToRestore.push({
                    id: savedFile.id || imageElement.fileId,
                    mimeType: savedFile.mimeType || 'image/png',
                    dataURL: dataURL as any,
                    created: savedFile.created || Date.now(),
                  })
                } catch (error) {
                  console.warn(`无法恢复文件 ${imageElement.fileId}:`, error)
                }
              } else if (savedFile.dataURL) {
                // 已经是 dataURL，直接使用
                filesToRestore.push({
                  id: savedFile.id || imageElement.fileId,
                  mimeType: savedFile.mimeType || 'image/png',
                  dataURL: savedFile.dataURL as any,
                  created: savedFile.created || Date.now(),
                })
              }
            }
          } else if (file.dataURL && !file.dataURL.startsWith('data:')) {
            // 文件存在但只有 URL（不是 dataURL），需要加载为 dataURL
            // 检查是否已经在恢复列表中，避免重复
            const alreadyInList = filesToRestore.some(f => f.id === file.id)
            if (!alreadyInList) {
              try {
                const dataURL = await loadFileAsDataURL(file.dataURL)
                // 更新现有文件，而不是添加新文件
                excalidrawAPI.addFiles([{
                  ...file,
                  dataURL: dataURL as any,
                }])
              } catch (error) {
                console.warn(`无法加载文件 ${imageElement.fileId}:`, error)
              }
            }
          }
        }

        // 如果有需要恢复的文件，添加到 Excalidraw
        if (filesToRestore.length > 0) {
          console.log(`正在恢复 ${filesToRestore.length} 个文件...`)
          excalidrawAPI.addFiles(filesToRestore)
          console.log('✅ 文件恢复完成')
        }
      } catch (error) {
        console.warn('恢复文件时出错:', error)
      }
    }, 1000) // 延迟1秒，确保画布完全加载

    return () => clearTimeout(timer)
  }, [excalidrawAPI, initialData, loadFileAsDataURL])

  // 在画布加载完成后自动生成缩略图（如果还没有或需要更新）
  useEffect(() => {
    if (!excalidrawAPI || !initialData) {
      return
    }

    // 延迟执行，确保画布完全加载
    const timer = setTimeout(async () => {
      try {
        const elements = excalidrawAPI.getSceneElements()
        const appState = excalidrawAPI.getAppState()
        const files = excalidrawAPI.getFiles()

        // 检查是否有元素
        const visibleElements = elements.filter((el) => !el.isDeleted)
        if (visibleElements.length === 0) {
          return
        }

        // 生成缩略图
        try {
          const thumbnail = await generateCanvasThumbnail(elements, appState, files)
          if (thumbnail) {
            // 优化files对象：只保留URL引用，不保存base64数据
            const optimizedFiles: BinaryFiles = {}
            for (const [fileId, file] of Object.entries(files)) {
              const hasServerUrl = file.dataURL && (
                file.dataURL.startsWith('http://') ||
                file.dataURL.startsWith('https://') ||
                file.dataURL.startsWith('/api/')
              )

              optimizedFiles[fileId] = {
                id: file.id,
                mimeType: file.mimeType,
                created: file.created,
                ...(hasServerUrl ? { dataURL: file.dataURL } : {}),
              } as any
            }

            // 保存缩略图和数据（使用优化后的files）
            const data: CanvasData = {
              elements,
              appState: {
                ...appState,
                collaborators: undefined!,
              },
              files: optimizedFiles,
            }
            await saveCanvas(canvasId, { data, thumbnail })
            console.log('✅ 画布加载后自动生成缩略图成功')
          }
        } catch (error) {
          console.warn('画布加载后生成缩略图失败:', error)
        }
      } catch (error) {
        console.warn('画布加载后检查缩略图失败:', error)
      }
    }, 2000) // 延迟2秒，确保画布完全加载

    return () => clearTimeout(timer)
  }, [excalidrawAPI, initialData, canvasId, generateCanvasThumbnail])

  return (
    <div
      className="excalidraw-wrapper relative w-full h-full"
      style={{ width: '100%', height: '100%' }}
      onDragOverCapture={handleDragOver}
      onDropCapture={handleDrop}
    >
      <Excalidraw
        theme={customTheme as Theme}
        langCode={i18n.language}
        excalidrawAPI={(api) => {
          console.log('👇 Excalidraw API 实例:', api)
          setExcalidrawAPI(api)
        }}
        onChange={handleChange}
        initialData={() => {
          const data = initialData
          console.log('👇initialData', data)
          if (data?.appState) {
            data.appState = {
              ...data.appState,
              collaborators: undefined!,
            }
          }
          return data || null
        }}
        renderEmbeddable={renderEmbeddable}
        // Allow all URLs for embeddable content
        validateEmbeddable={(url: string) => {
          console.log('👇 Validating embeddable URL:', url)
          // Allow all URLs - return true for everything
          return true
        }}
        // 所有用户都可以编辑
        viewModeEnabled={viewModeEnabled}
        zenModeEnabled={false}
        // Allow element manipulation
        onPointerUpdate={(payload) => {
          // Minimal logging - only log significant pointer events
          if (payload.button === 'down' && Math.random() < 0.05) {
            // console.log('👇 Pointer down on:', payload.pointer.x, payload.pointer.y)
          }
        }}
      />
      <CanvasTopToolbar />
    </div>
  )
}

export { CanvasExcali }
export default CanvasExcali




