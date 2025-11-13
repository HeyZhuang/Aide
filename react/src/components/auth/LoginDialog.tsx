import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogContent } from '../ui/dialog'
import { startDeviceAuth, pollDeviceAuth, saveAuthData, loginWithCredentials, loginWithGoogle, register } from '../../api/auth'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { updateJaazApiKey } from '../../api/config'
import { useAuth } from '../../contexts/AuthContext'
import { useConfigs, useRefreshModels } from '../../contexts/configs'
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react'
import { LOGO_URL } from '../../constants'
import { useNavigate } from '@tanstack/react-router'
import { useTheme } from '@/hooks/use-theme'

export function LoginDialog() {
  const [authMessage, setAuthMessage] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const { refreshAuth } = useAuth()
  const { showLoginDialog: open, setShowLoginDialog } = useConfigs()
  const refreshModels = useRefreshModels()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { theme } = useTheme()

  // 获取当前实际应用的主题（考虑 system 模式）
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const getActualTheme = (): boolean => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      return theme === 'dark'
    }

    const updateTheme = () => {
      setIsDark(getActualTheme())
    }

    updateTheme()

    // 监听系统主题变化
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateTheme)
      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [theme])

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
      setShowEmailLogin(false)
      setShowPassword(false)
      setAgreeToTerms(false)
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

    if (!email.trim() || !password.trim()) {
      setAuthMessage('请输入邮箱和密码')
      return
    }

    try {
      setIsSubmitting(true)
      setAuthMessage('正在登录...')

      // 使用 email 作为 username 进行登录，使用默认 editor 角色
      const result = await loginWithCredentials(email.trim(), password, 'editor')

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

        setTimeout(() => {
          setShowLoginDialog(false)
          navigate({ to: '/' })
        }, 1500)
      } catch (error) {
        console.error('Failed to refresh auth status:', error)
        setTimeout(() => setShowLoginDialog(false), 1500)
      }

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

      const result = await register(username.trim(), email.trim(), password, 'editor')

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

        setTimeout(() => {
          setShowLoginDialog(false)
          navigate({ to: '/' })
        }, 1500)
      } catch (error) {
        console.error('Failed to refresh auth status:', error)
        setTimeout(() => setShowLoginDialog(false), 1500)
      }

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
      <DialogContent className="sm:max-w-5xl p-0 border-0 bg-transparent shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="flex h-[85vh] max-h-[700px] rounded-2xl overflow-hidden" style={{
          background: isDark ? 'rgba(28, 28, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        }}>
          {/* 左侧艺术背景区域 */}
          <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
            {/* 背景图片 */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1200&fit=crop"
                alt="Background"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
            {/* 渐变叠加 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            {/* 底部文字 */}
            <div className="absolute bottom-12 left-12 text-white z-10">
              <p className="text-3xl font-light tracking-wide">From mind to made.</p>
            </div>
          </div>

          {/* 右侧登录表单区域 */}
          <div className="w-full md:w-1/2 flex flex-col" style={{
            background: isDark ? 'rgb(45, 45, 48)' : 'rgb(28, 28, 30)',
          }}>
            <div className="flex-1 flex flex-col justify-center px-10 py-6">
              {!showEmailLogin ? (
                // 主登录界面
                <div className="space-y-8">
                  {/* Logo 和标题 */}
                  <div className="flex items-center gap-3 mb-8">
                    <img
                      src={LOGO_URL}
                      alt="Aide Logo"
                      className="w-10 h-10 rounded-lg object-contain"
                    />
                    <h1 className="text-2xl font-semibold text-white">Aide</h1>
                  </div>

                  {/* 社交登录按钮 */}
                  <div className="space-y-2.5">
                    <Button
                      onClick={handleGoogleLogin}
                      disabled={isSubmitting || !agreeToTerms}
                      className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
                      Join with Google
                    </Button>

                    <Button
                      disabled={!agreeToTerms}
                      className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Join with Facebook
                    </Button>

                    <Button
                      disabled={!agreeToTerms}
                      className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Join with X
                    </Button>
                  </div>

                  {/* 分隔线 */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 text-white/60 bg-[rgb(28,28,30)]">OR</span>
                    </div>
                  </div>

                  {/* Email 登录按钮 */}
                  <Button
                    onClick={() => setShowEmailLogin(true)}
                    disabled={!agreeToTerms}
                    className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Join with Email
                  </Button>

                  {/* 服务条款 */}
                  <div className="flex items-start gap-2.5 mt-4">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                      className="mt-1 border-white/40 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                    />
                    <label htmlFor="terms" className="text-sm text-white/60 leading-relaxed">
                      By proceeding, you agree to our{' '}
                      <a href="#" className="text-white underline">Terms of Service</a>
                      {' '}and acknowledge our{' '}
                      <a href="#" className="text-white underline">Privacy Policy.</a>
                    </label>
                  </div>
                </div>
              ) : (
                // Email 登录/注册子页面
                <div className="space-y-6">
                  {/* 返回按钮 */}
                  <button
                    onClick={() => {
                      setShowEmailLogin(false)
                      setIsRegisterMode(false)
                      setAuthMessage('')
                      setUsername('')
                      setEmail('')
                      setPassword('')
                      setConfirmPassword('')
                    }}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
                    aria-label="Back to main login"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm">Back</span>
                  </button>

                  {/* Logo 和标题 */}
                  <div className="flex items-center gap-3 mb-6">
                    <img
                      src={LOGO_URL}
                      alt="Aide Logo"
                      className="w-10 h-10 rounded-lg object-contain"
                    />
                    <h1 className="text-2xl font-semibold text-white">{isRegisterMode ? 'Create Account' : 'Aide'}</h1>
                  </div>

                  {/* 状态消息 */}
                  {authMessage && (
                    <div
                      className={`p-4 rounded-xl border ${isSuccess
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : isError
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {isSuccess ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isError ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        )}
                        <p className="text-sm">{authMessage}</p>
                      </div>
                    </div>
                  )}

                  {!isSuccess && !isRegisterMode && (
                    // 登录表单
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm text-white/80">
                          Email address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg"
                          placeholder="Enter your email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm text-white/80">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg pr-11"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* 忘记密码 */}
                      <div className="text-right">
                        <button
                          type="button"
                          className="text-sm text-white/60 hover:text-white transition-colors"
                          aria-label="Forget password"
                        >
                          Forget password
                        </button>
                      </div>

                      {/* 登录按钮 */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || !email.trim() || !password.trim()}
                        className="w-full h-12 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-lg transition-all mt-4"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          'Login'
                        )}
                      </Button>

                      {/* 注册链接 */}
                      <div className="text-center mt-4">
                        <span className="text-white/60 text-sm">Don't have an account? </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegisterMode(true)
                            setAuthMessage('')
                          }}
                          className="text-white text-sm font-medium hover:underline"
                          aria-label="Register new account"
                        >
                          Register
                        </button>
                      </div>
                    </form>
                  )}

                  {!isSuccess && isRegisterMode && (
                    // 注册表单
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm text-white/80">
                          Username
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isSubmitting}
                          className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg"
                          placeholder="Enter your username (min 3 characters)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-sm text-white/80">
                          Email address
                        </Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                          className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg"
                          placeholder="Enter your email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-sm text-white/80">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="register-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg pr-11"
                            placeholder="Enter your password (min 6 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm text-white/80">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isSubmitting}
                            className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg pr-11"
                            placeholder="Confirm your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* 注册按钮 */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()}
                        className="w-full h-12 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-lg transition-all mt-4"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>

                      {/* 返回登录链接 */}
                      <div className="text-center mt-4">
                        <span className="text-white/60 text-sm">Already have an account? </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegisterMode(false)
                            setAuthMessage('')
                            setUsername('')
                            setConfirmPassword('')
                          }}
                          className="text-white text-sm font-medium hover:underline"
                          aria-label="Back to login"
                        >
                          Login
                        </button>
                      </div>
                    </form>
                  )}

                  {/* 成功状态 */}
                  {isSuccess && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-400" />
                      </div>
                      <p className="text-white text-lg font-medium">{authMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
