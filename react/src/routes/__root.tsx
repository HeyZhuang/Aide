import ErrorBoundary from '@/components/common/ErrorBoundary'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <ProtectedRoute>
      <Outlet />
      <TanStackRouterDevtools />
    </ProtectedRoute>
  ),
  errorComponent: ErrorBoundary,
})
