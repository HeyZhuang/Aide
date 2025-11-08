import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { TemplateList } from './TemplateList'
import { TemplateUpload } from './TemplateUpload'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Upload, 
  List, 
  Shield, 
  LogOut,
  Home,
  Sparkles
} from 'lucide-react'
import { logout } from '@/api/auth'
import { toast } from 'sonner'

export function AdminPanel() {
  const { authStatus, refreshAuth } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('templates')

  useEffect(() => {
    // 检查用户是否为管理员
    if (!authStatus.is_logged_in) {
      toast.error('请先登录')
      navigate({ to: '/' })
      return
    }

    const userRole = authStatus.user_info?.role || 'user'
    if (userRole !== 'admin') {
      toast.error('权限不足，需要管理员权限')
      navigate({ to: '/' })
      return
    }
  }, [authStatus, navigate])

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

  const userRole = authStatus.user_info?.role || 'user'
  const isAdmin = userRole === 'admin'

  if (!authStatus.is_logged_in || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* 顶部导航栏 - 毛玻璃效果 */}
        <div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-6 mb-8 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20">
                <Shield className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  管理员面板
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  欢迎，{authStatus.user_info?.username}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate({ to: '/' })}
                className="backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="backdrop-blur-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>

        {/* 主要内容区域 - 毛玻璃效果 */}
        <div className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl p-6 shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 backdrop-blur-sm bg-white/10 border border-white/20">
              <TabsTrigger 
                value="templates" 
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <List className="w-4 h-4 mr-2" />
                模板管理
              </TabsTrigger>
              <TabsTrigger 
                value="upload"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                上传模板
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-0">
              <TemplateList />
            </TabsContent>

            <TabsContent value="upload" className="mt-0">
              <TemplateUpload onUploadSuccess={() => setActiveTab('templates')} />
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



