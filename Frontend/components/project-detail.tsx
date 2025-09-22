"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { StageCard } from "./stage-card"
import { EstimateModal } from "./modals/estimate-modal"
import { CompleteModal } from "./modals/complete-modal"
import { AdminExpectedModal } from "./modals/admin-expected-modal"
import { NotesModal } from "./modals/notes-modal"
import { FirstEstimateModal } from "./modals/first-estimate-modal"
import { HandoverModal } from "./modals/handover-modal"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface ProjectData {
  id: string
  title: string
  description: string
  status: string
  currentTeam: string
  stages: {
    data: any
    design: any
    dev: any
  }
  heads?: {
    dataHead?: string
    designHead?: string
    devHead?: string
  }
}

interface ProjectDetailProps {
  projectId: string
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter()
  const { isAdmin, role } = useAuth()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  const [estimateModal, setEstimateModal] = useState<{ isOpen: boolean; team: string }>({
    isOpen: false,
    team: "",
  })
  const [completeModal, setCompleteModal] = useState<{ isOpen: boolean; team: string }>({
    isOpen: false,
    team: "",
  })
  const [adminExpectedModal, setAdminExpectedModal] = useState<{ isOpen: boolean; team: string }>({
    isOpen: false,
    team: "",
  })
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; team: string; readOnly?: boolean }>({
    isOpen: false,
    team: "",
  })
  const [handoverModal, setHandoverModal] = useState<{ isOpen: boolean; team: string; startISO?: string }>({
    isOpen: false,
    team: "",
    startISO: undefined,
  })
  const [firstEstimateModal, setFirstEstimateModal] = useState<{ isOpen: boolean; team: string }>({
    isOpen: false,
    team: "",
  })

  const fetchProject = async () => {
    try {
      const data = await projectsApi.getById(projectId)
      setProject(data)
    } catch (error: any) {
      toast({
        title: "Error loading project",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [projectId])

  // Determine viewer team from role
  const viewerTeam = isAdmin
    ? null
    : role === "data_head"
      ? "data"
      : role === "design_head"
        ? "design"
        : role === "dev_head"
          ? "dev"
          : null

  // Show first-time estimate modal if head and no estimate yet
  useEffect(() => {
    if (!isAdmin && project && viewerTeam) {
      const s = (project as any).stages?.[viewerTeam]
      if (s && (!s.headExpected || s.headExpected.hours == null)) {
        setFirstEstimateModal({ isOpen: true, team: viewerTeam })
      }
    }
  }, [project, isAdmin, viewerTeam])

  const handleEstimate = (team: string) => {
    setEstimateModal({ isOpen: true, team })
  }

  const handleComplete = (team: string) => {
    setCompleteModal({ isOpen: true, team })
  }

  const handleUpdateAdminExpected = (team: string) => {
    setAdminExpectedModal({ isOpen: true, team })
  }

  const handleViewNotes = (team: string) => {
    const s: any = (project as any)?.stages?.[team]
    const readOnly = s?.status === "done"
    setNotesModal({ isOpen: true, team, readOnly })
  }

  const handleModalSuccess = () => {
    fetchProject() // Refresh project data after successful update
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <Button onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const stagesFull = [
    { ...project.stages.data, name: "Data", team: "data" as const },
    { ...project.stages.design, name: "Design", team: "design" as const },
    { ...project.stages.dev, name: "Development", team: "dev" as const },
  ]
  const stages = isAdmin ? stagesFull : viewerTeam ? stagesFull.filter(s => s.team === viewerTeam) : []

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "default",
      done: "secondary",
    }

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{project.title}</CardTitle>
              <div className="flex items-center gap-4">
                {getStatusBadge(project.status)}
                <Badge variant="outline" className="capitalize">
                  Current: {project.currentTeam}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>

        {/* Stage Timeline */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Stage Timeline</h3>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {stages.map((stage) => (
              <StageCard
                key={stage.team}
                stage={stage}
                projectId={projectId}
                onEstimate={handleEstimate}
                onComplete={handleComplete}
                onUpdateAdminExpected={handleUpdateAdminExpected}
                onViewNotes={handleViewNotes}
                onHandover={(team) => {
                  const s: any = (project as any).stages?.[team]
                  const startISO = s?.headExpected?.start
                  setHandoverModal({ isOpen: true, team, startISO })
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <EstimateModal
        isOpen={estimateModal.isOpen}
        onClose={() => setEstimateModal({ isOpen: false, team: "" })}
        projectId={projectId}
        team={estimateModal.team}
        onSuccess={handleModalSuccess}
      />

      <CompleteModal
        isOpen={completeModal.isOpen}
        onClose={() => setCompleteModal({ isOpen: false, team: "" })}
        projectId={projectId}
        team={completeModal.team}
        onSuccess={handleModalSuccess}
      />

      <AdminExpectedModal
        isOpen={adminExpectedModal.isOpen}
        onClose={() => setAdminExpectedModal({ isOpen: false, team: "" })}
        projectId={projectId}
        team={adminExpectedModal.team}
        onSuccess={handleModalSuccess}
      />

      <NotesModal
        isOpen={notesModal.isOpen}
        onClose={() => setNotesModal({ isOpen: false, team: "" })}
        projectId={projectId}
        team={notesModal.team}
        readOnly={notesModal.readOnly}
      />

      <HandoverModal
        isOpen={handoverModal.isOpen}
        onClose={() => setHandoverModal({ isOpen: false, team: "", startISO: undefined })}
        projectId={projectId}
        team={handoverModal.team}
        startISO={handoverModal.startISO}
        onSuccess={handleModalSuccess}
      />

      <FirstEstimateModal
        isOpen={firstEstimateModal.isOpen}
        onClose={() => setFirstEstimateModal({ isOpen: false, team: "" })}
        projectId={projectId}
        team={firstEstimateModal.team as any}
        onSuccess={handleModalSuccess}
      />

      
    </>
  )
}
