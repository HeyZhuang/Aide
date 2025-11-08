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
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'guest' | null>(null)
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
      setSelectedRole(null)
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
      <DialogContent className="sm:max-w-md overflow-hidden p-0 border-0 bg-transparent shadow-2xl max-h-[85vh] overflow-y-auto">
        <div 
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          }}
        >
          {/* 背景渐变装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative p-6">
            <DialogHeader className="text-center space-y-4 pb-3">
              {/* Logo 和标题区域 */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/20 to-primary/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                  <div 
                    className="relative p-4 rounded-2xl border transition-all duration-300 group-hover:scale-105"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <img 
                      src={LOGO_URL} 
                      alt="Aide Logo" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  {isPending && (
                    <div className="absolute -top-2 -right-2 animate-pulse">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md"></div>
                        <Sparkles className="w-5 h-5 text-primary relative z-10" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent tracking-tight">
                    {isRegisterMode ? '注册账户' : t('common:auth.loginToJaaz')}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                    {isRegisterMode ? '创建新账户以开始使用' : t('common:auth.loginDescription')}
                  </DialogDescription>
                  {/* 用户角色说明 - 紧凑且可点击 */}
                  {!isRegisterMode && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-foreground/70 text-center mb-2">选择您的身份类型</p>
                      <div className="flex flex-col gap-2">
                        {/* 注册用户卡片 */}
                        <div 
                          onClick={() => setSelectedRole(selectedRole === 'user' ? null : 'user')}
                          className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                            selectedRole === 'user' ? 'ring-2 ring-purple-500/50 ring-offset-2' : ''
                          }`}
                          style={{
                            background: selectedRole === 'user' 
                              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)'
                              : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            border: selectedRole === 'user' 
                              ? '1.5px solid rgba(139, 92, 246, 0.5)'
                              : '1.5px solid rgba(139, 92, 246, 0.3)',
                            boxShadow: selectedRole === 'user'
                              ? '0 4px 16px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                              : '0 4px 16px rgba(139, 92, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                          }}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-400/30 transition-transform duration-300 ${
                            selectedRole === 'user' ? 'scale-110' : ''
                          }`}>
                            <span className="text-lg">👤</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold mb-0.5 transition-colors duration-300 ${
                              selectedRole === 'user' 
                                ? 'text-purple-800 dark:text-purple-200' 
                                : 'text-purple-700 dark:text-purple-300'
                            }`}>注册用户</p>
                            <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 leading-tight">可浏览模板、下载和使用</p>
                          </div>
                          {selectedRole === 'user' && (
                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-500 border-2 border-white dark:border-gray-800"></div>
                          )}
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* 管理员卡片 */}
                        <div 
                          onClick={() => setSelectedRole(selectedRole === 'admin' ? null : 'admin')}
                          className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                            selectedRole === 'admin' ? 'ring-2 ring-blue-500/50 ring-offset-2' : ''
                          }`}
                          style={{
                            background: selectedRole === 'admin' 
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.15) 100%)'
                              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            border: selectedRole === 'admin' 
                              ? '1.5px solid rgba(59, 130, 246, 0.5)'
                              : '1.5px solid rgba(59, 130, 246, 0.3)',
                            boxShadow: selectedRole === 'admin'
                              ? '0 4px 16px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                              : '0 4px 16px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                          }}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-400/30 transition-transform duration-300 ${
                            selectedRole === 'admin' ? 'scale-110' : ''
                          }`}>
                            <span className="text-lg">🛡️</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold mb-0.5 transition-colors duration-300 ${
                              selectedRole === 'admin' 
                                ? 'text-blue-800 dark:text-blue-200' 
                                : 'text-blue-700 dark:text-blue-300'
                            }`}>管理员</p>
                            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 leading-tight">可上传、删除模板，管理所有功能</p>
                          </div>
                          {selectedRole === 'admin' && (
                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800"></div>
                          )}
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        
                        {/* 游客卡片 */}
                        <div 
                          onClick={() => {
                            setSelectedRole(selectedRole === 'guest' ? null : 'guest')
                            if (selectedRole !== 'guest') {
                              setTimeout(() => setShowLoginDialog(false), 300)
                            }
                          }}
                          className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 cursor-pointer active:scale-[0.98] ${
                            selectedRole === 'guest' ? 'ring-2 ring-gray-500/50 ring-offset-2' : ''
                          }`}
                          style={{
                            background: selectedRole === 'guest' 
                              ? 'linear-gradient(135deg, rgba(107, 114, 128, 0.25) 0%, rgba(75, 85, 99, 0.15) 100%)'
                              : 'linear-gradient(135deg, rgba(107, 114, 128, 0.15) 0%, rgba(75, 85, 99, 0.1) 100%)',
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            border: selectedRole === 'guest' 
                              ? '1.5px solid rgba(107, 114, 128, 0.5)'
                              : '1.5px solid rgba(107, 114, 128, 0.3)',
                            boxShadow: selectedRole === 'guest'
                              ? '0 4px 16px rgba(107, 114, 128, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                              : '0 4px 16px rgba(107, 114, 128, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                          }}
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center border border-gray-400/30 transition-transform duration-300 ${
                            selectedRole === 'guest' ? 'scale-110' : ''
                          }`}>
                            <span className="text-lg">👁️</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold mb-0.5 transition-colors duration-300 ${
                              selectedRole === 'guest' 
                                ? 'text-gray-800 dark:text-gray-200' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>游客</p>
                            <p className="text-[10px] text-gray-600/70 dark:text-gray-400/70 leading-tight">仅可查看模板缩略图，功能受限</p>
                          </div>
                          {selectedRole === 'guest' && (
                            <div className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-500 border-2 border-white dark:border-gray-800"></div>
                          )}
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2 px-6 pb-6">
              {/* 状态消息区域 */}
              {authMessage && (
                <div 
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 ${
                    isSuccess 
                      ? 'bg-green-50/80 dark:bg-green-950/40 border-green-200/50 dark:border-green-800/50' 
                      : isError
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-red-200/50 dark:border-red-800/50'
                      : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/50'
                  }`}
                  style={{
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                  }}
                >
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
                    <Label htmlFor="username" className="text-sm font-medium text-foreground/80">
                      {isRegisterMode ? '用户名' : (t('common:auth.username') || '用户名或邮箱')}
                    </Label>
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
                      className="h-10 bg-white/50 dark:bg-gray-900/50 border-2 border-gray-200/50 dark:border-gray-700/50 focus:border-primary/50 transition-all duration-200"
                    />
                  </div>
              
                  {isRegisterMode && (
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground/80">邮箱</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="请输入邮箱地址"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        required
                        autoComplete="email"
                        className="h-10 bg-white/50 dark:bg-gray-900/50 border-2 border-gray-200/50 dark:border-gray-700/50 focus:border-primary/50 transition-all duration-200"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
                      {t('common:auth.password') || '密码'}
                    </Label>
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
                      className="h-10 bg-white/50 dark:bg-gray-900/50 border-2 border-gray-200/50 dark:border-gray-700/50 focus:border-primary/50 transition-all duration-200"
                    />
                  </div>
                  
                  {isRegisterMode && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/80">确认密码</Label>
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
                        className="h-10 bg-white/50 dark:bg-gray-900/50 border-2 border-gray-200/50 dark:border-gray-700/50 focus:border-primary/50 transition-all duration-200"
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
                    className="w-full h-11 text-sm font-semibold relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300"
                    size="lg"
                    style={{
                      background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                          <span className="text-white">{isRegisterMode ? '注册中...' : (t('common:auth.loggingIn') || '登录中...')}</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5 text-white" />
                          <span className="text-white">{isRegisterMode ? '注册' : (t('common:auth.login') || '登录')}</span>
                        </>
                      )}
                    </span>
                    {!isSubmitting && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    )}
                  </Button>

                  {/* 登录/注册切换 */}
                  <div className="text-center space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsRegisterMode(!isRegisterMode)
                        setAuthMessage('')
                        setEmail('')
                        setConfirmPassword('')
                        setSelectedRole(null)
                      }}
                      className="text-primary hover:text-primary/80 font-medium text-xs transition-colors duration-200 hover:underline"
                      disabled={isSubmitting}
                    >
                      {isRegisterMode ? '已有账户？立即登录' : '还没有账户？立即注册'}
                    </button>
                  </div>

                  {/* 分隔线 */}
                  {!isRegisterMode && (
                    <>
                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/30"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span 
                            className="px-3 text-muted-foreground/60 font-medium"
                            style={{
                              background: 'rgba(255, 255, 255, 0.9)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                            }}
                          >
                            或
                          </span>
                        </div>
                      </div>

                      {/* Google 登录按钮 */}
                      <Button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isSubmitting}
                        variant="outline"
                        className="w-full h-10 text-sm font-semibold relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
                        size="lg"
                        style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(12px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                          border: '2px solid rgba(0, 0, 0, 0.1)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
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
                  <div className="text-center py-6">
                    <div className="relative inline-block mb-4">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                      <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto relative z-10" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{authMessage}</p>
                  </div>
                </div>
              )}

              {/* 错误时显示取消按钮 */}
              {isError && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full h-11 font-semibold"
                  style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {t('common:cancel') || '取消'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
