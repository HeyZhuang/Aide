import { useLanguage } from '@/hooks/use-language'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'
import { useEffect, useState } from 'react'

const LanguageSwitcher = () => {
  const { changeLanguage, currentLanguage } = useLanguage()
  const { t, i18n } = useTranslation()
  const [isChanging, setIsChanging] = useState(false)

  const languages = [
    { code: 'en', name: t('common:languages.en'), displayName: 'English' },
    { code: 'zh-CN', name: t('common:languages.zh-CN'), displayName: '简体中文' },
    // { code: 'zh-TW', name: t('common:languages.zh-TW'), displayName: '繁體中文' },
  ]

  const handleLanguageChange = async (languageCode: string) => {
    // 如果已经是当前语言，不执行切换
    if (currentLanguage === languageCode) {
      return
    }

    setIsChanging(true)
    
    try {
      // 切换语言（不显示提示）
      await changeLanguage(languageCode)
      setIsChanging(false)
    } catch (error) {
      console.error('语言切换失败:', error)
      setIsChanging(false)
    }
  }

  // 监听语言变化，确保UI更新
  useEffect(() => {
    // 当语言变化时，强制组件重新渲染
    const handleLanguageChanged = () => {
      // i18n 变化会自动触发组件重新渲染
    }
    
    i18n.on('languageChanged', handleLanguageChanged)
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size={'sm'}
          variant={'ghost'}
          disabled={isChanging}
        >
          <Languages size={30} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLanguage === language.code ? 'bg-accent' : ''}
            disabled={isChanging}
          >
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default LanguageSwitcher
