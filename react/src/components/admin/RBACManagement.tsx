import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Edit, Eye, Search, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
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
      { id: '3', username: 'viewer1', email: 'viewer1@example.com', role: 'viewer' },
    ])
  }, [])

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
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
        return <Shield className="w-4 h-4 text-blue-600" />
      case 'editor':
        return <Edit className="w-4 h-4 text-purple-600" />
      case 'viewer':
        return <Eye className="w-4 h-4 text-gray-600" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'editor':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索用户名或邮箱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      {/* 用户列表 */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p>没有找到用户</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${getRoleColor(user.role)}`}>
                  {getRoleIcon(user.role)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user.username}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={user.role}
                  onValueChange={(value: 'admin' | 'editor' | 'viewer') => 
                    handleRoleChange(user.id, value)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-32 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>管理员</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center gap-2">
                        <Edit className="w-4 h-4 text-purple-600" />
                        <span>编辑者</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-600" />
                        <span>查看者</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
      <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">角色权限说明</h4>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span><strong>管理员 (Admin):</strong> 可访问管理仪表盘，管理模板和用户权限</span>
          </div>
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4 text-purple-600" />
            <span><strong>编辑者 (Editor):</strong> 可访问模板库，编辑和使用模板</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-600" />
            <span><strong>查看者 (Viewer):</strong> 仅可查看模板，功能受限</span>
          </div>
        </div>
      </div>
    </div>
  )
}

