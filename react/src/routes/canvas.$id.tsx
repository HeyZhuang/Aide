import { getCanvas } from '@/api/canvas'
import ChatInterface from '@/components/chat/Chat'
import { useCanvas } from '@/contexts/canvas'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CanvasExcalidraw from '@/components/canvas/CanvasExcali'
import '@/assets/style/canvas.css'
import { CanvasProvider } from '@/contexts/canvas'

export const Route = createFileRoute('/canvas/$id')({
  component: Canvas,
})

function Canvas() {
  const { id } = useParams({ from: '/canvas/$id' })
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setCanvasId } = useCanvas()

  // State for chat
  const [isChatMinimized, setIsChatMinimized] = useState(true)
  const [sessionList, setSessionList] = useState<any[]>([])

  // State for PSD layer sidebar
  const [isLayerSidebarVisible, setIsLayerSidebarVisible] = useState(false)
  const [psdData, setPsdData] = useState<any>(null)

  const search = Route.useSearch()
  const searchSessionId = (search as { sessionId?: string }).sessionId

  const { data: canvasData, isLoading } = useQuery({
    queryKey: ['canvas', id],
    queryFn: () => getCanvas(id),
    enabled: !!id,
  })

  useEffect(() => {
    setCanvasId(id)
    return () => {
      setCanvasId('')
    }
  }, [id, setCanvasId])

  useEffect(() => {
    // Initialize session list from canvas data
    if (canvasData?.sessions) {
      setSessionList(canvasData.sessions)
    }
  }, [canvasData])

  const handlePSDUpdate = (updatedPsdData: any) => {
    setPsdData(updatedPsdData)
    setIsLayerSidebarVisible(true)
  }

  // 获取模板工具栏设置，用于同步底部对话框显示状态
  const getTemplateToolbarSettings = () => {
    const savedSettings = localStorage.getItem('template-toolbar-settings')
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings)
      } catch (error) {
        console.error('Failed to parse template toolbar settings:', error)
        return null
      }
    }
    return null
  }

  // 监听模板工具栏设置变化，同步底部对话框显示状态
  const [isBottomToolbarVisible, setIsBottomToolbarVisible] = useState(false)
  
  useEffect(() => {
    // 初始化时检查模板工具栏设置
    const settings = getTemplateToolbarSettings()
    if (settings && settings.autoShowBottom) {
      setIsBottomToolbarVisible(true)
    }
    
    // 监听 localStorage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'template-toolbar-settings' && e.newValue) {
        try {
          const settings = JSON.parse(e.newValue)
          setIsBottomToolbarVisible(settings.autoShowBottom || false)
        } catch (error) {
          console.error('Failed to parse template toolbar settings:', error)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!canvasData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">{t('canvas:notFound')}</h1>
        <Button onClick={() => navigate({ to: '/' })}>
          {t('canvas:backToHome')}
        </Button>
      </div>
    )
  }

  return (
    <CanvasProvider>
      <div className='flex flex-col w-screen h-screen'>
        {/* Canvas Header would go here */}
        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 relative">
            {isLoading ? (
              <div className='flex items-center justify-center h-full'>
                <div className='animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500'></div>
              </div>
            ) : (
              <div className='relative w-full h-full'>
                <CanvasExcalidraw canvasId={id} initialData={canvasData} />
                {/* CanvasMenu and CanvasPopbarWrapper would go here */}
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
            {/* PSDLayerSidebar would go here */}
          </div>
        </div>

        {/* Chat Interface - Small floating window at the bottom center */}
        {/* 只有当左侧工具栏可见时才显示底部对话框 */}
        {(isBottomToolbarVisible || window.location.pathname.includes('/canvas/')) && (
          <div className={`bottom-chat-container ${isChatMinimized ? 'minimized' : ''}`}>
            <ChatInterface
              canvasId={id}
              sessionList={sessionList}
              setSessionList={setSessionList}
              sessionId={searchSessionId || ''}
              isMinimized={isChatMinimized}
              onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
            />
          </div>
        )}
      </div>
    </CanvasProvider>
  )
}