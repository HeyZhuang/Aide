import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { TemplateList } from './TemplateList'
import { TemplateUpload } from './TemplateUpload'
import { RBACManagement } from './RBACManagement'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  List, 
  Shield, 
  LogOut,
  Home,
  Users,
  LayoutGrid
} from 'lucide-react'
import { logout } from '@/api/auth'
import { toast } from 'sonner'

export function AdminDashboard() {
  const { authStatus, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('templates')

  const handleLogout = async () => {
    try {
      await logout()
      await refreshAuth()
      navigate({ to: '/' })
      toast.success('已退出登录')
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* 顶部导航栏 */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  管理仪表盘
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  欢迎，{authStatus.user_info?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate({ to: '/' })}
                className="bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-200/50 dark:hover:bg-slate-600/50"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-200/50 dark:hover:bg-slate-600/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/50 dark:bg-slate-700/50">
              <TabsTrigger 
                value="templates" 
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                模板管理
              </TabsTrigger>
              <TabsTrigger 
                value="upload"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100"
              >
                <Upload className="w-4 h-4 mr-2" />
                上传模板
              </TabsTrigger>
              <TabsTrigger 
                value="rbac"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100"
              >
                <Users className="w-4 h-4 mr-2" />
                RBAC 管理
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
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

