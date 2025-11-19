import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserInfo } from '@/api/auth'

interface AuthStore {
  token: string | null
  userInfo: UserInfo | null
  isAuthenticated: boolean
  
  setAuth: (token: string, userInfo: UserInfo) => void
  clearAuth: () => void
  updateToken: (token: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,
      isAuthenticated: false,

      setAuth: (token, userInfo) => set({
        token,
        userInfo,
        isAuthenticated: true,
      }),

      clearAuth: () => set({
        token: null,
        userInfo: null,
        isAuthenticated: false,
      }),

      updateToken: (token) => set({ token }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        userInfo: state.userInfo,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)