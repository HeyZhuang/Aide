import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Edit3, User, Mail, Calendar, Coins } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useBalance } from '@/hooks/use-balance'
import { toast } from 'sonner'

interface UserManagementDialogProps {
  children: React.ReactNode
}

// 创建一个独立的余额显示组件，只在需要时渲染
function BalanceDisplay() {
  const { balance } = useBalance()
  const { t } = useTranslation()
  
  return (
    <div className="bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-white/20 dark:border-white/10">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Coins className="h-5 w-5" />
        {t('common:auth.balance')}
      </h3>
      <div className="text-2xl font-bold text-primary">
        ${balance}
      </div>
      <p className="text-sm text-muted-foreground mt-1">
        {t('common:auth.currentBalance')}
      </p>
    </div>
  )
}

export function UserManagementDialog({ children }: UserManagementDialogProps) {
  const [open, setOpen] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const { t } = useTranslation()
  const { authStatus } = useAuth()

  // 监听自定义事件以打开对话框
  useEffect(() => {
    const handleOpenUserManagement = () => {
      setOpen(true)
    }

    window.addEventListener('openUserManagement', handleOpenUserManagement)
    return () => {
      window.removeEventListener('openUserManagement', handleOpenUserManagement)
    }
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent 
          className="max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-white/80 backdrop-blur-xl dark:bg-black/80 border border-white/30 dark:border-white/10 rounded-2xl"
        >
          <DialogHeader className="flex-shrink-0 p-6 bg-white/50 dark:bg-black/50 backdrop-blur-md border-b border-white/30 dark:border-white/10 rounded-t-2xl">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('common:auth.userManagement')}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-grow overflow-hidden p-6">
            <Tabs defaultValue="account" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 bg-white/50 dark:bg-black/50 backdrop-blur-md p-1 rounded-xl">
                <TabsTrigger 
                  value="account" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:shadow-sm rounded-lg py-2"
                >
                  {t('common:auth.accountManagement')}
                </TabsTrigger>
                <TabsTrigger 
                  value="usage" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:shadow-sm rounded-lg py-2"
                >
                  {t('common:auth.usage')}
                </TabsTrigger>
                <TabsTrigger 
                  value="billing" 
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:shadow-sm rounded-lg py-2"
                >
                  {t('common:auth.billing')}
                </TabsTrigger>
              </TabsList>
              <div className="flex-grow overflow-auto mt-6">
                <TabsContent value="account" className="h-full">
                  <Card className="h-full border-white/30 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {t('common:auth.accountManagement')}
                      </CardTitle>
                      <CardDescription>{t('common:auth.accountManagementDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {authStatus.is_logged_in && authStatus.user_info && (
                        <div className="space-y-6">
                          {/* 个人信息卡片 */}
                          <div className="bg-white/30 dark:bg-white/5 p-4 rounded-xl border border-white/20 dark:border-white/10">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {t('common:auth.personalInfo')}
                            </h3>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-white/20 dark:bg-white/10 rounded-lg">
                                <span className="font-medium flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {t('common:auth.username')}:
                                </span>
                                <span className="text-muted-foreground">{authStatus.user_info.username}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-white/20 dark:bg-white/10 rounded-lg">
                                <span className="font-medium flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  {t('common:auth.email')}:
                                </span>
                                <span className="text-muted-foreground">
                                  {authStatus.user_info.email || t('common:auth.notProvided')}
                                </span>
                              </div>
                              {authStatus.user_info.created_at && (
                                <div className="flex items-center justify-between p-3 bg-white/20 dark:bg-white/10 rounded-lg">
                                  <span className="font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {t('common:auth.accountCreated')}:
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(authStatus.user_info.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 编辑资料按钮 */}
                          <div className="flex justify-center pt-4">
                            <Button 
                              className="gap-2 bg-white/80 hover:bg-white text-black dark:bg-black/80 dark:hover:bg-black dark:text-white border border-white/30 dark:border-white/10 rounded-xl px-6 py-2"
                              onClick={() => setShowEditProfile(true)}
                            >
                              <Edit3 className="h-4 w-4" />
                              {t('common:auth.editProfile')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="usage" className="h-full">
                  <Card className="h-full border-white/30 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {t('common:auth.usage')}
                      </CardTitle>
                      <CardDescription>{t('common:auth.usageDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center h-full">
                        <p>{t('common:auth.usageComingSoon')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="billing" className="h-full">
                  <Card className="h-full border-white/30 dark:border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        {t('common:auth.billing')}
                      </CardTitle>
                      <CardDescription>{t('common:auth.billingDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-center h-full">
                        <p>{t('common:auth.billingComingSoon')}</p>
                      </div>
                      {/* 余额显示 */}
                      {authStatus.is_logged_in && <BalanceDisplay />}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 编辑资料对话框 */}
      {authStatus.is_logged_in && (
        <EditProfileDialog open={showEditProfile} onOpenChange={setShowEditProfile} />
      )}
    </>
  )
}

// 将 EditProfileDialog 组件移到 UserManagementDialog 组件内部，避免循环依赖
function EditProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const { authStatus, refreshAuth } = useAuth()
  const [username, setUsername] = useState(authStatus.user_info?.username || '')
  const [bio, setBio] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // 这里将添加实际的API调用
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 更新成功后刷新认证状态
      await refreshAuth()
      toast.success(t('messages.saved'))
      onOpenChange(false)
    } catch (error) {
      console.error('更新资料失败:', error)
      toast.error(t('messages.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/80 backdrop-blur-xl dark:bg-black/80 border border-white/30 dark:border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            {t('common:auth.editProfile')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                {t('common:auth.username')}
              </Label>
              <div className="col-span-3">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bio" className="text-right">
                {t('common:auth.bio')}
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('common:auth.bioPlaceholder')}
                  className="bg-white/50 dark:bg-white/10 border-white/30 dark:border-white/10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white/50 hover:bg-white/70 dark:bg-black/50 dark:hover:bg-black/70 border-white/30 dark:border-white/10"
            >
              {t('buttons.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? t('buttons.loading') : t('buttons.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}