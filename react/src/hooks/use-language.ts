import { useTranslation } from 'react-i18next'

export const useLanguage = () => {
  const { i18n } = useTranslation()

  const changeLanguage = async (language: string) => {
    try {
      // 使用 changeLanguage 的 Promise 版本确保切换完成
      await i18n.changeLanguage(language)
      
      // 确保语言设置保存到 localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('language', language)
      }
    } catch (error) {
      console.error('语言切换失败:', error)
      throw error
    }
  }

  const getCurrentLanguage = () => i18n.language

  return {
    currentLanguage: getCurrentLanguage(),
    changeLanguage,
    isEnglish: getCurrentLanguage() === 'en',
    isChinese: getCurrentLanguage() === 'zh-CN',
    isTraditionalChinese: getCurrentLanguage() === 'zh-TW',
  }
}
