import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/guards'
import { PageHeader } from '@/components/page-header'
import { UserRoleForm } from '@/components/admin/user-role-form'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const metadata = { title: 'Administrar usuarios' }

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export default async function AdminUsersPage() {
  const admin = await requireAdmin('/admin/users')

  const users = await prisma.user.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Acceso"
        title="Usuarios"
        description="Al cambiar un rol se revocan las sesiones activas del usuario, por lo que deberá volver a iniciar sesión."
      />

      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="stamp">Usuario</TableHead>
                <TableHead className="stamp">Email</TableHead>
                <TableHead className="stamp text-right">Pedidos</TableHead>
                <TableHead className="stamp">Rol</TableHead>
                <TableHead className="stamp text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                      {user.id === admin.id ? (
                        <span className="stamp text-muted-foreground">(tú)</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell data-numeric className="text-right font-mono tabular-nums">
                    {user._count.orders}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        user.role === 'ADMIN'
                          ? 'rounded-md bg-primary/10 px-2 py-0.5 text-primary ring-1 ring-primary/20'
                          : 'rounded-md bg-muted px-2 py-0.5 text-muted-foreground ring-1 ring-border'
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRoleForm userId={user.id} currentRole={user.role} disabled={user.id === admin.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
