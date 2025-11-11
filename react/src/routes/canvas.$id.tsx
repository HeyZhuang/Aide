import { getCanvas, renameCanvas } from '@/api/canvas'
import CanvasExcali from '@/components/canvas/CanvasExcali'
import CanvasHeader from '@/components/canvas/CanvasHeader'
import CanvasMenu from '@/components/canvas/menu'
import CanvasPopbarWrapper from '@/components/canvas/pop-bar'
// VideoCanvasOverlay removed - using native Excalidraw embeddable elements instead
import ChatInterface from '@/components/chat/Chat'
import { PSDLayerSidebar } from '@/components/canvas/PSDLayerSidebar'
import { CanvasProvider } from '@/contexts/canvas'
import { CanvasOverlay } from '@/components/canvas/CanvasOverlay'
import { useCanvas } from '@/contexts/canvas'
import useCanvasStore from '@/stores/canvas'
import { CanvasData, Session } from '@/types/types'
import { createFileRoute, useParams, useSearch } from '@tanstack/react-router'
import { Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'
import { PSDUploadResponse, getPSDTemplateById, parsePSDTemplate, uploadPSD, type PSDTemplateInfo } from '@/api/upload'
import { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/use-theme'
import { toast } from 'sonner'

export const Route = createFileRoute('/canvas/$id')({
  component: Canvas,
})

function Canvas() {
  return (
    <CanvasProvider>
      <CanvasContent />
    </CanvasProvider>
  )
}

function CanvasContent() {
  const { id } = useParams({ from: '/canvas/$id' })
  const canvasStore = useCanvas()
  const { authStatus } = useAuth() // 获取登录状态
  const [canvas, setCanvas] = useState<{ data: CanvasData | null; name: string; sessions: Session[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [canvasName, setCanvasName] = useState('')
  const [sessionList, setSessionList] = useState<Session[]>([])
  // initialVideos removed - using native Excalidraw embeddable elements instead
  const { t } = useTranslation()
  const { theme } = useTheme()

  // 获取当前实际应用的主题（考虑 system 模式）
  const [isDark, setIsDark] = useState(false)

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

  // PSD图层侧边栏状态
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
  const [isLayerSidebarVisible, setIsLayerSidebarVisible] = useState(true) // 默认显示侧边栏
  const search = useSearch({ from: '/canvas/$id' }) as {
    sessionId: string
  }
  const searchSessionId = search?.sessionId || ''

  // 聊天窗口最小化状态
  const [isChatMinimized, setIsChatMinimized] = useState(true)
  // 图片询问模式状态
  const [isImageQuestionMode, setIsImageQuestionMode] = useState(false)
  // AI助手窗口容器的引用
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 点击外部区域关闭AI助手窗口
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 如果窗口已经最小化，不需要处理
      if (isChatMinimized) {
        return
      }

      const target = event.target as Node

      // 如果点击的是AI助手窗口内部，不关闭
      if (chatContainerRef.current && chatContainerRef.current.contains(target)) {
        return
      }

      // 检查是否点击了任何弹窗或下拉菜单（使用 Portal 渲染）
      // 这包括 DropdownMenu、Dialog、Tooltip 等组件
      const element = target as HTMLElement
      
      // 检查点击目标是否在 Portal 容器中
      let isInPortal = false
      
      // 遍历所有可能的 Portal 容器
      const portalElements = document.querySelectorAll('[role="dialog"], [role="menu"], [role="tooltip"]')
      for (const portal of portalElements) {
        if (portal.contains(target)) {
          isInPortal = true
          break
        }
      }

      if (isInPortal) {
        return
      }

      // 点击外部区域，关闭窗口
      setIsChatMinimized(true)
    }

    // 添加事件监听器
    document.addEventListener('mousedown', handleClickOutside)

    // 清理事件监听器
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isChatMinimized])

  useEffect(() => {
    let mounted = true

    const fetchCanvas = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getCanvas(id)
        if (mounted) {
          // getCanvas 现在总是返回有效数据，不需要额外验证
          setCanvas(data)
          setCanvasName(data.name)
          setSessionList(data.sessions)
          // Video elements now handled by native Excalidraw embeddable elements
        }
      } catch (err) {
        // 这个 catch 现在主要用于处理其他类型的错误
        if (mounted) {
          console.error('Unexpected error in fetchCanvas:', err)
          setError(err instanceof Error ? err : new Error('Unexpected error occurred'))
          // 设置默认值
          setCanvas(null)
          setCanvasName('未命名画布')
          setSessionList([])
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchCanvas()

    return () => {
      mounted = false
    }
  }, [id])

  // 自动应用待处理的模板
  const { excalidrawAPI } = useCanvas()

  useEffect(() => {
    // 检查是否有待处理的模板
    const pendingTemplateStr = sessionStorage.getItem('pendingTemplate')
    if (!pendingTemplateStr || !canvas) {
      return
    }

    // 等待 excalidrawAPI 准备好
    const checkAndApplyTemplate = async () => {
      // 最多等待 5 秒，每 200ms 检查一次
      let attempts = 0
      const maxAttempts = 25

      while (attempts < maxAttempts) {
        const { excalidrawAPI: api } = useCanvasStore.getState()
        if (api) {
          // API 已准备好，开始应用模板
          const pendingTemplate = JSON.parse(pendingTemplateStr)
          sessionStorage.removeItem('pendingTemplate') // 清除待处理标记

          // 再延迟一点确保画布完全初始化
          await new Promise(resolve => setTimeout(resolve, 500))

          try {
            console.log('开始自动应用模板:', pendingTemplate)

            if (!api) {
              console.warn('Excalidraw API 未准备好，无法应用模板')
              return
            }

            let result: PSDUploadResponse

            // 如果模板已解析，直接从数据库加载（快速）
            if (pendingTemplate.templateId) {
              try {
                result = await getPSDTemplateById(pendingTemplate.templateId)
                console.log('✅ 从数据库快速加载PSD模板:', result)
              } catch (error) {
                console.warn('从数据库加载失败，回退到解析模式:', error)
                // 如果从数据库加载失败，回退到解析模式
                const response = await fetch(`/api/psd/templates/${encodeURIComponent(pendingTemplate.templateName)}`)
                if (!response.ok) {
                  throw new Error('获取PSD文件失败')
                }
                const blob = await response.blob()
                const file = new File([blob], pendingTemplate.templateName, { type: 'application/octet-stream' })
                result = await uploadPSD(file)
              }
            } else {
              // 如果模板未解析，先解析再加载
              try {
                const parseResult = await parsePSDTemplate(pendingTemplate.templateName)
                result = await getPSDTemplateById(parseResult.template_id)
                console.log('✅ PSD模板解析完成并已加载:', result)
              } catch (error) {
                console.warn('解析失败，回退到传统方式:', error)
                const response = await fetch(`/api/psd/templates/${encodeURIComponent(pendingTemplate.templateName)}`)
                if (!response.ok) {
                  throw new Error('获取PSD文件失败')
                }
                const blob = await response.blob()
                const file = new File([blob], pendingTemplate.templateName, { type: 'application/octet-stream' })
                result = await uploadPSD(file)
              }
            }

            // 应用模板到画布（复用 PSDLayerSidebar 的逻辑）
            if (api && result.layers) {
              console.log('开始添加PSD图层到画布，共', result.layers.length, '个图层')

              const appState = api.getAppState()
              const currentElements = api.getSceneElements()

              // 计算视口中心
              const viewportCenter = {
                x: -appState.scrollX + (appState.width || 0) / 2 / appState.zoom.value,
                y: -appState.scrollY + (appState.height || 0) / 2 / appState.zoom.value,
              }

              // 过滤有效图层：排除群组，只保留图片和文字图层
              const validLayers = result.layers.filter(layer => {
                return layer.type !== 'group' && layer.visible !== false && (layer.image_url || layer.type === 'text')
              })

              if (validLayers.length === 0) {
                toast.warning('模板没有可显示的图层')
                return
              }

              // 计算PSD内容的中心位置
              let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity
              validLayers.forEach(layer => {
                minLeft = Math.min(minLeft, layer.left)
                minTop = Math.min(minTop, layer.top)
                maxRight = Math.max(maxRight, layer.left + layer.width)
                maxBottom = Math.max(maxBottom, layer.top + layer.height)
              })

              const psdCenterX = (minLeft + maxRight) / 2
              const psdCenterY = (minTop + maxBottom) / 2

              // 计算偏移量使PSD内容居中
              const offsetX = viewportCenter.x - psdCenterX
              const offsetY = viewportCenter.y - psdCenterY

              // 收集所有要添加的图片元素和文件数据
              const newImageElements: any[] = []
              const newFileData: any[] = []

              // 准备所有图层数据
              for (const layer of validLayers) {
                if (!layer.image_url && layer.type !== 'text') continue

                try {
                  // 获取图片数据
                  const response = await fetch(layer.image_url!)
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
                  const fileId = `psd-template-${result.file_id || result.template_id || 'template'}-${layer.index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

                  // 创建文件数据
                  const fileData = {
                    mimeType: 'image/png' as const,
                    id: fileId as any,
                    dataURL: dataURL as any,
                    created: Date.now()
                  }

                  // 创建图片元素
                  const imageElement = {
                    type: 'image' as const,
                    id: `psd-template-element-${layer.index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
                    fileId: fileId as any,
                    scale: [1, 1] as [number, number],
                    status: 'saved' as const,
                    index: null,
                    crop: null,
                    customData: {
                      psdLayerIndex: layer.index,
                      psdFileId: result.file_id,
                      layerName: layer.name,
                      templateId: result.template_id || null
                    }
                  } as any

                  newFileData.push(fileData)
                  newImageElements.push(imageElement)
                } catch (error) {
                  console.error(`准备图层 "${layer.name}" 失败:`, error)
                }
              }

              // 逐个添加文件和图层
              for (let i = 0; i < newFileData.length && i < newImageElements.length; i++) {
                try {
                  const fileData = newFileData[i]
                  const imageElement = newImageElements[i]

                  // 添加文件
                  api.addFiles([fileData])

                  // 等待文件加载完成
                  await new Promise(resolve => setTimeout(resolve, 100))

                  // 获取当前画布元素
                  const currentElements = api.getSceneElements()

                  // 检查是否已存在相同ID的元素
                  const exists = currentElements.some((el: any) => el.id === imageElement.id)
                  if (exists) {
                    console.warn(`图层 "${imageElement.customData?.layerName}" 已存在，跳过`)
                    continue
                  }

                  // 添加图层元素
                  api.updateScene({
                    elements: [...currentElements, imageElement],
                  })

                  // 添加小延迟，确保图层正确添加
                  await new Promise(resolve => setTimeout(resolve, 50))
                } catch (error) {
                  console.error(`添加图层 ${i + 1} 失败:`, error)
                }
              }

              toast.success(`模板 "${pendingTemplate.displayName}" 已成功应用到画布`)
            }
          } catch (error) {
            console.error('自动应用模板失败:', error)
            toast.error('自动应用模板失败: ' + (error instanceof Error ? error.message : '未知错误'))
          }
          return // API 已准备好，退出循环
        }

        attempts++
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // 如果超时仍未准备好，清除待处理标记
      if (attempts >= maxAttempts) {
        console.warn('等待 Excalidraw API 超时，清除待处理模板')
        sessionStorage.removeItem('pendingTemplate')
        toast.error('画布初始化超时，请手动应用模板')
      }
    }

    // 延迟一点再开始检查，确保组件已完全渲染
    const timer = setTimeout(() => {
      checkAndApplyTemplate()
    }, 500)

    return () => clearTimeout(timer)
  }, [id, canvas]) // 当画布加载完成后触发

  const handleNameSave = async () => {
    await renameCanvas(id, canvasName)
  }

  // PSD数据更新处理
  const handlePSDUpdate = (updatedPsdData: PSDUploadResponse) => {
    setPsdData(updatedPsdData)
  }

  // 未登录用户也可以查看画布（只读模式），不需要强制登录

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-screen bg-background'>
        <div className='text-center p-8'>
          <h2 className='text-2xl font-bold text-destructive mb-4'>加载画布失败</h2>
          <p className='text-muted-foreground mb-4'>{error.message}</p>
          {error.message.includes('无权访问') || error.message.includes('未登录') ? (
            <button
              onClick={() => window.location.href = '/'}
              className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
            >
              返回首页
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
            >
              {t('sidebar.reload')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // 将CanvasData转换为ExcalidrawInitialDataState
  const getInitialData = (): ExcalidrawInitialDataState | undefined => {
    if (!canvas?.data) return undefined

    return {
      elements: canvas.data.elements,
      appState: canvas.data.appState,
      files: canvas.data.files
    }
  }

  // 获取用户角色
  // 未登录用户视为 viewer（只读模式）
  const userRole = authStatus.is_logged_in ? (authStatus.user_info?.role || 'viewer') : 'viewer'
  const isViewer = userRole === 'viewer' || !authStatus.is_logged_in

  return (
    <div className='flex flex-col w-screen h-screen'>
      {/* Viewer 角色提示横幅 */}
      {isViewer && (
        <div className="w-full p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            <strong>查看者模式：</strong>
            {authStatus.is_logged_in
              ? '您当前以查看者身份登录，只能查看画布内容，无法进行编辑操作。'
              : '您当前以游客身份访问，只能查看画布内容，无法进行编辑操作。请登录以编辑画布。'}
          </p>
        </div>
      )}
      <CanvasHeader
        canvasName={canvasName}
        canvasId={id}
        onNameChange={setCanvasName}
        onNameSave={handleNameSave}
        psdData={psdData}
        onPSDUpdate={handlePSDUpdate}
        onApplyTemplate={(template) => {
          console.log('Applying template:', template)
          // 这里可以添加应用模板的逻辑
        }}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 relative">
          {isLoading ? (
            <div className='flex items-center justify-center h-full'>
              <Loader2 className='w-6 h-6 animate-spin' />
            </div>
          ) : (
            <div className='relative w-full h-full'>
              <CanvasExcali canvasId={id} initialData={getInitialData()} />
              <CanvasMenu canvasId={id} />
              <CanvasPopbarWrapper />
              <CanvasOverlay
                isLoading={canvasStore.overlayLoading}
                message={canvasStore.overlayMessage}
                type={canvasStore.overlayType}
              />
            </div>
          )}
        </div>

        {/* 面板切换按钮 - 当面板隐藏时显示 */}
        {!isLayerSidebarVisible && (
          <button
            onClick={() => setIsLayerSidebarVisible(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-3 rounded-l-2xl backdrop-blur-xl transition-all duration-300 hover:scale-110 group"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRight: 'none',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            }}
            aria-label="显示图层面板"
          >
            <PanelRightOpen className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
          </button>
        )}

        {/* PSD Layer Sidebar - 苹果毛玻璃风格，优雅间距设计 */}
        <div
          className={`absolute right-4 top-4 bottom-4 w-[24vw] z-10 overflow-visible transition-all duration-500 ease-out ${isLayerSidebarVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          style={{
            background: isDark
              ? 'rgba(28, 28, 30, 0.85)'
              : 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderRadius: '20px',
            border: isDark
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: isDark
              ? `
                  -8px 0 32px rgba(0, 0, 0, 0.6),
                  0 8px 32px rgba(0, 0, 0, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.08),
                  inset -1px 0 0 rgba(255, 255, 255, 0.08)
                `
              : `
                  -8px 0 32px rgba(0, 0, 0, 0.12),
                  0 8px 32px rgba(0, 0, 0, 0.08),
                  inset 0 1px 0 rgba(255, 255, 255, 0.6),
                  inset -1px 0 0 rgba(255, 255, 255, 0.4)
                `,
          }}
        >
          {/* 面板关闭按钮 - 优化位置：放在面板左侧边缘中间，作为拖拽手柄样式 */}
          <button
            onClick={() => setIsLayerSidebarVisible(false)}
            className="absolute -left-10 top-1/2 -translate-y-1/2 z-30 w-9 h-20 flex items-center justify-center backdrop-blur-xl transition-all duration-300 hover:scale-110 group"
            style={{
              background: isDark
                ? 'rgba(28, 28, 30, 0.85)'
                : 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              borderRadius: '12px',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.1)'
                : '1px solid rgba(255, 255, 255, 0.5)',
              borderRight: 'none',
              boxShadow: isDark
                ? '-4px 0 20px rgba(0, 0, 0, 0.6), inset 1px 0 0 rgba(255, 255, 255, 0.08)'
                : '-4px 0 20px rgba(0, 0, 0, 0.12), inset 1px 0 0 rgba(255, 255, 255, 0.8)',
            }}
            aria-label="隐藏图层面板"
            title={t('sidebar.hide_panel')}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-400 group-hover:bg-gray-700 dark:group-hover:bg-gray-300 transition-colors"></div>
              <PanelRightClose className="w-4 h-4 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-400 group-hover:bg-gray-700 dark:group-hover:bg-gray-300 transition-colors"></div>
            </div>
          </button>

          <div className="h-full w-full overflow-hidden rounded-[20px]">
            <PSDLayerSidebar
              psdData={psdData}
              isVisible={isLayerSidebarVisible}
              onClose={() => {
                setIsLayerSidebarVisible(false)
              }}
              onUpdate={handlePSDUpdate}
            />
          </div>
        </div>
      </div>

      {/* Chat Interface - Small floating window at the bottom center */}
      {/* 只有在用户登录成功后才显示AI助手（Editor 或 Admin） */}
      {authStatus.is_logged_in && userRole !== 'viewer' && (
        <div
          ref={chatContainerRef}
          className={`bottom-chat-container ${isChatMinimized ? 'minimized' : ''}`}
        >
          <ChatInterface
            canvasId={id}
            sessionList={sessionList}
            setSessionList={setSessionList}
            sessionId={searchSessionId}
            isMinimized={isChatMinimized}
            onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
          />
          
        </div>
      )}
    </div>
  )
}





