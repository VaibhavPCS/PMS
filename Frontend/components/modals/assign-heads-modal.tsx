"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface AssignHeadsModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentHeads?: {
    dataHead?: string
    designHead?: string
    devHead?: string
  }
  onSuccess: () => void
}

export function AssignHeadsModal({ isOpen, onClose, projectId, currentHeads = {}, onSuccess }: AssignHeadsModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    dataHead: currentHeads.dataHead || "",
    designHead: currentHeads.designHead || "",
    devHead: currentHeads.devHead || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await projectsApi.updateHeads(projectId, formData)

      toast({
        title: "Heads assigned",
        description: "Project heads have been updated successfully",
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: "Error assigning heads",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setFormData({
      dataHead: currentHeads.dataHead || "",
      designHead: currentHeads.designHead || "",
      devHead: currentHeads.devHead || "",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Stage Heads</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data-head">Data Head Email</Label>
            <Input
              id="data-head"
              type="email"
              value={formData.dataHead}
              onChange={(e) => setFormData({ ...formData, dataHead: e.target.value })}
              placeholder="data@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="design-head">Design Head Email</Label>
            <Input
              id="design-head"
              type="email"
              value={formData.designHead}
              onChange={(e) => setFormData({ ...formData, designHead: e.target.value })}
              placeholder="design@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dev-head">Development Head Email</Label>
            <Input
              id="dev-head"
              type="email"
              value={formData.devHead}
              onChange={(e) => setFormData({ ...formData, devHead: e.target.value })}
              placeholder="dev@example.com"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Heads"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
