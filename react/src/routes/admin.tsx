import { createFileRoute } from '@tanstack/react-router'

// 管理员面板已移除
export const Route = createFileRoute('/admin')({
  component: () => {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">管理员面板已移除</h1>
          <p className="text-muted-foreground">此功能已暂时禁用</p>
        </div>
      </div>
    )
  },
})



