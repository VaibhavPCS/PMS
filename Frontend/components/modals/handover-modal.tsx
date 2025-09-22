"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useState } from "react"

interface HandoverModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  team: string
  startISO?: string
  onSuccess: () => void
}

export function HandoverModal({ isOpen, onClose, projectId, team, startISO, onSuccess }: HandoverModalProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const start = startISO || new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const end = new Date().toISOString()
      await projectsApi.completeStage(projectId, team, { startISO: start, endISO: end })
      toast({ title: "Handed over", description: "Stage marked complete and notes frozen" })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({ title: "Failed to hand over", description: error.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent aria-describedby="handover-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" /> Confirm Hand Over
          </DialogTitle>
        </DialogHeader>
        <p id="handover-desc" className="text-sm text-muted-foreground">
          Handing over will mark this stage as complete using the current time as the end. Notes become read-only.
          Are you sure you want to proceed?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-red-600 text-white hover:bg-red-700" disabled={submitting}>
            {submitting ? "Handing over..." : "Yes, Hand Over"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

