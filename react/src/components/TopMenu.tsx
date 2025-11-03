import { useConfigs } from '@/contexts/configs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ImageIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { SettingsIcon } from 'lucide-react'
import ThemeButton from '@/components/theme/ThemeButton'
import { LOGO_URL } from '@/constants'
import LanguageSwitcher from './common/LanguageSwitcher'
import { cn } from '@/lib/utils'
import { UserMenu } from './auth/UserMenu'

export default function TopMenu({
  left,
  middle,
  right,
}: {
  left?: React.ReactNode
  middle?: React.ReactNode
  right?: React.ReactNode
}) {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const { setShowSettingsDialog } = useConfigs()

  return (
    <motion.div
      className="sticky top-0 z-50 flex w-full h-12 px-6 justify-between items-center select-none glass-nav"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--glass-nav-bg, rgba(255, 255, 255, 0.85))',
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        borderBottom: 'var(--glass-nav-border, 1px solid rgba(0, 0, 0, 0.05))',
        boxShadow: 'var(--glass-nav-shadow, 0 2px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9))',
      }}
    >
      <div className="flex items-center gap-6">
        {left}
        <motion.div
          className="flex items-center gap-3 cursor-pointer group px-3 py-1.5 rounded-lg transition-all duration-200 hover:bg-white/40"
          onClick={() => navigate({ to: '/' })}
        >
          {window.location.pathname !== '/' && (
            <ChevronLeft className="size-5 text-foreground/70 group-hover:-translate-x-1 group-hover:text-foreground transition-all duration-300" />
          )}
          <div className="relative">
            <img src={LOGO_URL} alt="logo" className="size-6 draggable={false} drop-shadow-sm" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
          </div>
          <motion.div className="flex relative overflow-hidden items-center h-7">
            <motion.span
              className="flex items-center text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
              layout
            >
              {window.location.pathname === '/' ? 'Aide' : t('canvas:back')}
            </motion.span>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3">
        {middle}
      </div>

      <div className="flex items-center gap-2">
        {/* {right} */}
        <Button
          size={'sm'}
          variant="ghost"
          className="rounded-lg hover:bg-white/50 backdrop-blur-sm transition-all duration-200 hover:scale-105"
          onClick={() => setShowSettingsDialog(true)}
        >
          <SettingsIcon size={20} />
        </Button>
        <div className="w-px h-6 bg-border/50" />
        <LanguageSwitcher />
        <ThemeButton />
        <UserMenu />
      </div>
    </motion.div>
  )
}