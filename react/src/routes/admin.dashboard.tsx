import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export const Route = createFileRoute('/admin/dashboard')({
  component: () => {
    return (
      <ProtectedRoute allowedRoles={['admin']} requireRole={true}>
        <AdminDashboard />
      </ProtectedRoute>
    )
  },
})
