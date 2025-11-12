import React from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBalance } from '@/hooks/use-balance'

interface PointsDisplayProps {
  className?: string
  children?: React.ReactNode
}

export function PointsDisplay({ className, children }: PointsDisplayProps) {
  const { balance } = useBalance()

  // 将金额乘以 100 转换为积分，显示为整数，如果为负数则显示 0
  const points = Math.max(0, Math.floor(parseFloat(balance) * 100))

  return (
    <div className={cn('flex items-center relative', className)}>
      {/* 积分显示区域 */}
      <div className="flex items-center bg-white/50 dark:bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 dark:border-white/10 pr-8 shadow-sm">
        <Zap className="w-3.5 h-3.5 text-foreground mr-1.5" />
        <span className="text-xs font-semibold text-foreground">
          {points}
        </span>
      </div>

      {/* 头像区域 - 重叠在积分显示上 */}
      <div className="absolute -right-0.5">
        {children}
      </div>
    </div>
  )
}