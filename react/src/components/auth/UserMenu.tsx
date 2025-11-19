import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshModels } from '@/contexts/configs'
import { BASE_API_URL } from '@/constants'
import { Button } from '@/components/ui/button'
import { useNavigate } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { logout } from '@/api/auth'
import { PointsDisplay } from './PointsDisplay'
import { UserManagementDialog } from './UserManagementDialog'
import { User, CreditCard, LogOut } from 'lucide-react'

export function UserMenu() {
  const { authStatus, refreshAuth } = useAuth()
  const refreshModels = useRefreshModels()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    await refreshAuth()
    // Refresh models list after logout and config update
    refreshModels()
  }

  // 如果用户已登录，显示用户菜单
  if (authStatus.is_logged_in && authStatus.user_info) {
    const { username, image_url } = authStatus.user_info
    const initials = username ? username.substring(0, 2).toUpperCase() : 'U'

    return (
      <>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative p-0 h-auto hover:bg-white/20 dark:hover:bg-white/10 transition-colors">
              <PointsDisplay>
                <Avatar className="h-6 w-6">
                  <AvatarImage src={image_url} alt={username} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </PointsDisplay>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-white/80 backdrop-blur-xl dark:bg-black/80 border border-white/30 dark:border-white/10 rounded-xl shadow-lg min-w-[200px]"
          >
            <DropdownMenuLabel className="flex items-center gap-2 py-2">
              <User className="h-4 w-4" />
              {t('common:auth.myAccount')}
            </DropdownMenuLabel>
            <DropdownMenuItem disabled className="cursor-default py-2">{username}</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/30 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={() => {
                const billingUrl = `${BASE_API_URL}/billing`
                if (window.electronAPI?.openBrowserUrl) {
                  window.electronAPI.openBrowserUrl(billingUrl)
                } else {
                  window.open(billingUrl, '_blank')
                }
              }}
              className="hover:bg-white/30 dark:hover:bg-white/10 rounded-lg py-2 flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {t('common:auth.recharge')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/30 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={() => {
                setOpen(false)
                // 通过触发一个自定义事件来打开用户管理弹窗
                setTimeout(() => {
                  const event = new CustomEvent('openUserManagement')
                  window.dispatchEvent(event)
                }, 0)
              }}
              className="hover:bg-white/30 dark:hover:bg-white/10 rounded-lg py-2 flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              {t('common:auth.userManagement')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/30 dark:bg-white/10" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="hover:bg-white/30 dark:hover:bg-white/10 rounded-lg py-2 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('common:auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserManagementDialog>
          <div style={{ display: 'none' }} />
        </UserManagementDialog>
      </>
    )
  }

  // 未登录状态，显示登录按钮
  return (
    <Button
      variant="outline"
      onClick={() => navigate({ to: '/login' })}
      className="border-white/30 dark:border-white/10 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
    >
      {t('common:auth.login')}
    </Button>
  )
}