import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { startDeviceAuth, pollDeviceAuth, saveAuthData, loginWithCredentials, loginWithGoogle, register } from '../../api/auth'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updateJaazApiKey } from '../../api/config'
import { useAuth } from '../../contexts/AuthContext'
import { useConfigs, useRefreshModels } from '../../contexts/configs'
import { Loader2, CheckCircle2, XCircle, LogIn, Sparkles } from 'lucide-react'
import { LOGO_URL } from '../../constants'

export function LoginDialog() {
  const [authMessage, setAuthMessage] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const { refreshAuth } = useAuth()
  const { showLoginDialog: open, setShowLoginDialog } = useConfigs()
  const refreshModels = useRefreshModels()
  const { t } = useTranslation()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up polling when dialog closes
  useEffect(() => {
    if (!open) {
      setAuthMessage('')
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setIsSubmitting(false)
      setIsRegisterMode(false)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [open])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const startPolling = (code: string) => {
    console.log('Starting polling for device code:', code)

    const poll = async () => {
      try {
        const result = await pollDeviceAuth(code)
        console.log('Poll result:', result)

        if (result.status === 'authorized') {
          // Login successful - save auth data to local storage
          if (result.token && result.user_info) {
            saveAuthData(result.token, result.user_info)

            // Update jaaz provider api_key with the access token
            await updateJaazApiKey(result.token)
          }

          setAuthMessage(t('common:auth.loginSuccessMessage'))
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }

          try {
            await refreshAuth()
            console.log('Auth status refreshed successfully')
            // Refresh models list after successful login and config update
            refreshModels()
          } catch (error) {
            console.error('Failed to refresh auth status:', error)
          }

          setTimeout(() => setShowLoginDialog(false), 1500)

        } else if (result.status === 'expired') {
          // Authorization expired
          setAuthMessage(t('common:auth.authExpiredMessage'))
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }

        } else if (result.status === 'error') {
          // Error occurred
          setAuthMessage(result.message || t('common:auth.authErrorMessage'))
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }

        } else {
          // Still pending, continue polling
          setAuthMessage(t('common:auth.waitingForBrowser'))
        }
      } catch (error) {
        console.error('Polling error:', error)
        
        // 提供更详细的错误信息
        let errorMessage = t('common:auth.pollErrorMessage')
        if (error instanceof Error) {
          if (error.message.includes('连接失败') || error.message.includes('网络连接')) {
            errorMessage = error.message
          } else if (error.message.includes('请求超时')) {
            errorMessage = error.message
          } else {
            errorMessage = `${errorMessage}: ${error.message}`
          }
        }
        
        setAuthMessage(errorMessage)
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
      }
    }

    // Start polling immediately, then every 1 seconds
    poll()
    pollingIntervalRef.current = setInterval(poll, 1000)
  }

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (!username.trim() || !password.trim()) {
      setAuthMessage('请输入用户名和密码')
      return
    }
    
    try {
      setIsSubmitting(true)
      setAuthMessage('正在登录...')

      const result = await loginWithCredentials(username.trim(), password)
      
      // 保存认证数据
      saveAuthData(result.token, result.user_info)
      
      // Update jaaz provider api_key with the access token
      await updateJaazApiKey(result.token)
      
      setAuthMessage(t('common:auth.loginSuccessMessage'))
      
      try {
        await refreshAuth()
        console.log('Auth status refreshed successfully')
        // Refresh models list after successful login and config update
        refreshModels()
      } catch (error) {
        console.error('Failed to refresh auth status:', error)
      }

      setTimeout(() => setShowLoginDialog(false), 1500)

    } catch (error) {
      console.error('登录失败:', error)
      
      // 提供更详细的错误信息
      let errorMessage = t('common:auth.loginRequestFailed')
      if (error instanceof Error) {
        if (error.message.includes('用户名') || error.message.includes('密码')) {
          errorMessage = error.message
        } else if (error.message.includes('连接失败') || error.message.includes('无法连接')) {
          errorMessage = error.message
        } else if (error.message.includes('请求超时')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      setAuthMessage(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    // 验证输入
    if (!username.trim() || username.trim().length < 3) {
      setAuthMessage('用户名至少需要3个字符')
      return
    }
    
    if (!email.trim() || !email.includes('@')) {
      setAuthMessage('请输入有效的邮箱地址')
      return
    }
    
    if (!password.trim() || password.length < 6) {
      setAuthMessage('密码至少需要6个字符')
      return
    }
    
    if (password !== confirmPassword) {
      setAuthMessage('两次输入的密码不一致')
      return
    }
    
    try {
      setIsSubmitting(true)
      setAuthMessage('正在注册...')

      const result = await register(username.trim(), email.trim(), password)
      
      // 保存认证数据
      saveAuthData(result.token, result.user_info)
      
      // Update jaaz provider api_key with the access token
      await updateJaazApiKey(result.token)
      
      setAuthMessage('注册成功！正在登录...')
      
      try {
        await refreshAuth()
        console.log('Auth status refreshed successfully')
        // Refresh models list after successful registration and config update
        refreshModels()
      } catch (error) {
        console.error('Failed to refresh auth status:', error)
      }

      setTimeout(() => setShowLoginDialog(false), 1500)

    } catch (error) {
      console.error('注册失败:', error)
      
      // 提供更详细的错误信息
      let errorMessage = '注册失败，请稍后重试'
      if (error instanceof Error) {
        if (error.message.includes('用户名') || error.message.includes('邮箱') || error.message.includes('已存在')) {
          errorMessage = error.message
        } else if (error.message.includes('连接失败') || error.message.includes('无法连接')) {
          errorMessage = error.message
        } else if (error.message.includes('请求超时')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      setAuthMessage(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true)
      setAuthMessage('正在启动 Google 登录...')

      const result = await loginWithGoogle()
      
      // 保存认证数据
      saveAuthData(result.token, result.user_info)
      
      // Update jaaz provider api_key with the access token
      await updateJaazApiKey(result.token)
      
      setAuthMessage(t('common:auth.loginSuccessMessage') || '登录成功')
      
      try {
        await refreshAuth()
        console.log('Auth status refreshed successfully')
        // Refresh models list after successful login and config update
        refreshModels()
      } catch (error) {
        console.error('Failed to refresh auth status:', error)
      }

      setTimeout(() => setShowLoginDialog(false), 1500)

    } catch (error) {
      console.error('Google 登录失败:', error)
      
      // 提供更详细的错误信息
      let errorMessage = 'Google 登录失败'
      if (error instanceof Error) {
        if (error.message.includes('连接失败') || error.message.includes('无法连接')) {
          errorMessage = error.message
        } else if (error.message.includes('请求超时')) {
          errorMessage = error.message
        } else if (error.message.includes('无法打开认证窗口')) {
          errorMessage = error.message
        } else {
          errorMessage = error.message || errorMessage
        }
      }
      
      setAuthMessage(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setAuthMessage('')
    setShowLoginDialog(false)
  }

  // 判断当前状态
  const isPending = authMessage && !authMessage.includes('成功') && !authMessage.includes('失败') && !authMessage.includes('过期') && !authMessage.includes('错误')
  const isSuccess = authMessage && authMessage.includes('成功')
  const isError = authMessage && (authMessage.includes('失败') || authMessage.includes('过期') || authMessage.includes('错误'))

  return (
    <Dialog open={open} onOpenChange={setShowLoginDialog}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader className="text-center space-y-4 pb-2">
          {/* Logo 和标题区域 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl"></div>
              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-2xl border border-primary/20">
                <img 
                  src={LOGO_URL} 
                  alt="Aide Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              {isPending && (
                <div className="absolute -top-1 -right-1 animate-pulse">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                {isRegisterMode ? '注册账户' : t('common:auth.loginToJaaz')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-xs mx-auto">
                {isRegisterMode ? '创建新账户以开始使用' : t('common:auth.loginDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 状态消息区域 */}
          {authMessage && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 ${
              isSuccess 
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                : isError
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex-shrink-0 mt-0.5">
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : isError ? (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                )}
              </div>
              <p className={`text-sm flex-1 leading-relaxed ${
                isSuccess 
                  ? 'text-green-800 dark:text-green-200' 
                  : isError
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {authMessage}
              </p>
            </div>
          )}

          {/* 登录/注册表单 */}
          {!isSuccess && (
            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{isRegisterMode ? '用户名' : (t('common:auth.username') || '用户名或邮箱')}</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={isRegisterMode ? '请输入用户名（至少3个字符）' : (t('common:auth.usernamePlaceholder') || '请输入用户名或邮箱')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete="username"
                  minLength={isRegisterMode ? 3 : undefined}
                />
              </div>
              
              {isRegisterMode && (
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoComplete="email"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('common:auth.password') || '密码'}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isRegisterMode ? '请输入密码（至少6个字符）' : (t('common:auth.passwordPlaceholder') || '请输入密码')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  minLength={isRegisterMode ? 6 : undefined}
                />
              </div>
              
              {isRegisterMode && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              )}
              
              <Button
                type="submit"
                disabled={
                  isSubmitting || 
                  !username.trim() || 
                  !password.trim() || 
                  (isRegisterMode && (!email.trim() || !confirmPassword.trim() || password !== confirmPassword)) ||
                  (isRegisterMode && username.trim().length < 3) ||
                  (isRegisterMode && password.length < 6)
                }
                className="w-full h-12 text-base font-medium relative overflow-hidden group"
                size="lg"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{isRegisterMode ? '注册中...' : (t('common:auth.loggingIn') || '登录中...')}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>{isRegisterMode ? '注册' : (t('common:auth.login') || '登录')}</span>
                    </>
                  )}
                </span>
                {!isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                )}
              </Button>

              {/* 登录/注册切换 */}
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsRegisterMode(!isRegisterMode)
                    setAuthMessage('')
                    setEmail('')
                    setConfirmPassword('')
                  }}
                  className="text-primary hover:underline"
                  disabled={isSubmitting}
                >
                  {isRegisterMode ? '已有账户？立即登录' : '还没有账户？立即注册'}
                </button>
              </div>

              {/* 分隔线 */}
              {!isRegisterMode && (
                <>
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">或</span>
                    </div>
                  </div>

                  {/* Google 登录按钮 */}
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    variant="outline"
                    className="w-full h-12 text-base font-medium"
                    size="lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>登录中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <span>使用 Google 登录</span>
                        </>
                      )}
                    </span>
                  </Button>
                </>
              )}
            </form>
          )}

          {/* 成功消息 */}
          {isSuccess && (
            <div className="flex flex-col gap-3">
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{authMessage}</p>
              </div>
            </div>
          )}

          {/* 错误时显示取消按钮 */}
          {isError && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full"
            >
              {t('common:cancel') || '取消'}
            </Button>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
