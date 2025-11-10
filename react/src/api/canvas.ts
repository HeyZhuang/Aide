import { CanvasData, Message, Session } from '@/types/types'
import { ToolInfo } from '@/api/model'
import { getAccessToken } from './auth'

export type ListCanvasesResponse = {
  id: string
  name: string
  description?: string
  thumbnail?: string
  created_at: string
}

export async function listCanvases(): Promise<ListCanvasesResponse[]> {
  try {
    const token = getAccessToken()
    
    if (!token) {
      console.warn('未找到访问令牌，无法获取画布列表')
      return []
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch('/api/canvas/list', {
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('未登录，无法获取画布列表')
        return []
      }
      console.warn(`Failed to list canvases: ${response.status} ${response.statusText}`)
      return [] // 返回空列表而不是拋出錯誤
    }

    return await response.json()
  } catch (error) {
    console.warn('Canvas list unavailable:', error instanceof Error ? error.message : 'Unknown error')
    return [] // 返回空列表允許應用繼續運行
  }
}

export async function createCanvas(data: {
  name: string
  canvas_id: string
  messages: Message[]
  session_id: string
  text_model: {
    provider: string
    model: string
    url: string
  }
  tool_list: ToolInfo[]

  system_prompt: string
}): Promise<{ id: string }> {
  try {
    const token = getAccessToken()
    
    if (!token) {
      throw new Error('未登录，无法创建画布，请先登录')
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch('/api/canvas/create', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('未登录，无法创建画布，请先登录')
      }
      throw new Error(`創建畫布失敗: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to create canvas:', error)
    throw error // 創建失敗應該拋出錯誤
  }
}

export async function getCanvas(
  id: string
): Promise<{ data: CanvasData | null; name: string; sessions: Session[] }> {
  try {
    const token = getAccessToken()
    
    // 未登录用户也可以查看画布（只读模式）
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log(`请求画布 ${id}，使用token: ${token.substring(0, 20)}...`)
    } else {
      console.log(`请求画布 ${id}，未登录用户（只读模式）`)
    }

    const response = await fetch(`/api/canvas/${id}`, {
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('未登录，无法访问画布，请先登录')
      }
      if (response.status === 403) {
        throw new Error('无权访问此画布，只能访问您自己的画布')
      }
      if (response.status === 404) {
        throw new Error('画布不存在')
      }
      console.warn(`Canvas API returned ${response.status}: ${response.statusText}`)
      // 返回默认数据而不是抛出错误
      return {
        data: null,
        name: '未命名画布',
        sessions: []
      }
    }

    const data = await response.json()

    // 更宽松的数据验证
    if (!data) {
      console.warn('Canvas API returned null/undefined data')
      return {
        data: null,
        name: '未命名画布',
        sessions: []
      }
    }

    // 确保返回的数据结构正确
    return {
      data: data.data || null,
      name: data.name || '未命名画布',
      sessions: Array.isArray(data.sessions) ? data.sessions : []
    }
  } catch (error) {
    console.error('Error fetching canvas:', error)
    // 如果是认证错误，抛出错误让上层处理
    if (error instanceof Error && (error.message.includes('未登录') || error.message.includes('无权访问'))) {
      throw error
    }
    // 网络错误或其他异常时返回默认数据
    return {
      data: null,
      name: '未命名画布',
      sessions: []
    }
  }
}

export async function saveCanvas(
  id: string,
  payload: {
    data: CanvasData
    thumbnail: string
  }
): Promise<void> {
  try {
    const token = getAccessToken()
    
    if (!token) {
      console.warn('未找到访问令牌，无法保存画布')
      return
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch(`/api/canvas/${id}/save`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('未登录，无法保存画布')
        return
      }
      if (response.status === 403) {
        console.warn('无权修改此画布，只能修改您自己的画布')
        return
      }
      // 後端返回錯誤，但不影響用戶使用
      console.warn(`Canvas save failed (non-critical): ${response.status} ${response.statusText}`)
      return
    }

    await response.json()
  } catch (error) {
    // 網絡錯誤或後端不可用，畫布數據仍在本地瀏覽器中
    console.warn('Canvas auto-save unavailable (data is preserved locally):', error instanceof Error ? error.message : 'Unknown error')
    // 不拋出錯誤，允許應用繼續運行
  }
}

export async function renameCanvas(id: string, name: string): Promise<void> {
  try {
    const token = getAccessToken()
    
    if (!token) {
      throw new Error('未登录，无法重命名画布，请先登录')
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch(`/api/canvas/${id}/rename`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('未登录，无法重命名画布，请先登录')
      }
      if (response.status === 403) {
        throw new Error('无权修改此画布，只能修改您自己的画布')
      }
      throw new Error(`重命名失敗: ${response.status} ${response.statusText}`)
    }

    await response.json()
  } catch (error) {
    console.error('Failed to rename canvas:', error)
    throw error // 重命名失敗應該拋出錯誤，讓用戶知道
  }
}

export async function deleteCanvas(id: string): Promise<void> {
  try {
    const token = getAccessToken()
    
    if (!token) {
      throw new Error('未登录，无法删除画布，请先登录')
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch(`/api/canvas/${id}/delete`, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('未登录，无法删除画布，请先登录')
      }
      if (response.status === 403) {
        throw new Error('无权删除此画布，只能删除您自己的画布')
      }
      throw new Error(`刪除失敗: ${response.status} ${response.statusText}`)
    }

    await response.json()
  } catch (error) {
    console.error('Failed to delete canvas:', error)
    throw error // 刪除失敗應該拋出錯誤，讓用戶知道
  }
}
