import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { startDeviceAuth, pollDeviceAuth, saveAuthData } from '../../api/auth'
import { updateJaazApiKey } from '../../api/config'
import { useAuth } from '../../contexts/AuthContext'
import { useConfigs, useRefreshModels } from '../../contexts/configs'
import { Loader2, CheckCircle2, XCircle, LogIn, Sparkles } from 'lucide-react'
import { LOGO_URL } from '../../constants'

export function LoginDialog() {
  const [authMessage, setAuthMessage] = useState('')
  const { refreshAuth } = useAuth()
  const { showLoginDialog: open, setShowLoginDialog } = useConfigs()
  const refreshModels = useRefreshModels()
  const { t } = useTranslation()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up polling when dialog closes
  useEffect(() => {
    setAuthMessage('')

    if (!open) {
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
        setAuthMessage(t('common:auth.pollErrorMessage'))
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

  const handleLogin = async () => {
    try {
      setAuthMessage(t('common:auth.preparingLoginMessage'))

      const result = await startDeviceAuth()
      setAuthMessage(result.message)

      // Start polling for authorization status
      startPolling(result.code)

    } catch (error) {
      console.error('登录请求失败:', error)
      setAuthMessage(t('common:auth.loginRequestFailed'))
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
                {t('common:auth.loginToJaaz')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground max-w-xs mx-auto">
                {t('common:auth.loginDescription')}
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

          {/* 登录按钮区域 */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleLogin}
              disabled={!!authMessage && !isError}
              className="w-full h-12 text-base font-medium relative overflow-hidden group"
              size="lg"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{authMessage || t('common:auth.waitingForBrowser')}</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{authMessage}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>{t('common:auth.startLogin')}</span>
                  </>
                )}
              </span>
              {!authMessage && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              )}
            </Button>

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

          {/* 提示信息 */}
          {!authMessage && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {t('common:auth.loginDescription')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
