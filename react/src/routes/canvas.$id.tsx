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
import { CanvasData, Session } from '@/types/types'
import { createFileRoute, useParams, useSearch } from '@tanstack/react-router'
import { Loader2, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PSDUploadResponse } from '@/api/upload'
import { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from 'react-i18next'

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

  // PSD图层侧边栏状态
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
  const [isLayerSidebarVisible, setIsLayerSidebarVisible] = useState(true) // 默认显示侧边栏
  const search = useSearch({ from: '/canvas/$id' }) as {
    sessionId: string
  }
  const searchSessionId = search?.sessionId || ''

  // 聊天窗口最小化状态
  const [isChatMinimized, setIsChatMinimized] = useState(true)

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

  const handleNameSave = async () => {
    await renameCanvas(id, canvasName)
  }

  // PSD数据更新处理
  const handlePSDUpdate = (updatedPsdData: PSDUploadResponse) => {
    setPsdData(updatedPsdData)
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-screen bg-background'>
        <div className='text-center p-8'>
          <h2 className='text-2xl font-bold text-destructive mb-4'>加载画布失败</h2>
          <p className='text-muted-foreground mb-4'>{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className='px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
          >
            {t('sidebar.reload')}
          </button>
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

  return (
    <div className='flex flex-col w-screen h-screen'>
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
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: `
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
            className="absolute -left-10 top-1/2 -translate-y-1/2 z-30 w-9 h-20 flex items-center justify-center backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/90 group"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              borderRight: 'none',
              boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.12), inset 1px 0 0 rgba(255, 255, 255, 0.8)',
            }}
            aria-label="隐藏图层面板"
            title={t('sidebar.hide_panel')}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-gray-700 transition-colors"></div>
              <PanelRightClose className="w-4 h-4 text-gray-700 group-hover:text-gray-900 transition-colors" />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-500 group-hover:bg-gray-700 transition-colors"></div>
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
      {/* 只有在用户登录成功后才显示AI助手 */}
      {authStatus.is_logged_in && (
        <div className={`bottom-chat-container ${isChatMinimized ? 'minimized' : ''}`}>
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