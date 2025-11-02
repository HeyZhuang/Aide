import { getCanvas, renameCanvas } from '@/api/canvas'
import CanvasExcali from '@/components/canvas/CanvasExcali'
import CanvasHeader from '@/components/canvas/CanvasHeader'
import CanvasMenu from '@/components/canvas/menu'
import CanvasPopbarWrapper from '@/components/canvas/pop-bar'
// VideoCanvasOverlay removed - using native Excalidraw embeddable elements instead
import ChatInterface from '@/components/chat/Chat'
import { PSDLayerSidebar } from '@/components/canvas/PSDLayerSidebar'
import { CanvasProvider } from '@/contexts/canvas'
import { CanvasData, Session } from '@/types/types'
import { createFileRoute, useParams, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PSDUploadResponse } from '@/api/upload'
import { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types'

export const Route = createFileRoute('/canvas/$id')({
  component: Canvas,
})

function Canvas() {
  const { id } = useParams({ from: '/canvas/$id' })
  const [canvas, setCanvas] = useState<{ data: CanvasData | null; name: string; sessions: Session[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [canvasName, setCanvasName] = useState('')
  const [sessionList, setSessionList] = useState<Session[]>([])
  // initialVideos removed - using native Excalidraw embeddable elements instead

  // PSD图层侧边栏状态
  const [psdData, setPsdData] = useState<PSDUploadResponse | null>(null)
  const [isLayerSidebarVisible, setIsLayerSidebarVisible] = useState(true) // 默认显示侧边栏
  const search = useSearch({ from: '/canvas/$id' }) as {
    sessionId: string
  }
  const searchSessionId = search?.sessionId || ''

  // 聊天窗口最小化状态 - 默认设置为true（收起状态）
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
            重新加载
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
    <CanvasProvider>
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
              </div>
            )}
          </div>

          {/* PSD Layer Sidebar - Positioned separately */}
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 w-[22vw] h-[85vh] z-10 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--sidebar-glass-bg, rgba(255, 255, 255, 0.85))',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              border: 'var(--sidebar-glass-border, 1px solid rgba(255, 255, 255, 0.5))',
              boxShadow: 'var(--sidebar-glass-shadow, 0 12px 48px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9))',
              transition: 'all 0.3s ease',
            }}
          >
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

        {/* Chat Interface - Small floating window at the bottom center */}
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
      </div>
    </CanvasProvider>
  )
}