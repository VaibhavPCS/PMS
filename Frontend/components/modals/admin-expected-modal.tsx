"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface AdminExpectedModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  team: string
  onSuccess: () => void
}

export function AdminExpectedModal({ isOpen, onClose, projectId, team, onSuccess }: AdminExpectedModalProps) {
  const [startDate, setStartDate] = useState("")
  const [days, setDays] = useState("")
  const [hours, setHours] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await projectsApi.updateAdminExpected(projectId, team, {
        startISO: new Date(startDate).toISOString(),
        days: Number.parseInt(days),
        hours: Number.parseInt(hours),
      })

      toast({
        title: "Admin expected updated",
        description: `Successfully updated admin expected for ${team} stage`,
      })

      onSuccess()
      onClose()
      setStartDate("")
      setDays("")
      setHours("")
    } catch (error: any) {
      toast({
        title: "Error updating admin expected",
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
    setDays("")
    setHours("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent aria-describedby="admin-expected-desc">
        <DialogHeader>
          <DialogTitle className="capitalize">Update Admin Expected - {team} Stage</DialogTitle>
        </DialogHeader>
        <p id="admin-expected-desc" className="sr-only">Set the admin-expected start and durations for this stage.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Expected Start Date & Time</Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="days">Expected Days</Label>
            <Input
              id="days"
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Enter expected days"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hours">Expected Hours</Label>
            <Input
              id="hours"
              type="number"
              min="1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Enter expected hours"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Expected"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
