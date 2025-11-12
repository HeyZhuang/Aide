import { createCanvas } from '@/api/canvas'
import ChatTextarea from '@/components/chat/ChatTextarea'
import CanvasList from '@/components/home/CanvasList'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfigs } from '@/contexts/configs'
import { DEFAULT_SYSTEM_PROMPT } from '@/constants'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
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
  Loader2,
  Shield,
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
  const configsStore = useConfigs()
  const { setInitCanvas, textModel, selectedTools } = configsStore
  const toolList = selectedTools
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
    onSuccess: (data, variables, context) => {
      setInitCanvas(true)
      // 从 context 中获取模板信息（如果有）
      const templateInfo = (context as any)?.templateInfo
      navigate({
        to: '/canvas/$id',
        params: { id: data.id },
        search: {
          sessionId: variables.session_id,
          ...(templateInfo?.templateId && { templateId: templateInfo.templateId }),
          ...(templateInfo?.templateName && { templateName: templateInfo.templateName }),
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
    // 未登录用户也可以创建画布，但需要登录后才能保存
    // 保存模板信息到 sessionStorage，以便画布加载后应用
    const templateInfo = {
      templateId: template.template_id || null,
      templateName: template.name,
      displayName: template.display_name || template.name,
    }
    sessionStorage.setItem('pendingTemplate', JSON.stringify(templateInfo))

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
      'bg-gray-50 dark:bg-black text-gray-900 dark:text-foreground'
    )}>
      {/* 左侧边栏 */}
      <aside className={cn(
        'w-60 flex-shrink-0 border-r flex flex-col',
        'bg-white dark:bg-card border-gray-200 dark:border-border'
      )}>
        <div className='p-4'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2',
                  'text-gray-900 dark:text-foreground hover:bg-gray-100 dark:hover:bg-secondary'
                )}
              >
                <LayoutGrid className='w-5 h-5' />
                <span>{t('home:userMenu.my')}</span>
                <ChevronDown className='w-4 h-4 ml-auto' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={cn(
                'w-56',
                'bg-white dark:bg-popover border-gray-200 dark:border-border'
              )}
            >
              <DropdownMenuItem
                className={cn(
                  'cursor-pointer',
                  'hover:bg-gray-100 dark:hover:bg-secondary focus:bg-gray-100 dark:focus:bg-secondary'
                )}
              >
                <LayoutGrid className='w-4 h-4 mr-2' />
                {t('home:userMenu.myWorks')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowAccountDialog(true)}
                className={cn(
                  'cursor-pointer',
                  'hover:bg-gray-100 dark:hover:bg-secondary focus:bg-gray-100 dark:focus:bg-secondary'
                )}
              >
                <Crown className='w-4 h-4 mr-2' />
                {t('home:userMenu.accountSettings')}
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className={cn(
                  'cursor-pointer',
                  'hover:bg-gray-100 dark:hover:bg-secondary focus:bg-gray-100 dark:focus:bg-secondary'
                )}
              >
                <Link to="/admin/dashboard" className="flex items-center">
                  <Shield className='w-4 h-4 mr-2' />
                  {t('home:userMenu.adminPanel')}
                </Link>
              </DropdownMenuItem>
              {authStatus.is_logged_in && (
                <>
                  <div className={cn('my-1 h-px', 'bg-gray-200 dark:bg-border')} />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className={cn(
                      'cursor-pointer text-red-600 dark:text-red-400',
                      'hover:bg-gray-100 dark:hover:bg-secondary focus:bg-gray-100 dark:focus:bg-secondary'
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

        {/* 所有用户都可以创建新画布 */}
        {authStatus.is_logged_in && (
          <div className='px-4 pb-4'>
            <Button
              onClick={handleCreateNew}
              className='w-full bg-gray-900 hover:bg-gray-800 text-white gap-2'
            >
              <Lightbulb className='w-4 h-4' />
              {t('home:sidebar.createWithAI')}
            </Button>
          </div>
        )}

        <nav className='flex-1 px-2'>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('projects')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'projects'
                ? 'bg-gray-100 dark:bg-secondary'
                : 'hover:bg-gray-100 dark:hover:bg-secondary'
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
                ? 'bg-gray-100 dark:bg-secondary'
                : 'hover:bg-gray-100 dark:hover:bg-secondary'
            )}
          >
            <Clock className='w-5 h-5' />
            {t('home:sidebar.recents')}
          </Button>

          <div className={cn(
            'my-4 px-3 text-xs font-medium',
            'text-gray-400 dark:text-muted-foreground'
          )}>{t('home:sidebar.starred')}</div>

          <Button
            variant="ghost"
            onClick={() => setActiveTab('all-maps')}
            className={cn(
              'w-full justify-start gap-3 mb-1',
              activeTab === 'all-maps'
                ? 'bg-gray-100 dark:bg-secondary'
                : 'hover:bg-gray-100 dark:hover:bg-secondary'
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
                ? 'bg-gray-100 dark:bg-secondary'
                : 'hover:bg-gray-100 dark:hover:bg-secondary'
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
                ? 'bg-gray-100 dark:bg-secondary'
                : 'hover:bg-gray-100 dark:hover:bg-secondary'
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
          'border-gray-200 dark:border-border'
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
                    'text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-secondary'
                  )}
                >
                  <Languages className='w-5 h-5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn('bg-white dark:bg-popover border-gray-200 dark:border-border')}>
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
                'text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-secondary'
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
                'text-gray-700 dark:text-foreground hover:bg-gray-100 dark:hover:bg-secondary'
              )}
              title={t('home:subscription.title')}
            >
              <Crown className='w-5 h-5' />
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
                      <span className={cn('text-sm', 'text-gray-400 dark:text-muted-foreground')}>
                        {t('home:templates.loading')}
                      </span>
                    </div>
                  ) : psdTemplates.length === 0 ? (
                    <div className='col-span-4 flex flex-col items-center justify-center py-12'>
                      <FileImage className={cn('w-8 h-8 mb-2', 'text-gray-300 dark:text-muted-foreground')} />
                      <span className={cn('text-xs', 'text-gray-400 dark:text-muted-foreground')}>
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
                            'bg-white dark:bg-card border-gray-200 dark:border-border hover:border-gray-400 dark:hover:border-primary/40 shadow-sm hover:shadow-md'
                          )}
                        >
                          <div className={cn(
                            'w-full h-[calc(100%-2rem)] flex items-center justify-center overflow-hidden',
                            'bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-500/20 dark:to-blue-500/20'
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
                                'text-gray-300 dark:text-muted-foreground'
                              )} />
                            )}
                          </div>
                          <div className='h-8 px-3 flex items-center justify-center'>
                            <span className={cn(
                              'text-xs truncate w-full text-center',
                              'text-gray-600 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground'
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
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <CanvasList />
              </div>
            )}

            {/* 其他标签页内容留空（可扩展） */}
            {activeTab === 'recents' && (
              <div className='text-center py-12'>
                <p className={cn('text-sm', 'text-gray-400 dark:text-muted-foreground')}>
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
                      <span className={cn('text-sm', 'text-gray-400 dark:text-muted-foreground')}>
                        {t('home:templates.loading')}
                      </span>
                    </div>
                  ) : psdTemplates.length === 0 ? (
                    <div className='col-span-4 flex flex-col items-center justify-center py-12'>
                      <FileImage className={cn('w-8 h-8 mb-2', 'text-gray-300 dark:text-muted-foreground')} />
                      <span className={cn('text-xs', 'text-gray-400 dark:text-muted-foreground')}>
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
                            'bg-white dark:bg-card border-gray-200 dark:border-border hover:border-gray-400 dark:hover:border-primary/40 shadow-sm hover:shadow-md'
                          )}
                        >
                          <div className={cn(
                            'w-full h-[calc(100%-2rem)] flex items-center justify-center overflow-hidden',
                            'bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-500/20 dark:to-blue-500/20'
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
                                'text-gray-300 dark:text-muted-foreground'
                              )} />
                            )}
                          </div>
                          <div className='h-8 px-3 flex items-center justify-center'>
                            <span className={cn(
                              'text-xs truncate w-full text-center',
                              'text-gray-600 dark:text-muted-foreground group-hover:text-gray-900 dark:group-hover:text-foreground'
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
                <p className={cn('text-sm', 'text-gray-400 dark:text-muted-foreground')}>
                  {t('home:sidebar.shared')}
                </p>
              </div>
            )}
            {activeTab === 'trash' && (
              <div className='text-center py-12'>
                <p className={cn('text-sm', 'text-gray-400 dark:text-muted-foreground')}>
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
            'bg-white dark:bg-popover border-gray-200 dark:border-border text-gray-900 dark:text-foreground'
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(229, 229, 229, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <style>{`
            .dark .dialog-content {
              background: rgba(28, 28, 30, 0.95) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
            }
          `}</style>
          <DialogHeader className='border-b pb-4 dark:border-border'>
            <DialogTitle className={cn(
              'text-lg font-semibold',
              'text-gray-900 dark:text-foreground'
            )}>
              {t('home:accountDialog.title')}
            </DialogTitle>
          </DialogHeader>
          {authStatus.is_logged_in && authStatus.user_info && (
            <div className='py-6 space-y-6'>
              {/* 用户信息卡片 */}
              <div className={cn(
                'rounded-lg p-4 transition-all',
                'bg-gradient-to-br from-gray-50 to-white dark:from-card dark:to-card/50 border border-gray-200/50 dark:border-border'
              )}>
                <div className='flex items-center gap-4'>
                  {/* 头像 */}
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
                    'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 border border-blue-200/50 dark:border-blue-700/50'
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
                        'text-blue-600 dark:text-blue-200'
                      )}>
                        {authStatus.user_info.username?.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 用户基本信息 */}
                  <div className='flex-1 min-w-0'>
                    <h3 className={cn(
                      'text-sm font-semibold truncate',
                      'text-gray-900 dark:text-foreground'
                    )}>
                      {authStatus.user_info.username}
                    </h3>
                    <p className={cn(
                      'text-xs truncate mt-1',
                      'text-gray-600 dark:text-muted-foreground'
                    )}>
                      {authStatus.user_info.email}
                    </p>
                    {authStatus.user_info.created_at && (
                      <p className={cn(
                        'text-xs mt-2',
                        'text-gray-500 dark:text-muted-foreground'
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
                    'text-gray-500 dark:text-muted-foreground'
                  )}>
                    {t('home:accountDialog.nickname')}
                  </label>
                  <div className={cn(
                    'px-3 py-2.5 rounded-lg border transition-all',
                    'bg-gray-50/50 dark:bg-input border-gray-200/50 dark:border-border text-gray-900 dark:text-foreground text-sm'
                  )}>
                    {authStatus.user_info.username}
                  </div>
                </div>

                {/* 电子邮箱字段 */}
                <div className='space-y-2'>
                  <label className={cn(
                    'text-xs font-medium block uppercase tracking-wider',
                    'text-gray-500 dark:text-muted-foreground'
                  )}>
                    {t('home:accountDialog.email')}
                  </label>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all',
                    'bg-gray-50/50 dark:bg-input border-gray-200/50 dark:border-border'
                  )}>
                    <span className={cn(
                      'text-sm break-all flex-1',
                      'text-gray-900 dark:text-foreground'
                    )}>
                      {authStatus.user_info.email}
                    </span>
                    <button
                      className={cn(
                        'p-1 rounded transition-colors flex-shrink-0',
                        'hover:bg-gray-200 dark:hover:bg-secondary text-gray-500 dark:text-muted-foreground hover:text-gray-700 dark:hover:text-foreground'
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
              <div className='h-px bg-gray-200 dark:bg-border' />

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
            'max-w-5xl max-h-[90vh] overflow-y-auto subscription-dialog',
            isDark ? 'dark-mode' : 'light-mode'
          )}
          style={{
            background: isDark ? 'rgba(0, 0, 0, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.9)' : '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <DialogHeader>
            <DialogTitle className={cn(
              'text-2xl font-bold text-center w-full',
              isDark ? 'text-white' : 'text-black'
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
                  'px-8 py-3 rounded-full font-bold transition-all',
                  subscriptionType === 'monthly'
                    ? isDark
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.5)] border-2 border-white'
                      : 'bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 border-black'
                    : isDark
                      ? 'bg-transparent text-white/60 border-2 border-white/20 hover:border-white/40'
                      : 'bg-transparent text-black/60 border-2 border-black/20 hover:border-black/40'
                )}
              >
                {t('home:subscription.monthly')}
              </button>
              <button
                onClick={() => setSubscriptionType('yearly')}
                className={cn(
                  'px-8 py-3 rounded-full font-bold transition-all',
                  subscriptionType === 'yearly'
                    ? isDark
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.5)] border-2 border-white'
                      : 'bg-black text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] border-2 border-black'
                    : isDark
                      ? 'bg-transparent text-white/60 border-2 border-white/20 hover:border-white/40'
                      : 'bg-transparent text-black/60 border-2 border-black/20 hover:border-black/40'
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
                      'rounded-3xl border p-6 space-y-4 transition-all flex flex-col',
                      isDark
                        ? 'bg-black border-white/10 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                        : 'bg-white border-black/10 hover:border-black/30 hover:shadow-[0_0_30px_rgba(0,0,0,0.1)]'
                    )}
                  >
                    <h3 className={cn(
                      'font-bold text-lg',
                      isDark ? 'text-white' : 'text-black'
                    )}>{plan.name}</h3>
                    <div className='flex items-baseline gap-2'>
                      <span className={cn(
                        'text-3xl font-bold',
                        isDark ? 'text-white' : 'text-black'
                      )}>${price}</span>
                      <span className={cn(
                        'text-sm',
                        isDark ? 'text-white/60' : 'text-black/60'
                      )}>/{subscriptionType === 'monthly' ? t('home:subscription.monthly') : t('home:subscription.yearly')}</span>
                      {subscriptionType === 'yearly' && savings > 0 && (
                        <span className={cn(
                          'text-xs font-medium ml-auto px-2 py-1 rounded-md',
                          isDark
                            ? 'bg-white/10 text-white border border-white/20'
                            : 'bg-black/10 text-black border border-black/20'
                        )}>
                          省${savings}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      'text-xs',
                      isDark ? 'text-white/60' : 'text-black/60'
                    )}>
                      {plan.monthlyCredits}算力/月
                    </p>
                    <Button className={cn(
                      'w-full font-semibold py-6 rounded-xl transition-all',
                      isDark
                        ? 'bg-white text-black hover:bg-white/90 shadow-lg shadow-white/20'
                        : 'bg-black text-white hover:bg-black/90 shadow-lg shadow-black/20'
                    )}>
                      {t('home:subscription.upgrade')}
                    </Button>
                    <div className='flex-1'>
                      <h4 className={cn(
                        'text-sm font-semibold mb-3 pb-2 border-b',
                        isDark
                          ? 'text-white border-white/10'
                          : 'text-black border-black/10'
                      )}>
                        {t('home:subscription.features')}
                      </h4>
                      <ul className={cn(
                        'text-xs space-y-2',
                        isDark ? 'text-white/70' : 'text-black/70'
                      )}>
                        {features.slice(0, 8).map((feature: string, idx: number) => (
                          <li key={idx} className='flex items-start gap-2'>
                            <span className={cn(
                              'mt-0.5 flex-shrink-0 font-bold',
                              isDark ? 'text-white' : 'text-black'
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
            'bg-white dark:bg-popover border-gray-200 dark:border-border text-gray-900 dark:text-foreground'
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(229, 229, 229, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}
        >
          <style>{`
            .dark .dialog-content {
              background: rgba(42, 42, 42, 0.95) !important;
              border: 1px solid rgba(75, 75, 75, 0.5) !important;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
            }
          `}</style>
          <DialogHeader>
            <DialogTitle className='text-gray-900 dark:text-foreground'>
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