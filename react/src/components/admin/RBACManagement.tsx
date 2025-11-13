import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Edit, Search, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'editor'
}

export function RBACManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 模拟用户数据（实际应该从API获取）
  useEffect(() => {
    // TODO: 从API获取用户列表
    setUsers([
      { id: '1', username: 'admin', email: 'admin@example.com', role: 'admin' },
      { id: '2', username: 'editor1', email: 'editor1@example.com', role: 'editor' },
    ])
  }, [])

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'editor') => {
    try {
      setIsLoading(true)
      // TODO: 调用API更新用户角色
      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: newRole } : user
      ))
      toast.success('角色更新成功')
    } catch (error) {
      toast.error('角色更新失败')
      console.error('Role update error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'editor':
        return <Edit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30'
      case 'editor':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部搜索和操作栏 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className={cn(
            'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4',
            'text-gray-400 dark:text-muted-foreground'
          )} />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              'pl-10 h-10 text-sm',
              'bg-white dark:bg-input border-gray-200 dark:border-border',
              'focus:border-blue-500 dark:focus:border-blue-400 transition-colors'
            )}
          />
        </div>
        <Button className={cn(
          'h-10 px-4 font-medium shadow-sm',
          'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
          'text-white transition-all'
        )}>
          <Plus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      {/* 用户列表 */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className={cn(
            'text-center py-12',
            'text-gray-600 dark:text-muted-foreground'
          )}>
            <p>没有找到用户</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-xl transition-all',
                'bg-white dark:bg-card border border-gray-200 dark:border-border',
                'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700'
              )}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={cn(
                  'p-3 rounded-xl',
                  getRoleColor(user.role)
                )}>
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    'text-base font-bold truncate',
                    'text-gray-900 dark:text-foreground'
                  )}>
                    {user.username}
                  </h3>
                  <p className={cn(
                    'text-sm truncate mt-0.5',
                    'text-gray-500 dark:text-muted-foreground'
                  )}>
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={user.role}
                  onValueChange={(value: 'admin' | 'editor') =>
                    handleRoleChange(user.id, value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className={cn(
                    'w-[110px] h-9 text-sm font-medium',
                    'bg-white dark:bg-input border-gray-200 dark:border-border',
                    'hover:bg-gray-50 dark:hover:bg-secondary transition-colors'
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-popover">
                    <SelectItem value="admin" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>管理员</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>编辑者</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-9 w-9',
                    'text-red-600 dark:text-red-400',
                    'hover:text-red-700 dark:hover:text-red-300',
                    'hover:bg-red-50 dark:hover:bg-red-900/20',
                    'transition-colors'
                  )}
                  onClick={() => {
                    // TODO: 实现删除用户功能
                    toast.info('删除功能待实现')
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 角色说明 */}
      <div className={cn(
        'mt-6 p-5 rounded-xl border',
        'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20',
        'border-blue-100 dark:border-blue-900/20'
      )}>
        <h4 className={cn(
          'text-sm font-bold mb-3 flex items-center gap-2',
          'text-gray-900 dark:text-foreground'
        )}>
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          角色权限说明
        </h4>
        <div className={cn(
          'space-y-2.5 text-sm',
          'text-gray-700 dark:text-muted-foreground'
        )}>
          <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60 dark:bg-card/40">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-gray-900 dark:text-foreground">管理员 (Admin)</strong>
              <p className="text-xs mt-0.5">可访问管理仪表盘，管理模板和用户权限</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-2 rounded-lg bg-white/60 dark:bg-card/40">
            <Edit className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-gray-900 dark:text-foreground">编辑者 (Editor)</strong>
              <p className="text-xs mt-0.5">可访问模板库，编辑和使用模板</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


