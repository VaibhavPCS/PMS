"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface EstimateModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  team: string
  onSuccess: () => void
}

export function EstimateModal({ isOpen, onClose, projectId, team, onSuccess }: EstimateModalProps) {
  const [startDate, setStartDate] = useState("")
  const [hours, setHours] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await projectsApi.updateStageEstimate(projectId, team, {
        startISO: new Date(startDate).toISOString(),
        hours: Number.parseInt(hours),
      })

      toast({
        title: "Estimate updated",
        description: `Successfully updated estimate for ${team} stage`,
      })

      onSuccess()
      onClose()
      setStartDate("")
      setHours("")
    } catch (error: any) {
      toast({
        title: "Error updating estimate",
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
    setHours("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent aria-describedby="estimate-desc">
        <DialogHeader>
          <DialogTitle className="capitalize">Estimate {team} Stage</DialogTitle>
        </DialogHeader>
        <p id="estimate-desc" className="sr-only">Set the expected start and hours for this stage.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date & Time</Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">Estimated Hours</Label>
            <Input
              id="hours"
              type="number"
              min="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Enter estimated hours"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Estimate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
