import React, { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2 } from 'lucide-react'
import { useNavigate, useLocation } from '@tanstack/react-router'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// 白名单路由 - 不需要登录即可访问
const PUBLIC_ROUTES = ['/login']

/**
 * 路由保护组件
 * 检查登录状态，未登录用户重定向到 /login
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuth()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // 如果正在加载，不做任何处理
    if (isLoading) return

    // 检查当前路由是否在白名单中
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
      location.pathname === route || location.pathname.startsWith(route + '/')
    )

    // 如果不是白名单路由且未登录，重定向到登录页
    if (!isPublicRoute && !isAuthenticated) {
      navigate({ to: '/login', replace: true })
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate])

  // 加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // 检查当前路由是否在白名单中
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    location.pathname === route || location.pathname.startsWith(route + '/')
  )

  // 如果不是白名单路由且未登录，显示加载状态（等待重定向）
  if (!isPublicRoute && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}

