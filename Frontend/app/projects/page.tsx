import { AppHeader } from "@/components/app-header"
import { ProjectsTable } from "@/components/projects-table"
import { ProtectedRoute } from "@/components/protected-route"

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">My Projects</h2>
              <p className="text-muted-foreground">Manage and track your project stages</p>
            </div>
            <ProjectsTable />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
