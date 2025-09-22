"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Calendar, User, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface StageData {
  name: string
  team: "data" | "design" | "dev"
  status: "pending" | "in_progress" | "done"
  head?: {
    name: string
    email: string
  }
  headExpected?: {
    start: string
    hours: number
  }
  adminExpected?: {
    start: string
    hours: number
  }
  actual?: {
    start: string
    end?: string
    actualHours?: number
    penaltyHours?: number
  }
}

interface StageCardProps {
  stage: StageData
  projectId: string
  onEstimate: (team: string) => void
  onComplete: (team: string) => void
  onUpdateAdminExpected: (team: string) => void
  onViewNotes: (team: string) => void
  onHandover?: (team: string) => void
}

export function StageCard({
  stage,
  projectId,
  onEstimate,
  onComplete,
  onUpdateAdminExpected,
  onViewNotes,
  onHandover,
}: StageCardProps) {
  const { role, isAdmin } = useAuth()
  const isStageHead = role === stage.team || role === `${stage.team}_head`
  const canManageStage = isStageHead || isAdmin

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
      pending: { variant: "outline", color: "text-muted-foreground" },
      in_progress: { variant: "default", color: "text-blue-600" },
      done: { variant: "secondary", color: "text-green-600" },
    }

    const config = variants[status] || variants.pending

    return (
      <Badge variant={config.variant} className={`capitalize ${config.color}`}>
        {status.replace("_", " ")}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 capitalize">
            {stage.name}
            {getStatusBadge(stage.status)}
          </CardTitle>
          <div className="flex items-center gap-2">
            {stage.head ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{getInitials(stage.head.name)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium">{stage.head.name}</div>
                  <div className="text-muted-foreground">{stage.head.email}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Head Expected */}
        {stage.headExpected && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Head Expected
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start:</span> {formatDate(stage.headExpected.start)}
              </div>
              <div>
                <span className="text-muted-foreground">Hours:</span> {stage.headExpected.hours}h
              </div>
            </div>
          </div>
        )}

        {/* Admin Expected */}
        {stage.adminExpected && (
          <div className="bg-primary/5 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Admin Expected
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start:</span> {formatDate(stage.adminExpected.start)}
              </div>
              <div>
                <span className="text-muted-foreground">Hours:</span> {stage.adminExpected.hours}h
              </div>
            </div>
          </div>
        )}

        {/* Actual */}
        {stage.actual && (
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Actual
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start:</span> {formatDateTime(stage.actual.start)}
              </div>
              {stage.actual.end && (
                <div>
                  <span className="text-muted-foreground">End:</span> {formatDateTime(stage.actual.end)}
                </div>
              )}
              {stage.actual.actualHours && (
                <div>
                  <span className="text-muted-foreground">Actual Hours:</span> {stage.actual.actualHours}h
                </div>
              )}
              {stage.actual.penaltyHours && (
                <div className="text-red-600">
                  <span className="text-muted-foreground">Penalty Hours:</span> {stage.actual.penaltyHours}h
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {canManageStage && stage.status !== "done" && (
            <>
              {!stage.headExpected && (
                <Button variant="outline" size="sm" onClick={() => onEstimate(stage.team)}>
                  Estimate
                </Button>
              )}
              {stage.status === "in_progress" && (
                <Button variant="outline" size="sm" onClick={() => onComplete(stage.team)}>
                  Complete
                </Button>
              )}
              {stage.status === "in_progress" && onHandover && (
                <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => onHandover(stage.team)}>
                  Hand Over
                </Button>
              )}
            </>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => onUpdateAdminExpected(stage.team)}>
              Update Admin Expected
            </Button>
          )}
          {(canManageStage) && (
            <Button variant="ghost" size="sm" onClick={() => onViewNotes(stage.team)}>
              Notes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
