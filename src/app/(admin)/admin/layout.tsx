import { AdminNav } from '@/components/admin-nav'
import { Container } from '@/components/container'

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Container size="wide" className="py-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        {/* min-w-0: sin esto la fila de pestañas del rail no puede encogerse y
            desborda la pantalla en móvil en lugar de desplazarse dentro. */}
        <div className="min-w-0">
          <AdminNav />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  )
}
