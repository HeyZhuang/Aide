import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginWithGoogle, loginWithCredentials, register, saveAuthData } from '@/api/auth'
import { updateJaazApiKey } from '@/api/config'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshModels } from '@/contexts/configs'
import { Loader2, CheckCircle2, XCircle, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react'
import { LOGO_URL } from '@/constants'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTheme } from '@/hooks/use-theme'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/login')({
    component: LoginPage,
})



const TechBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* 定义动画样式 */}
            <style >{`
              @keyframes techGradient {
                0% {
                  background-position: 0% 50%;
                }
                25% {
                  background-position: 100% 0%;
                }
                50% {
                  background-position: 100% 100%;
                }
                75% {
                  background-position: 0% 100%;
                }
                100% {
                  background-position: 0% 50%;
                }
              }
              
              @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
                25% { transform: translate(50px, -30px) scale(1.2) rotate(90deg); }
                50% { transform: translate(-30px, 40px) scale(0.8) rotate(180deg); }
                75% { transform: translate(-40px, -20px) scale(1.1) rotate(270deg); }
                100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
              }
              
              .tech-gradient {
                background: linear-gradient(
                  -45deg, 
                  #1e293b, 
                  #3730a3, 
                  #1e40af, 
                  #0891b2,
                  #059669,
                  #7c3aed
                );
                background-size: 400% 400%;
                animation: techGradient 20s ease infinite;
              }
              
              .animate-blob {
                animation: blob 12s infinite ease-in-out;
              }
              
              .animation-delay-2000 {
                animation-delay: 3s;
              }
              
              .animation-delay-4000 {
                animation-delay: 6s;
              }
              
              .animation-delay-6000 {
                animation-delay: 9s;
              }
            `}</style>

            {/* 主背景渐变 */}
            <div className="absolute inset-0 tech-gradient"></div>

            {/* 叠加的流动光斑层 */}
            <div className="absolute inset-0">
                {/* 紫色光斑 */}
                <div
                    className="absolute top-0 w-80 h-80 rounded-full animate-blob"
                    style={{
                        left: '-2rem',
                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 100%)',
                        filter: 'blur(60px)'
                    }}
                ></div>

                {/* 青色光斑 */}
                <div
                    className="absolute top-0 w-96 h-96 rounded-full animate-blob animation-delay-2000"
                    style={{
                        right: '-3rem',
                        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.7) 0%, rgba(34, 211, 238, 0.3) 50%, transparent 100%)',
                        filter: 'blur(80px)'
                    }}
                ></div>

                {/* 蓝色光斑 */}
                <div
                    className="absolute w-72 h-72 rounded-full animate-blob animation-delay-4000"
                    style={{
                        bottom: '-4rem',
                        left: '6rem',
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 100%)',
                        filter: 'blur(70px)'
                    }}
                ></div>

                {/* 绿色光斑 */}
                <div
                    className="absolute bottom-0 right-0 w-88 h-88 rounded-full animate-blob animation-delay-6000"
                    style={{
                        background: 'radial-gradient(circle, rgba(52, 211, 153, 0.6) 0%, rgba(52, 211, 153, 0.2) 50%, transparent 100%)',
                        filter: 'blur(90px)'
                    }}
                ></div>

                {/* 粉紫色光斑 */}
                <div
                    className="absolute w-64 h-64 rounded-full animate-blob"
                    style={{
                        top: '30%',
                        left: '60%',
                        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, transparent 70%)',
                        filter: 'blur(40px)',
                        animationDuration: '18s',
                        animationDelay: '1s'
                    }}
                ></div>
            </div>

            {/* 顶层光效 */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: 'radial-gradient(circle at 20% 80%, rgba(147, 197, 253, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(196, 181, 253, 0.4) 0%, transparent 50%)',
                    mixBlendMode: 'screen'
                }}
            ></div>
        </div>
    );
};

