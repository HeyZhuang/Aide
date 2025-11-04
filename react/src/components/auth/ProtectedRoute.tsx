import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useConfigs } from '@/contexts/configs'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 路由保护组件
 * 确保只有登录用户才能访问被保护的内容
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authStatus, isLoading } = useAuth()
  const { setShowLoginDialog } = useConfigs()
  const { t } = useTranslation()

  // 加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // 未登录，显示登录提示
  if (!authStatus.is_logged_in) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="max-w-md w-full mx-4 p-8 bg-card rounded-lg border shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{t('common:auth.loginRequired') || '需要登录'}</h1>
            <p className="text-muted-foreground">
              {t('common:auth.loginRequiredMessage') || '请先登录以使用网站功能'}
            </p>
          </div>
          <Button 
            onClick={() => setShowLoginDialog(true)}
            className="w-full"
            size="lg"
          >
            {t('common:auth.login') || '登录'}
          </Button>
        </div>
      </div>
    )
  }

  // 已登录，显示内容
  return <>{children}</>
}

