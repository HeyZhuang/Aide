import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
    component: AdminIndexPage,
})

function AdminIndexPage() {
    // 重定向到 dashboard
    return <Navigate to="/admin/dashboard" />
}
