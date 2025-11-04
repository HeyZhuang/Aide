import React from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface CanvasOverlayProps {
  isLoading: boolean
  message: string | null
  type?: 'loading' | 'success' | 'error'
}

export const CanvasOverlay: React.FC<CanvasOverlayProps> = ({ 
  isLoading, 
  message, 
  type = 'loading' 
}) => {
  if (!isLoading && !message) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* 中央提示框 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center justify-center gap-4 min-w-[280px] max-w-[90vw] pointer-events-auto border border-gray-200 dark:border-gray-700">
        {type === 'loading' && isLoading && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
              {message || '处理中...'}
            </p>
          </>
        )}
        
        {type === 'success' && message && (
          <>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
              {message}
            </p>
          </>
        )}
        
        {type === 'error' && message && (
          <>
            <XCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
              {message}
            </p>
          </>
        )}
      </div>
    </div>
  )
}




