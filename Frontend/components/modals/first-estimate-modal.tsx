"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface FirstEstimateModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  team: "data" | "design" | "dev"
  onSuccess: () => void
}

export function FirstEstimateModal({ isOpen, onClose, projectId, team, onSuccess }: FirstEstimateModalProps) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      const defaultDate = new Date(now.getTime() + 24 * 3600 * 1000)
      setDate(defaultDate.toISOString().slice(0, 10))
      setTime("18:00")
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time) return
    setSubmitting(true)
    try {
      const end = new Date(`${date}T${time}:00`)
      const start = new Date()
      const ms = end.getTime() - start.getTime()
      const hours = Math.round((ms / 36e5) * 100) / 100
      if (!(hours > 0)) {
        toast({ title: "Invalid deadline", description: "Deadline must be in the future", variant: "destructive" })
        setSubmitting(false)
        return
      }
      await projectsApi.updateStageEstimate(projectId, team, { startISO: start.toISOString(), hours })
      toast({ title: "Estimate saved", description: `Estimated completion by ${date} ${time}` })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({ title: "Error saving estimate", description: error.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="first-estimate-desc">
        <DialogHeader>
          <DialogTitle className="capitalize">Set Your Expected Completion ({team})</DialogTitle>
        </DialogHeader>
        <p id="first-estimate-desc" className="text-sm text-muted-foreground">
          Tell us by when you expect to complete this stage.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deadline-date">Date</Label>
            <Input id="deadline-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline-time">Time</Label>
            <Input id="deadline-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

