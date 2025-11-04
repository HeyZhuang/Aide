import { createCanvas } from '@/api/canvas'
import ChatTextarea from '@/components/chat/ChatTextarea'
import CanvasList from '@/components/home/CanvasList'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfigs } from '@/contexts/configs'
import { DEFAULT_SYSTEM_PROMPT } from '@/constants'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { nanoid } from 'nanoid'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import {
  ChevronDown,
  Plus,
  Clock,
  LayoutGrid,
  Share2,
  Trash2,
  Lightbulb,
  Crown,
  Settings,
  ArrowRight,
  Grid3x3,
  Moon,
  Sun
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { setInitCanvas } = useConfigs()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('all-maps')
  const [showChatTextarea, setShowChatTextarea] = useState(false)

  const isDark = theme === 'dark'

  const { mutate: createCanvasMutation, isPending } = useMutation({
    mutationFn: createCanvas,
    onSuccess: (data, variables) => {
      setInitCanvas(true)
      navigate({
        to: '/canvas/$id',
        params: { id: data.id },
        search: {
          sessionId: variables.session_id,
        },
      })
    },
    onError: (error) => {
      toast.error(t('common:messages.error'), {
        description: error.message,
      })
    },
  })

  const handleCreateNew = () => {
    setShowChatTextarea(true)
  }

  const handleCreateWithTemplate = (templateName: string) => {
    createCanvasMutation({
      name: templateName,
      canvas_id: nanoid(),
      messages: [],
      session_id: nanoid(),
      text_model: {
        provider: 'openai',
        model: 'gpt-4',
        url: ''
      },
      tool_list: [],
      system_prompt: localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT,
    })
  }

  const templates = [
    { name: 'Mind Map', preview: '/templates/mindmap.png' },
    { name: 'Logic Chart', preview: '/templates/logic.png' },
    { name: 'Brace Map', preview: '/templates/brace.png' },
    { name: 'Org Chart', preview: '/templates/org.png' },
  ]

  return (
    <div className={cn(
      'flex h-screen w-full overflow-hidden',
      isDark ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-900'
    )}>
      {/* 左侧边栏 */}
      <aside className={cn(
        'w-60 flex-shrink-0 border-r flex flex-col',
        isDark ? 'bg-[#252525] border-gray-800' : 'bg-white border-gray-200'
      )}>
        <div className='p-4'>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-2',
              isDark ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-100'
            )}
          >
            <LayoutGrid className='w-5 h-5' />
            <span>My Works</span>
            <ChevronDown className='w-4 h-4 ml-auto' />
          </Button>
        </div>

        <div className='px-4 pb-4'>
          <Button
            onClick={handleCreateNew}
            className='w-full bg-black hover:bg-black-700 text-white gap-2'
          >
            <Lightbulb className='w-4 h-4' />
            Create with AI
          </Button>
        </div>

        <nav className='flex-1 px-2'>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('recents')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'recents'
                ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
          >
            <Clock className='w-5 h-5' />
            Recents
          </Button>

          <div className={cn(
            'my-4 px-3 text-xs font-medium',
            isDark ? 'text-gray-500' : 'text-gray-400'
          )}>Starred</div>

          <Button
            variant="ghost"
            onClick={() => setActiveTab('all-maps')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'all-maps'
                ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
          >
            <Grid3x3 className='w-5 h-5' />
            All Maps
          </Button>

          <Button
            variant="ghost"
            onClick={() => setActiveTab('shared')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'shared'
                ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
          >
            <Share2 className='w-5 h-5' />
            Shared
          </Button>

          <Button
            variant="ghost"
            onClick={() => setActiveTab('trash')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'trash'
                ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
          >
            <Trash2 className='w-5 h-5' />
            Trash
          </Button>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className='flex-1 flex flex-col min-w-0'>
        {/* 顶部栏 */}
        <header className={cn(
          'h-16 border-b flex items-center justify-between px-6 flex-shrink-0',
          isDark ? 'border-gray-800' : 'border-gray-200'
        )}>
          <h1 className='text-xl font-semibold'>All Maps</h1>
          <div className='flex items-center gap-3'>
            {/* 主题切换按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={cn(
                'rounded-lg transition-all',
                isDark ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              )}
              title={isDark ? '切换到白天模式' : '切换到暗夜模式'}
            >
              {isDark ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                isDark ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Crown className='w-5 h-5' />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                isDark ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Settings className='w-5 h-5' />
            </Button>
          </div>
        </header>

        <ScrollArea className='flex-1'>
          <div className='p-6'>
            {/* 模板横幅 */}
            <div className='mb-8 overflow-hidden'>
              <div className='flex gap-4 overflow-x-auto pb-4 -mx-6 px-6'>
                {/* Create New 卡片 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  onClick={handleCreateNew}
                  className={cn(
                    'flex-shrink-0 w-48 h-40 rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center group',
                    isDark
                      ? 'bg-[#2a2a2a] border-gray-700 hover:border-black-500'
                      : 'bg-white border-gray-200 hover:border-black-500 shadow-sm hover:shadow-md'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-full transition-colors flex items-center justify-center mb-3',
                    isDark
                      ? 'bg-gray-700 group-hover:bg-black-600'
                      : 'bg-gray-100 group-hover:bg-black-600'
                  )}>
                    <Plus className='w-6 h-6' />
                  </div>
                  <span className={cn(
                    'text-sm',
                    isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
                  )}>Create New</span>
                </motion.div>

                {/* 模板卡片 */}
                {templates.map((template, index) => (
                  <motion.div
                    key={template.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => handleCreateWithTemplate(template.name)}
                    className={cn(
                      'flex-shrink-0 w-48 h-40 rounded-lg border transition-all cursor-pointer overflow-hidden group',
                      isDark
                        ? 'bg-[#2a2a2a] border-gray-700 hover:border-black-500'
                        : 'bg-white border-gray-200 hover:border-black-500 shadow-sm hover:shadow-md'
                    )}
                  >
                    <div className={cn(
                      'h-32 flex items-center justify-center',
                      isDark
                        ? 'bg-gradient-to-br from-black-500/20 to-blue-500/20'
                        : 'bg-gradient-to-br from-black-100 to-blue-100'
                    )}>
                      <span className={cn(
                        'text-xs',
                        isDark ? 'text-gray-500' : 'text-gray-400'
                      )}>Preview</span>
                    </div>
                    <div className='h-8 px-3 flex items-center justify-center'>
                      <span className={cn(
                        'text-xs',
                        isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
                      )}>{template.name}</span>
                    </div>
                  </motion.div>
                ))}

                {/* See All */}
                <div className='flex-shrink-0 w-32 h-40 flex items-center justify-center'>
                  <Button
                    variant="ghost"
                    className={cn(
                      'gap-2',
                      isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    See All
                    <ArrowRight className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            </div>

            {/* AI 创建对话框 */}
            {showChatTextarea && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'mb-8 p-6 rounded-lg border',
                  isDark
                    ? 'bg-[#2a2a2a] border-gray-700'
                    : 'bg-white border-gray-200 shadow-sm'
                )}
              >
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold'>Create with AI</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChatTextarea(false)}
                  >
                    Close
                  </Button>
                </div>
                <ChatTextarea
                  className='w-full'
                  messages={[]}
                  onSendMessages={(messages, configs) => {
                    createCanvasMutation({
                      name: t('home:newCanvas'),
                      canvas_id: nanoid(),
                      messages: messages,
                      session_id: nanoid(),
                      text_model: configs.textModel,
                      tool_list: configs.toolList,
                      system_prompt: localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT,
                    })
                    setShowChatTextarea(false)
                  }}
                  pending={isPending}
                />
              </motion.div>
            )}

            {/* 画布列表 */}
            <div className='mb-4'>
              <CanvasList />
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
