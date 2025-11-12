import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TemplateList } from './TemplateList'
import { TemplateUpload } from './TemplateUpload'
import { RBACManagement } from './RBACManagement'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  Shield,
  LogOut,
  Home,
  Users,
  LayoutGrid
} from 'lucide-react'
import { logout } from '@/api/auth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import { Link } from '@tanstack/react-router'

export function AdminDashboard() {
  const { authStatus, refreshAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('templates')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  console.log('AdminDashboard rendering, authStatus:', authStatus)

  const handleLogout = async () => {
    try {
      await logout()
      await refreshAuth()
      toast.success('已退出登录')
      // 使用 window.location 跳转而不是 navigate
      window.location.href = '/'
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  return (
    <div className={cn(
      'min-h-screen',
      'bg-gray-50 dark:bg-black'
    )}>
      {/* 顶部导航栏 */}
      <header className={cn(
        'border-b h-20 flex items-center justify-between px-8',
        'bg-white dark:bg-card border-gray-200 dark:border-border',
        'shadow-sm'
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            'p-3 rounded-xl',
            'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
          )}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-foreground">
              管理仪表盘
            </h1>
            <p className="text-sm text-gray-500 dark:text-muted-foreground">
              欢迎，{authStatus.user_info?.username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-10 px-4 font-medium',
                'text-gray-700 dark:text-foreground',
                'hover:bg-gray-100 dark:hover:bg-secondary',
                'transition-colors'
              )}
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={cn(
              'h-10 px-4 font-medium',
              'text-red-600 dark:text-red-400',
              'hover:bg-red-50 dark:hover:bg-red-900/20',
              'transition-colors'
            )}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="container mx-auto px-8 py-8">
        <div className={cn(
          'rounded-2xl border p-8',
          'bg-white dark:bg-card border-gray-200 dark:border-border',
          'shadow-sm'
        )}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(
              'grid w-full grid-cols-3 mb-8 h-12',
              'bg-gray-100 dark:bg-secondary/50 rounded-xl p-1'
            )}>
              <TabsTrigger
                value="templates"
                className={cn(
                  'h-10 rounded-lg font-medium transition-all',
                  'data-[state=active]:bg-white dark:data-[state=active]:bg-card',
                  'data-[state=active]:text-gray-900 dark:data-[state=active]:text-foreground',
                  'data-[state=active]:shadow-sm'
                )}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                模板管理
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className={cn(
                  'h-10 rounded-lg font-medium transition-all',
                  'data-[state=active]:bg-white dark:data-[state=active]:bg-card',
                  'data-[state=active]:text-gray-900 dark:data-[state=active]:text-foreground',
                  'data-[state=active]:shadow-sm'
                )}
              >
                <Upload className="w-4 h-4 mr-2" />
                上传模板
              </TabsTrigger>
              <TabsTrigger
                value="rbac"
                className={cn(
                  'h-10 rounded-lg font-medium transition-all',
                  'data-[state=active]:bg-white dark:data-[state=active]:bg-card',
                  'data-[state=active]:text-gray-900 dark:data-[state=active]:text-foreground',
                  'data-[state=active]:shadow-sm'
                )}
              >
                <Users className="w-4 h-4 mr-2" />
                用户管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-0">
              <TemplateList />
            </TabsContent>

            <TabsContent value="upload" className="mt-0">
              <TemplateUpload onUploadSuccess={() => setActiveTab('templates')} />
            </TabsContent>

            <TabsContent value="rbac" className="mt-0">
              <RBACManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}


