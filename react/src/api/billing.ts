import { BASE_API_URL } from '../constants'
import { authenticatedFetch } from './auth'

export interface BalanceResponse {
  balance: string
}

export async function getBalance(): Promise<BalanceResponse> {
  try {
    const response = await authenticatedFetch(
      `${BASE_API_URL}/api/billing/getBalance`
    )

    if (!response.ok) {
      // 如果 API 不存在（404），返回默認值而不是拋出錯誤
      if (response.status === 404) {
        console.debug('Billing API not available, using default balance')
        return { balance: '0.00' }
      }
      throw new Error(`Failed to fetch balance: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // 捕獲網絡錯誤或其他錯誤，返回默認值
    console.debug('Failed to fetch balance, using default:', error)
    return { balance: '0.00' }
  }
}
