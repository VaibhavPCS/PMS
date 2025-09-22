"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface CompleteModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  team: string
  onSuccess: () => void
}

export function CompleteModal({ isOpen, onClose, projectId, team, onSuccess }: CompleteModalProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await projectsApi.completeStage(projectId, team, {
        startISO: new Date(startDate).toISOString(),
        endISO: new Date(endDate).toISOString(),
      })

      toast({
        title: "Stage completed",
        description: `Successfully completed ${team} stage`,
      })

      onSuccess()
      onClose()
      setStartDate("")
      setEndDate("")
    } catch (error: any) {
      toast({
        title: "Error completing stage",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setStartDate("")
    setEndDate("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent aria-describedby="complete-desc">
        <DialogHeader>
          <DialogTitle className="capitalize">Complete {team} Stage</DialogTitle>
        </DialogHeader>
        <p id="complete-desc" className="sr-only">Provide the actual start and end date-time to complete this stage.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Actual Start Date & Time</Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Actual End Date & Time</Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Completing..." : "Complete Stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
