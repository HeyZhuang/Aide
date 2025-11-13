import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 路由保护组件
 * 仅在加载时显示加载状态，不强制要求登录
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuth()

  // 加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // 直接显示内容，不检查登录状态
  return <>{children}</>
}

