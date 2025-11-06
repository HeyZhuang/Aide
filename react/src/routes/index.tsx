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
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useAuth } from '@/contexts/AuthContext'
import { logout } from '@/api/auth'
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
  Sun,
  Languages,
  FileImage,
  LogOut,
  Copy,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import i18n from '@/i18n'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listPSDTemplates, type PSDTemplateInfo } from '@/api/upload'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const { t, i18n: translationI18n } = useTranslation()
  const { setInitCanvas } = useConfigs()
  const { theme, setTheme } = useTheme()
  const { authStatus, refreshAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('projects')
  const [showChatTextarea, setShowChatTextarea] = useState(false)
  const [psdTemplates, setPsdTemplates] = useState<PSDTemplateInfo[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Set<string>>(new Set())
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const [subscriptionType, setSubscriptionType] = useState<'monthly' | 'yearly'>('monthly')

  const isDark = theme === 'dark'

  // 处理登出
  const handleLogout = async () => {
    try {
      await logout()
      await refreshAuth()
      toast.success(t('common:auth.logoutSuccessMessage'))
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(t('home:messages.logoutFailed'))
    }
  }

  // 语言切换函数
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

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

  // 获取PSD模板列表
  useEffect(() => {
    const fetchPsdTemplates = async () => {
      setLoadingTemplates(true)
      try {
        const templates = await listPSDTemplates()

        // 前端去重：基于文件名去重，保留最新的模板
        const templatesMap = new Map<string, PSDTemplateInfo>()
        templates.forEach(template => {
          const existing = templatesMap.get(template.name)
          if (!existing) {
            templatesMap.set(template.name, template)
          } else {
            const existingDate = existing.created_at ? new Date(existing.created_at).getTime() : 0
            const currentDate = template.created_at ? new Date(template.created_at).getTime() : 0
            if (currentDate > existingDate) {
              templatesMap.set(template.name, template)
            }
          }
        })

        const uniqueTemplates = Array.from(templatesMap.values())
        setPsdTemplates(uniqueTemplates)
      } catch (err) {
        console.error('获取PSD模板失败:', err)
        toast.error(t('home:messages.fetchTemplatesFailed'))
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchPsdTemplates()
  }, [])

  // 处理缩略图加载错误
  const handleThumbnailError = (templateName: string) => {
    setThumbnailLoadErrors(prev => new Set(prev).add(templateName))
  }

  // 处理PSD模板点击 - 创建新画布并导航
  const handlePsdTemplateClick = (template: PSDTemplateInfo) => {
    createCanvasMutation({
      name: template.display_name || template.name,
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2',
                  isDark ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-100'
                )}
              >
                <LayoutGrid className='w-5 h-5' />
                <span>{t('home:userMenu.myWorks')}</span>
                <ChevronDown className='w-4 h-4 ml-auto' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(
                'w-56',
                isDark ? 'bg-[#252525] border-gray-800' : 'bg-white border-gray-200'
              )}
            >
              <DropdownMenuItem
                className={cn(
                  'cursor-pointer',
                  isDark ? 'hover:bg-gray-800 focus:bg-gray-800' : 'hover:bg-gray-100 focus:bg-gray-100'
                )}
              >
                <LayoutGrid className='w-4 h-4 mr-2' />
                {t('home:userMenu.myWorks')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowAccountDialog(true)}
                className={cn(
                  'cursor-pointer',
                  isDark ? 'hover:bg-gray-800 focus:bg-gray-800' : 'hover:bg-gray-100 focus:bg-gray-100'
                )}
              >
                <Crown className='w-4 h-4 mr-2' />
                {t('home:userMenu.accountSettings')}
              </DropdownMenuItem>
              {authStatus.is_logged_in && (
                <>
                  <div className={cn('my-1 h-px', isDark ? 'bg-gray-800' : 'bg-gray-200')} />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className={cn(
                      'cursor-pointer text-red-600 dark:text-red-400',
                      isDark ? 'hover:bg-gray-800 focus:bg-gray-800' : 'hover:bg-gray-100 focus:bg-gray-100'
                    )}
                  >
                    <ArrowRight className='w-4 h-4 mr-2' />
                    {t('home:userMenu.signOut')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className='px-4 pb-4'>
          <Button
            onClick={handleCreateNew}
            className='w-full bg-gray-900 hover:bg-gray-800 text-white gap-2'
          >
            <Lightbulb className='w-4 h-4' />
            {t('home:sidebar.createWithAI')}
          </Button>
        </div>

        <nav className='flex-1 px-2'>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('projects')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'projects'
                ? isDark ? 'bg-gray-800' : 'bg-gray-100'
                : isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            )}
          >
            <LayoutGrid className='w-5 h-5' />
            {t('home:sidebar.projects')}
          </Button>

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
            {t('home:sidebar.recents')}
          </Button>

          <div className={cn(
            'my-4 px-3 text-xs font-medium',
            isDark ? 'text-gray-500' : 'text-gray-400'
          )}>{t('home:sidebar.starred')}</div>

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
            {t('home:sidebar.allMaps')}
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
            {t('home:sidebar.shared')}
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
            {t('home:sidebar.trash')}
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
          <h1 className='text-xl font-semibold'></h1>
          <div className='flex items-center gap-3'>
            {/* 语言下拉菜单（复用样式） */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'rounded-lg transition-all',
                    isDark ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Languages className='w-5 h-5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn(isDark ? 'bg-[#252525] border-gray-800' : 'bg-white border-gray-200')}>
                <DropdownMenuItem onClick={() => changeLanguage('en')}>
                  English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('zh-CN')}>
                  简体中文
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 主题切换按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={cn(
                'rounded-lg transition-all',
                isDark ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              )}
              title={isDark ? t('home:header.themeSwitch.light') : t('home:header.themeSwitch.dark')}
            >
              {isDark ? <Sun className='w-5 h-5' /> : <Moon className='w-5 h-5' />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSubscriptionDialog(true)}
              className={cn(
                isDark ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              )}
              title={t('home:subscription.title')}
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
          <div className='p-6 pr-0'>
            {/* 只在首次进入（templates标签）显示模板区 */}
            {activeTab === 'templates' && (
              <div className='flex flex-col px-10 mt-10 gap-4 select-none max-w-[1200px] mx-auto w-full'>
                <motion.span
                  className='text-2xl font-bold'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {t('home:header.allMaps')}
                </motion.span>

                <div className='grid grid-cols-4 gap-4 w-full pb-10'>
                  {loadingTemplates ? (
                    <div className='col-span-4 flex items-center justify-center py-12'>
                      <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        {t('home:templates.loading')}
                      </span>
                    </div>
                  ) : psdTemplates.length === 0 ? (
                    <div className='col-span-4 flex flex-col items-center justify-center py-12'>
                      <FileImage className={cn('w-8 h-8 mb-2', isDark ? 'text-gray-600' : 'text-gray-300')} />
                      <span className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        {t('home:templates.noTemplates')}
                      </span>
                    </div>
                  ) : (
                    psdTemplates.map((template, index) => {
                      const hasThumbnailError = thumbnailLoadErrors.has(template.name)
                      return (
                        <motion.div
                          key={template.name}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          onClick={() => handlePsdTemplateClick(template)}
                          className={cn(
                            'w-full aspect-square rounded-lg border transition-all cursor-pointer overflow-hidden group',
                            isDark
                              ? 'bg-[#2a2a2a] border-gray-700 hover:border-gray-500'
                              : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm hover:shadow-md'
                          )}
                        >
                          <div className={cn(
                            'w-full h-[calc(100%-2rem)] flex items-center justify-center overflow-hidden',
                            isDark
                              ? 'bg-gradient-to-br from-gray-500/20 to-blue-500/20'
                              : 'bg-gradient-to-br from-gray-100 to-blue-100'
                          )}>
                            {template.thumbnail_url && !hasThumbnailError ? (
                              <img
                                src={template.thumbnail_url}
                                alt={template.display_name || template.name}
                                className='w-full h-full object-cover'
                                onError={() => handleThumbnailError(template.name)}
                              />
                            ) : (
                              <FileImage className={cn(
                                'w-12 h-12',
                                isDark ? 'text-gray-600' : 'text-gray-300'
                              )} />
                            )}
                          </div>
                          <div className='h-8 px-3 flex items-center justify-center'>
                            <span className={cn(
                              'text-xs truncate w-full text-center',
                              isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
                            )}>
                              {template.display_name || template.name}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* 显示项目列表（Projects标签时） */}
            {activeTab === 'projects' && <CanvasList />}

            {/* 其他标签页内容留空（可扩展） */}
            {activeTab === 'recents' && (
              <div className='text-center py-12'>
                <p className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                  {t('home:sidebar.recents')}
                </p>
              </div>
            )}
            {activeTab === 'all-maps' && (
              <div className='flex flex-col px-10 mt-10 gap-4 select-none max-w-[1200px] mx-auto w-full'>
                <motion.span
                  className='text-2xl font-bold'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {t('home:header.allMaps')}
                </motion.span>

                <div className='grid grid-cols-4 gap-4 w-full pb-10'>
                  {loadingTemplates ? (
                    <div className='col-span-4 flex items-center justify-center py-12'>
                      <span className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        {t('home:templates.loading')}
                      </span>
                    </div>
                  ) : psdTemplates.length === 0 ? (
                    <div className='col-span-4 flex flex-col items-center justify-center py-12'>
                      <FileImage className={cn('w-8 h-8 mb-2', isDark ? 'text-gray-600' : 'text-gray-300')} />
                      <span className={cn('text-xs', isDark ? 'text-gray-500' : 'text-gray-400')}>
                        {t('home:templates.noTemplates')}
                      </span>
                    </div>
                  ) : (
                    psdTemplates.map((template, index) => {
                      const hasThumbnailError = thumbnailLoadErrors.has(template.name)
                      return (
                        <motion.div
                          key={template.name}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          onClick={() => handlePsdTemplateClick(template)}
                          className={cn(
                            'w-full aspect-square rounded-lg border transition-all cursor-pointer overflow-hidden group',
                            isDark
                              ? 'bg-[#2a2a2a] border-gray-700 hover:border-gray-500'
                              : 'bg-white border-gray-200 hover:border-gray-400 shadow-sm hover:shadow-md'
                          )}
                        >
                          <div className={cn(
                            'w-full h-[calc(100%-2rem)] flex items-center justify-center overflow-hidden',
                            isDark
                              ? 'bg-gradient-to-br from-gray-500/20 to-blue-500/20'
                              : 'bg-gradient-to-br from-gray-100 to-blue-100'
                          )}>
                            {template.thumbnail_url && !hasThumbnailError ? (
                              <img
                                src={template.thumbnail_url}
                                alt={template.display_name || template.name}
                                className='w-full h-full object-cover'
                                onError={() => handleThumbnailError(template.name)}
                              />
                            ) : (
                              <FileImage className={cn(
                                'w-12 h-12',
                                isDark ? 'text-gray-600' : 'text-gray-300'
                              )} />
                            )}
                          </div>
                          <div className='h-8 px-3 flex items-center justify-center'>
                            <span className={cn(
                              'text-xs truncate w-full text-center',
                              isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'
                            )}>
                              {template.display_name || template.name}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
            {activeTab === 'shared' && (
              <div className='text-center py-12'>
                <p className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                  {t('home:sidebar.shared')}
                </p>
              </div>
            )}
            {activeTab === 'trash' && (
              <div className='text-center py-12'>
                <p className={cn('text-sm', isDark ? 'text-gray-500' : 'text-gray-400')}>
                  {t('home:sidebar.trash')}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* 账户设置弹窗 */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent
          className={cn(
            'max-w-md',
            isDark
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          )}
          style={{
            background: isDark
              ? 'rgba(42, 42, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: isDark
              ? '1px solid rgba(75, 75, 75, 0.5)'
              : '1px solid rgba(229, 229, 229, 0.5)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.5)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <DialogHeader className='border-b pb-4' style={{
            borderColor: isDark ? 'rgba(75, 75, 75, 0.5)' : 'rgba(229, 229, 229, 0.5)'
          }}>
            <DialogTitle className={cn(
              'text-lg font-semibold',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              {t('home:accountDialog.title')}
            </DialogTitle>
          </DialogHeader>
          {authStatus.is_logged_in && authStatus.user_info && (
            <div className='py-6 space-y-6'>
              {/* 用户信息卡片 */}
              <div className={cn(
                'rounded-lg p-4 transition-all',
                isDark
                  ? 'bg-gradient-to-br from-gray-800 to-gray-800/50 border border-gray-700/50'
                  : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200/50'
              )}>
                <div className='flex items-center gap-4'>
                  {/* 头像 */}
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
                    isDark ? 'bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700/50' : 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/50'
                  )}>
                    {authStatus.user_info.image_url ? (
                      <img
                        src={authStatus.user_info.image_url}
                        alt={authStatus.user_info.username}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className={cn(
                        'text-xl font-bold',
                        isDark ? 'text-blue-200' : 'text-blue-600'
                      )}>
                        {authStatus.user_info.username?.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 用户基本信息 */}
                  <div className='flex-1 min-w-0'>
                    <h3 className={cn(
                      'text-sm font-semibold truncate',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {authStatus.user_info.username}
                    </h3>
                    <p className={cn(
                      'text-xs truncate mt-1',
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      {authStatus.user_info.email}
                    </p>
                    {authStatus.user_info.created_at && (
                      <p className={cn(
                        'text-xs mt-2',
                        isDark ? 'text-gray-500' : 'text-gray-500'
                      )}>
                        {t('home:accountDialog.joinedDate')}: {new Date(authStatus.user_info.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 账户详情 */}
              <div className='space-y-3'>
                {/* 昵称字段 */}
                <div className='space-y-2'>
                  <label className={cn(
                    'text-xs font-medium block uppercase tracking-wider',
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {t('home:accountDialog.nickname')}
                  </label>
                  <div className={cn(
                    'px-3 py-2.5 rounded-lg border transition-all',
                    isDark
                      ? 'bg-gray-900/50 border-gray-700/50 text-white text-sm'
                      : 'bg-gray-50/50 border-gray-200/50 text-gray-900 text-sm'
                  )}>
                    {authStatus.user_info.username}
                  </div>
                </div>

                {/* 电子邮箱字段 */}
                <div className='space-y-2'>
                  <label className={cn(
                    'text-xs font-medium block uppercase tracking-wider',
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    {t('home:accountDialog.email')}
                  </label>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all',
                    isDark
                      ? 'bg-gray-900/50 border-gray-700/50'
                      : 'bg-gray-50/50 border-gray-200/50'
                  )}>
                    <span className={cn(
                      'text-sm break-all flex-1',
                      isDark ? 'text-white' : 'text-gray-900'
                    )}>
                      {authStatus.user_info.email}
                    </span>
                    <button
                      className={cn(
                        'p-1 rounded transition-colors flex-shrink-0',
                        isDark
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                          : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                      )}
                      title={t('home:accountDialog.copyEmail')}
                      onClick={() => {
                        navigator.clipboard.writeText(authStatus.user_info?.email || '')
                        toast.success(t('home:accountDialog.copied'))
                      }}
                    >
                      <Copy className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              </div>

              {/* 分割线 */}
              <div className='h-px' style={{
                background: isDark
                  ? 'linear-gradient(to right, transparent, rgba(75, 75, 75, 0.5), transparent)'
                  : 'linear-gradient(to right, transparent, rgba(229, 229, 229, 0.5), transparent)'
              }} />

              {/* 操作按钮 */}
              <div className='space-y-2'>
                <Button
                  className={cn(
                    'w-full h-10 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
                    isDark
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-900/30'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-200/50'
                  )}
                >
                  <ExternalLink className='w-4 h-4' />
                  {t('home:accountDialog.manageAccount')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 订阅弹窗 */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent
          className={cn(
            'max-w-5xl max-h-[90vh] overflow-y-auto',
            isDark
              ? 'bg-[#0f0f0f] border-gray-800 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          )}
          style={{
            background: isDark
              ? 'rgba(15, 15, 15, 0.98)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: isDark
              ? '1px solid rgba(55, 55, 55, 0.6)'
              : '1px solid rgba(229, 229, 229, 0.5)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.8)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <DialogHeader>
            <DialogTitle className={cn(
              'text-2xl font-bold text-center w-full',
              isDark ? 'text-white' : 'text-gray-900'
            )}>
              {t('home:subscription.title')}
            </DialogTitle>
          </DialogHeader>

          <div className='mt-6 space-y-6'>
            {/* 计费周期切换 */}
            <div className='flex justify-center gap-3 items-center'>
              <button
                onClick={() => setSubscriptionType('monthly')}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-semibold transition-all border-2',
                  subscriptionType === 'monthly'
                    ? isDark
                      ? 'border-blue-500 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 shadow-lg shadow-blue-500/20'
                      : 'border-blue-500 bg-blue-50 text-blue-600 shadow-md'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                )}
              >
                {t('home:subscription.monthly')}
              </button>
              <button
                onClick={() => setSubscriptionType('yearly')}
                className={cn(
                  'px-6 py-2.5 rounded-xl font-semibold transition-all border-2',
                  subscriptionType === 'yearly'
                    ? isDark
                      ? 'border-blue-500 bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 shadow-lg shadow-blue-500/20'
                      : 'border-blue-500 bg-blue-50 text-blue-600 shadow-md'
                    : isDark
                      ? 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                )}
              >
                {t('home:subscription.yearly')}
              </button>
            </div>

            {/* 订阅套餐卡片 */}
            <div className='grid grid-cols-4 gap-4'>
              {(['starter', 'basic', 'pro', 'ultimate'] as const).map((planKey) => {
                const plan = (t as any)('home:subscription.plans', { returnObjects: true })[planKey];
                const price = subscriptionType === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                const savings = subscriptionType === 'yearly' ? plan.yearlySavings : 0;
                const features = plan.features;

                return (
                  <div
                    key={planKey}
                    className={cn(
                      'rounded-2xl border-2 p-6 space-y-4 transition-all flex flex-col',
                      isDark
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800/50 border-gray-700/50 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10'
                        : 'bg-white border-gray-200 hover:border-blue-400 shadow-sm hover:shadow-lg'
                    )}
                  >
                    <h3 className={cn(
                      'font-bold text-lg',
                      isDark ? 'text-gray-100' : 'text-gray-900'
                    )}>{plan.name}</h3>
                    <div className='flex items-baseline gap-2'>
                      <span className={cn(
                        'text-3xl font-bold',
                        isDark ? 'text-white' : 'text-gray-900'
                      )}>${price}</span>
                      <span className={cn(
                        'text-sm',
                        isDark ? 'text-gray-400' : 'opacity-70'
                      )}>/{subscriptionType === 'monthly' ? t('home:subscription.monthly') : t('home:subscription.yearly')}</span>
                      {subscriptionType === 'yearly' && savings > 0 && (
                        <span className={cn(
                          'text-xs font-medium ml-auto px-2 py-1 rounded-md',
                          isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-green-100 text-green-700'
                        )}>
                          省${savings}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-xs',
                      isDark ? 'text-gray-400' : 'opacity-70'
                    )}>
                      {plan.monthlyCredits}算力/月
                    </p>
                    <Button className={cn(
                      'w-full font-semibold py-6 rounded-xl transition-all',
                      planKey === 'starter'
                        ? isDark
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md'
                        : isDark
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-md'
                    )}>
                      {t('home:subscription.upgrade')}
                    </Button>
                    <div className='flex-1'>
                      <h4 className={cn(
                        'text-sm font-semibold mb-3 pb-2 border-b',
                        isDark ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'
                      )}>
                        {t('home:subscription.features')}
                      </h4>
                      <ul className={cn('text-xs space-y-2', isDark ? 'text-gray-400' : 'text-gray-600')}>
                        {features.slice(0, 8).map((feature: string, idx: number) => (
                          <li key={idx} className='flex items-start gap-2'>
                            <span className={cn(
                              'mt-0.5 flex-shrink-0 font-bold',
                              isDark ? 'text-emerald-400' : 'text-green-500'
                            )}>✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI 创建弹窗 */}
      <Dialog open={showChatTextarea} onOpenChange={setShowChatTextarea}>
        <DialogContent
          className={cn(
            'max-w-2xl',
            isDark
              ? 'bg-[#2a2a2a] border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          )}
          style={{
            background: isDark
              ? 'rgba(42, 42, 42, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: isDark
              ? '1px solid rgba(75, 75, 75, 0.5)'
              : '1px solid rgba(229, 229, 229, 0.5)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.5)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>
              {t('home:aiCreation.title')}
            </DialogTitle>
          </DialogHeader>
          <div className='mt-4'>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}