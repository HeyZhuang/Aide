import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import React from 'react'
import { useTranslation } from 'react-i18next'
import icons, { toolShortcuts, ToolType } from './CanvasMenuIcon'

type CanvasMenuButtonProps = {
  type: ToolType
  active?: boolean
  activeTool?: ToolType
  onClick?: () => void
  className?: string
  iconClassName?: string // 新增属性用于自定义图标样式
}

const CanvasMenuButton = ({
  type,
  active,
  activeTool,
  onClick,
  className,
  iconClassName = 'size-4 text-foreground', // 默认图标样式
}: CanvasMenuButtonProps) => {
  const { t } = useTranslation()
  const isActive = activeTool === type || active

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'p-2 rounded-md cursor-pointer hover:bg-white/20',
              isActive && 'bg-white/25',
              className
            )}
            onMouseDown={(e) => {
              e.preventDefault()
              onClick?.()
            }}
          >
            {React.createElement(icons[type], {
              className: iconClassName, // 使用自定义图标样式
            })}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-white bg-black/80 border-white/20">
          {t(`canvas:tool.${type}`)} ({toolShortcuts[type]})
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default CanvasMenuButton