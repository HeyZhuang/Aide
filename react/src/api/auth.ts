import { BASE_API_URL } from '../constants'
import i18n from '../i18n'
import { clearJaazApiKey } from './config'

export interface AuthStatus {
  status: 'logged_out' | 'pending' | 'logged_in'
  is_logged_in: boolean
  user_info?: UserInfo
  tokenExpired?: boolean
}

export interface UserInfo {
  id: string
  username: string
  email: string
  image_url?: string
  provider?: string
  role?: string
  created_at?: string
  updated_at?: string
}

export interface DeviceAuthResponse {
  status: string
  code: string
  expires_at: string
  message: string
}

export interface DeviceAuthPollResponse {
  status: 'pending' | 'authorized' | 'expired' | 'error'
  message?: string
  token?: string
  user_info?: UserInfo
}

export interface GoogleAuthResponse {
  status: string
  code: string
  auth_url: string
  expires_at: string
  message: string
}

export interface ApiResponse {
  status: string
  message: string
}

export async function startDeviceAuth(): Promise<DeviceAuthResponse> {
  // 使用 AbortController 实现超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

  try {
    const response = await fetch(`${BASE_API_URL}/api/device/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // 不再打开新窗口，而是返回设备码供弹窗内登录表单使用
    // 登录表单将在弹窗中直接显示，用户可以在弹窗中输入用户名和密码

    return {
      status: data.status,
      code: data.code,
      expires_at: data.expires_at,
      message: i18n.t('common:auth.browserLoginMessage') || '请输入用户名和密码',
    }
  } catch (error) {
    clearTimeout(timeoutId)

    // 处理网络错误
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const errorMessage = `无法连接到服务器 ${BASE_API_URL}。请检查：
1. 服务器是否正在运行
2. 网络连接是否正常
3. 防火墙设置是否正确
4. 服务器地址是否正确配置`
      console.error('Connection error:', errorMessage)
      throw new Error(`连接失败: 无法连接到 ${BASE_API_URL}。请检查服务器是否运行以及网络连接。`)
    }

    // 处理超时错误
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new Error(`请求超时: 服务器 ${BASE_API_URL} 响应时间过长。请检查网络连接。`)
    }

    // 其他错误
    throw error
  }
}

export async function pollDeviceAuth(
  deviceCode: string
): Promise<DeviceAuthPollResponse> {
  // 使用 AbortController 实现超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

  try {
    const response = await fetch(
      `${BASE_API_URL}/api/device/poll?code=${deviceCode}`,
      {
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    // 处理网络错误
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Poll connection error:', error)
      throw new Error('网络连接失败，请检查服务器状态')
    }

    // 处理超时错误
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new Error('请求超时，请检查网络连接')
    }

    // 其他错误
    throw error
  }
}

export async function getAuthStatus(): Promise<AuthStatus> {
  // Get auth status from local storage
  const token = localStorage.getItem('jaaz_access_token')
  const userInfo = localStorage.getItem('jaaz_user_info')

  console.log('Getting auth status:', {
    hasToken: !!token,
    hasUserInfo: !!userInfo,
    userInfo: userInfo ? JSON.parse(userInfo) : null,
  })

  if (token && userInfo) {
    try {
      // 尝试刷新token，如果失败则使用原token
      try {
        const newToken = await refreshToken(token)
        // 刷新成功，保存新token
        localStorage.setItem('jaaz_access_token', newToken)
        console.log('Token refreshed successfully')
      } catch (refreshError) {
        // 刷新失败，检查是否是token过期
        if (refreshError instanceof Error && refreshError.message === 'TOKEN_EXPIRED') {
          console.log('Token expired, clearing auth data')
          localStorage.removeItem('jaaz_access_token')
          localStorage.removeItem('jaaz_user_info')

          // Clear jaaz provider api_key
          try {
            await clearJaazApiKey()
          } catch (clearError) {
            console.error('Failed to clear aide api key:', clearError)
          }

          const loggedOutStatus = {
            status: 'logged_out' as const,
            is_logged_in: false,
            tokenExpired: true,
          }

          return loggedOutStatus
        } else {
          // 网络错误或其他问题，继续使用原token
          console.log('Token refresh failed (network error), keeping existing token:', refreshError)
        }
      }

      // 返回登录状态（使用原token或新token）
      const authStatus = {
        status: 'logged_in' as const,
        is_logged_in: true,
        user_info: JSON.parse(userInfo),
      }
      return authStatus
    } catch (error) {
      console.error('Unexpected error in getAuthStatus:', error)
      // 发生意外错误，返回登出状态
      localStorage.removeItem('jaaz_access_token')
      localStorage.removeItem('jaaz_user_info')

      const loggedOutStatus = {
        status: 'logged_out' as const,
        is_logged_in: false,
      }
      return loggedOutStatus
    }
  }

  const loggedOutStatus = {
    status: 'logged_out' as const,
    is_logged_in: false,
  }
  console.log('Returning logged out status:', loggedOutStatus)
  return loggedOutStatus
}

export async function register(
  username: string,
  email: string,
  password: string,
  role: 'admin' | 'editor' = 'editor'
): Promise<{ token: string; user_info: UserInfo }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

  try {
    const response = await fetch(`${BASE_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.trim(),
        email: email.trim(),
        password: password,
        role: role,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: '注册失败' }))
      throw new Error(errorData.detail || '注册失败，请稍后重试')
    }

    const data = await response.json()

    if (data.token && data.user_info) {
      return {
        token: data.token,
        user_info: data.user_info,
      }
    }

    throw new Error('注册响应格式错误')
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`连接失败: 无法连接到 ${BASE_API_URL}。请检查服务器是否运行以及网络连接。`)
    }

    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new Error(`请求超时: 服务器 ${BASE_API_URL} 响应时间过长。请检查网络连接。`)
    }

    throw error
  }
}