function LoginPage() {
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
    const refreshModels = useRefreshModels()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { theme } = useTheme()
    const { setAuth } = useAuthStore()

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

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            mediaQuery.addEventListener('change', updateTheme)
            return () => mediaQuery.removeEventListener('change', updateTheme)
        }
    }, [theme])

    const handleGoogleLogin = async () => {
        try {
            setIsSubmitting(true)
            setAuthMessage('正在启动 Google 登录...')
            const result = await loginWithGoogle()
            saveAuthData(result.token, result.user_info)
            setAuth(result.token, result.user_info)
            await updateJaazApiKey(result.token)
            setAuthMessage(t('common:auth.loginSuccessMessage') || '登录成功')

            try {
                await refreshAuth()
                refreshModels()
            } catch (error) {
                console.error('Failed to refresh auth status:', error)
            }

            setTimeout(() => {
                navigate({ to: '/' })
            }, 1500)

        } catch (error) {
            console.error('Google 登录失败:', error)
            let errorMessage = 'Google 登录失败'
            if (error instanceof Error) {
                // ... existing error handling logic
                errorMessage = error.message || errorMessage
            }
            setAuthMessage(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
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

            const result = await loginWithCredentials(email.trim(), password, 'editor')
            saveAuthData(result.token, result.user_info)
            setAuth(result.token, result.user_info)
            await updateJaazApiKey(result.token)
            setAuthMessage(t('common:auth.loginSuccessMessage'))

            try {
                await refreshAuth()
                refreshModels()
            } catch (error) {
                console.error('Failed to refresh auth status:', error)
            }

            setTimeout(() => {
                navigate({ to: '/' })
            }, 1500)

        } catch (error) {
            console.error('登录失败:', error)
            let errorMessage = t('common:auth.loginRequestFailed')
            if (error instanceof Error) {
                errorMessage = error.message || errorMessage
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
            saveAuthData(result.token, result.user_info)
            setAuth(result.token, result.user_info)
            await updateJaazApiKey(result.token)
            setAuthMessage('注册成功！正在登录...')

            try {
                await refreshAuth()
                refreshModels()
            } catch (error) {
                console.error('Failed to refresh auth status:', error)
            }

            setTimeout(() => {
                navigate({ to: '/' })
            }, 1500)

        } catch (error) {
            console.error('注册失败:', error)
            let errorMessage = '注册失败，请稍后重试'
            if (error instanceof Error) {
                errorMessage = error.message || errorMessage
            }
            setAuthMessage(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    // 判断当前状态
    const isPending = authMessage && !authMessage.includes('成功') && !authMessage.includes('失败') && !authMessage.includes('过期') && !authMessage.includes('错误')
    const isSuccess = authMessage && authMessage.includes('成功')
    const isError = authMessage && (authMessage.includes('失败') || authMessage.includes('过期') || authMessage.includes('错误'))

    return (
        <div className='relative h-screen w-screen flex justify-center items-center overflow-hidden'>
            {/* 1. 动态背景层 */}
            <TechBackground />

            {/* 2. 半透明遮罩层 (Overlay) */}
            {/* backdrop-blur-sm 可以让背景的流体更柔和，bg-black/20 稍微压暗背景以突出前景 */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[10px] z-0"></div>

            {/* 3. Login Card 内容层 (z-10 确保在背景之上) */}
            <div className={cn(
                'relative z-10 flex h-[700px] w-[90%] max-w-[1000px] overflow-hidden rounded-2xl shadow-2xl',
                // 增加一个边框光晕效果提升科技感
                '',
                isDark ? 'bg-black' : 'bg-gray-50'
            )}>
                <div className="flex h-full w-full rounded-2xl overflow-hidden" style={{
                    background: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                }}>
                    {/* 左侧艺术背景区域 - 保持不变 */}
                    <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20">
                            <img
                                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=1200&fit=crop"
                                alt="Background"
                                className="w-full h-full object-cover opacity-90"
                            />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute bottom-12 left-12 text-white z-10">
                            <p className="text-3xl font-light tracking-wide">From mind to made.</p>
                        </div>
                    </div>

                    {/* 右侧登录表单区域 - 保持不变 */}
                    <div className="w-full md:w-1/2 flex flex-col" style={{
                        background: isDark ? 'rgb(45, 45, 48)' : 'rgb(28, 28, 30)',
                    }}>
                        <div className="flex-1 flex flex-col justify-center px-10 py-6 overflow-y-auto">
                            {!showEmailLogin ? (
                                // 主登录界面 - 社交登录
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <img src={LOGO_URL} alt="Aide Logo" className="w-10 h-10 rounded-lg object-contain" />
                                        <h1 className="text-2xl font-semibold text-white">Aide</h1>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Button onClick={handleGoogleLogin} disabled={isSubmitting || !agreeToTerms} className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all">
                                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Join with Google
                                        </Button>
                                        <Button disabled={!agreeToTerms} className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all">
                                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                            Join with Facebook
                                        </Button>
                                        <Button disabled={!agreeToTerms} className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all">
                                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                            </svg>
                                            Join with X
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/20"></div></div>
                                        <div className="relative flex justify-center text-sm"><span className="px-4 text-white/60 bg-[rgb(28,28,30)]">OR</span></div>
                                    </div>

                                    <Button onClick={() => setShowEmailLogin(true)} disabled={!agreeToTerms} className="w-full h-12 text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all">
                                        <Mail className="w-5 h-5 mr-2" />
                                        Join with Email
                                    </Button>

                                    <div className="flex items-start gap-2.5">
                                        <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)} className="mt-1 border-white/40 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                                        <label htmlFor="terms" className="text-sm text-white/60 leading-relaxed">
                                            By proceeding, you agree to our <a href="#" className="text-white underline">Terms of Service</a> and acknowledge our <a href="#" className="text-white underline">Privacy Policy.</a>
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                // Email 登录/注册表单
                                <div className="space-y-4">
                                    <button onClick={() => { setShowEmailLogin(false); setIsRegisterMode(false); setAuthMessage(''); setUsername(''); setEmail(''); setPassword(''); setConfirmPassword(''); }} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                                        <ArrowLeft className="w-5 h-5" />
                                        <span className="text-sm">Back</span>
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <img src={LOGO_URL} alt="Aide Logo" className="w-10 h-10 rounded-lg object-contain" />
                                        <h1 className="text-2xl font-semibold text-white">{isRegisterMode ? 'Create Account' : 'Login'}</h1>
                                    </div>

                                    {authMessage && (
                                        <div className={`p-4 rounded-xl border ${isSuccess ? 'bg-green-500/10 border-green-500/30 text-green-400' : isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
                                            <div className="flex items-center gap-3">
                                                {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : isError ? <XCircle className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                                                <p className="text-sm">{authMessage}</p>
                                            </div>
                                        </div>
                                    )}

                                    {!isSuccess && !isRegisterMode && (
                                        <form onSubmit={handleLogin} className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="email" className="text-sm text-white/80">Email</Label>
                                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg" placeholder="Enter your email" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="password" className="text-sm text-white/80">Password</Label>
                                                <div className="relative">
                                                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg pr-11" placeholder="Enter your password" />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors">
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <Button type="submit" disabled={isSubmitting || !email.trim() || !password.trim()} className="w-full h-11 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-lg transition-all mt-3">
                                                {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Logging in...</> : 'Login'}
                                            </Button>
                                            <div className="text-center">
                                                <span className="text-white/60 text-sm">Don't have an account? </span>
                                                <button type="button" onClick={() => { setIsRegisterMode(true); setAuthMessage(''); }} className="text-white text-sm font-medium hover:underline">Register</button>
                                            </div>
                                        </form>
                                    )}

                                    {!isSuccess && isRegisterMode && (
                                        <form onSubmit={handleRegister} className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="username" className="text-sm text-white/80">Username</Label>
                                                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isSubmitting} className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg" placeholder="Min 3 characters" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="reg-email" className="text-sm text-white/80">Email</Label>
                                                <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg" placeholder="Enter your email" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="reg-password" className="text-sm text-white/80">Password</Label>
                                                <div className="relative">
                                                    <Input id="reg-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg pr-11" placeholder="Min 6 characters" />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="confirm-pwd" className="text-sm text-white/80">Confirm Password</Label>
                                                <div className="relative">
                                                    <Input id="confirm-pwd" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSubmitting} className="h-11 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 rounded-lg pr-11" placeholder="Confirm password" />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60">
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <Button type="submit" disabled={isSubmitting || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()} className="w-full h-11 text-sm font-semibold bg-white hover:bg-white/90 text-black rounded-lg transition-all mt-3">
                                                {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Creating...</> : 'Create Account'}
                                            </Button>
                                            <div className="text-center">
                                                <span className="text-white/60 text-sm">Already have an account? </span>
                                                <button type="button" onClick={() => { setIsRegisterMode(false); setAuthMessage(''); setUsername(''); setConfirmPassword(''); }} className="text-white text-sm font-medium hover:underline">Login</button>
                                            </div>
                                        </form>
                                    )}

                                    {isSuccess && (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
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
            </div>
        </div>
    )
}