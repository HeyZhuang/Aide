import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

const ThemeButton: React.FC = () => {
  const { setTheme, theme } = useTheme()
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light')

  // 获取当前实际应用的主题（考虑 system 模式）
  useEffect(() => {
    const getActualTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme === 'dark' ? 'dark' : 'light'
    }

    const updateTheme = () => {
      setCurrentTheme(getActualTheme())
    }

    updateTheme()

    // 监听系统主题变化
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', updateTheme)
      return () => mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [theme])

  const handleToggle = () => {
    // 如果当前是 system，切换到 light
    // 如果当前是 light，切换到 dark
    // 如果当前是 dark，切换到 light
    if (theme === 'system') {
      setTheme('light')
    } else if (theme === 'light') {
      setTheme('dark')
    } else {
      setTheme('light')
    }
  }

  return (
    <Button
      size={'sm'}
      variant={'ghost'}
      className="rounded-lg hover:bg-white/50 dark:hover:bg-white/10 backdrop-blur-sm transition-all duration-200 hover:scale-105"
      onClick={handleToggle}
      aria-label={currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {currentTheme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </Button>
  )
}

export default ThemeButton