export async function loginWithCredentials(
  username: string,
  password: string,
  role: 'admin' | 'editor' = 'editor'
): Promise<{ token: string; user_info: UserInfo }> {
  // 创建设备码
  const deviceAuthResult = await startDeviceAuth()

  // 直接授权设备码（包含用户名和密码验证）
  const response = await fetch(`${BASE_API_URL}/api/device/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: deviceAuthResult.code,
      username: username,
      password: password,
      role: role,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '登录失败' }))
    throw new Error(errorData.detail || '用户名或密码错误')
  }

  const data = await response.json()

  // 如果后端直接返回了token和user_info，直接使用
  if (data.token && data.user_info) {
    return {
      token: data.token,
      user_info: data.user_info,
    }
  }

  // 否则轮询获取token（向后兼容）
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500)) // 等待500ms

    const pollResult = await pollDeviceAuth(deviceAuthResult.code)

    if (pollResult.status === 'authorized' && pollResult.token && pollResult.user_info) {
      return {
        token: pollResult.token,
        user_info: pollResult.user_info,
      }
    }

    if (pollResult.status === 'error' || pollResult.status === 'expired') {
      throw new Error(pollResult.message || '认证失败')
    }

    attempts++
  }

  throw new Error('登录超时，请重试')
}

export async function startGoogleAuth(): Promise<GoogleAuthResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

  try {
    const response = await fetch(`${BASE_API_URL}/api/auth/google/start`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Google 登录启动失败' }))
      throw new Error(errorData.detail || '无法启动 Google 登录')
    }

    const data = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error(`连接失败: 无法连接到 ${BASE_API_URL}。请检查服务器是否运行以及网络连接。`)
    }

    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
      throw new Error(`请求超时: 服务器 ${BASE_API_URL} 响应时间过长。请检查网络连接。`)
    }

    throw error
  }
}

export async function loginWithGoogle(): Promise<{ token: string; user_info: UserInfo }> {
  // 启动 Google OAuth 流程
  const googleAuthResult = await startGoogleAuth()

  // 打开新窗口进行 Google 认证
  const authWindow = window.open(
    googleAuthResult.auth_url,
    'google_auth',
    'width=500,height=600,scrollbars=yes,resizable=yes'
  )

  if (!authWindow) {
    throw new Error('无法打开认证窗口，请检查浏览器弹窗设置')
  }

  // 监听窗口关闭或消息
  return new Promise((resolve, reject) => {
    const checkClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkClosed)
        // 窗口已关闭，轮询认证状态
        pollGoogleAuthStatus(googleAuthResult.code)
          .then(resolve)
          .catch(reject)
      }
    }, 500)

    // 监听来自认证窗口的消息
    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'google_auth_success') {
        clearInterval(checkClosed)
        window.removeEventListener('message', messageHandler)
        authWindow.close()
        // 轮询获取 token
        pollGoogleAuthStatus(googleAuthResult.code)
          .then(resolve)
          .catch(reject)
      }
    }

    window.addEventListener('message', messageHandler)

    // 超时处理
    setTimeout(() => {
      clearInterval(checkClosed)
      window.removeEventListener('message', messageHandler)
      if (!authWindow.closed) {
        authWindow.close()
      }
      reject(new Error('Google 登录超时，请重试'))
    }, 300000) // 5分钟超时
  })
}

async function pollGoogleAuthStatus(deviceCode: string): Promise<{ token: string; user_info: UserInfo }> {
  let attempts = 0
  const maxAttempts = 60 // 最多轮询60次（约1分钟）

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒

    try {
      const pollResult = await pollDeviceAuth(deviceCode)

      if (pollResult.status === 'authorized' && pollResult.token && pollResult.user_info) {
        return {
          token: pollResult.token,
          user_info: pollResult.user_info,
        }
      }

      if (pollResult.status === 'error' || pollResult.status === 'expired') {
        throw new Error(pollResult.message || 'Google 认证失败')
      }

      attempts++
    } catch (error) {
      if (error instanceof Error && error.message.includes('认证失败')) {
        throw error
      }
      // 继续轮询
      attempts++
    }
  }

  throw new Error('Google 登录超时，请重试')
}

export async function logout(): Promise<{ status: string; message: string }> {
  // Import dynamically to avoid circular dependency
  const { useAuthStore } = await import('@/stores/auth-store')
  
  // Clear local storage
  localStorage.removeItem('jaaz_access_token')
  localStorage.removeItem('jaaz_user_info')

  // Clear Zustand store
  useAuthStore.getState().clearAuth()

  // Clear jaaz provider api_key
  await clearJaazApiKey()

  return {
    status: 'success',
    message: i18n.t('common:auth.logoutSuccessMessage'),
  }
}

export async function getUserProfile(): Promise<UserInfo> {
  const userInfo = localStorage.getItem('jaaz_user_info')
  if (!userInfo) {
    throw new Error(i18n.t('common:auth.notLoggedIn'))
  }

  return JSON.parse(userInfo)
}

// Helper function to save auth data to local storage
export function saveAuthData(token: string, userInfo: UserInfo) {
  localStorage.setItem('jaaz_access_token', token)
  localStorage.setItem('jaaz_user_info', JSON.stringify(userInfo))
}

// Helper function to get access token
export function getAccessToken(): string | null {
  return localStorage.getItem('jaaz_access_token')
}

// Helper function to make authenticated API calls
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

// 刷新token
export async function refreshToken(currentToken: string) {
  if (!currentToken) {
    throw new Error('TOKEN_EXPIRED')
  }

  const response = await fetch(`${BASE_API_URL}/api/device/refresh-token`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentToken}`,
    },
  })

  if (response.status === 200) {
    const data = await response.json()
    if (data.new_token) {
      console.log('Token刷新成功')
      return data.new_token
    } else {
      throw new Error('TOKEN_EXPIRED')
    }
  } else if (response.status === 401) {
    // Token 真正过期，需要重新登录
    console.warn('Token刷新失败: 401 Unauthorized')
    throw new Error('TOKEN_EXPIRED')
  } else {
    // 其他错误（网络错误、服务器错误等），不强制重新登录
    const errorText = await response.text().catch(() => '')
    console.warn(`Token刷新失败: ${response.status} ${errorText}`)
    throw new Error(`NETWORK_ERROR: ${response.status}`)
  }
}
