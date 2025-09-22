import { AppHeader } from "@/components/app-header"
import { ProjectDetail } from "@/components/project-detail"
import { ProtectedRoute } from "@/components/protected-route"

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <ProjectDetail projectId={params.id} />
        </main>
      </div>
    </ProtectedRoute>
  )
}
