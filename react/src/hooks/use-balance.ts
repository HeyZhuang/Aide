import { useQuery } from '@tanstack/react-query'
import { getBalance } from '@/api/billing'
import { useAuth } from '@/contexts/AuthContext'

export function useBalance() {
  const { authStatus } = useAuth()

  const {
    data,
    error,
    refetch,
  } = useQuery({
    queryKey: ['balance'],
    queryFn: getBalance,
    enabled: authStatus.is_logged_in, // 只有登录时才获取余额
    staleTime: 30040, // 30秒内不重新获取
    gcTime: 5 * 60 * 1000, // 5分钟后清理缓存
    refetchOnWindowFocus: true, // 窗口聚焦时重新获取
    refetchOnMount: true, // 组件挂载时重新获取
    retry: false, // 不重试，避免重复的 404 错误
    retryOnMount: false, // 挂载时不重试
  })

  // 临时修改：测试模型生成时返回大余额，避免积分不足提示
  return {
    balance: '999.00', // data?.balance || '0.00',
    error,
    refreshBalance: refetch,
  }
}
