"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { projectsApi, usersApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dataHead: "",
    designHead: "",
    devHead: "",
    dataAdminExpected: {
      days: "",
      hours: "00",
    },
    designAdminExpected: {
      days: "",
      hours: "00",
    },
    devAdminExpected: {
      days: "",
      hours: "00",
    },
  })

  // Load active users for dropdowns when modal opens
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const list = await usersApi.listActive()
        setUsers(list)
      } catch (error: any) {
        // Non-blocking toast; still allow manual entry if needed
        // eslint-disable-next-line no-console
        console.error("Failed to load users", error)
      }
    }
    if (isOpen) fetchUsers()
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFormError(null)

    try {
      const projectData: any = {
        title: formData.title,
        description: formData.description,
      }

      // Heads (required) backend expects keys: data/design/dev (IDs)
      projectData.heads = {
        data: formData.dataHead,
        design: formData.designHead,
        dev: formData.devHead,
      }

      // Admin expected durations (no start dates)
      const adminExpected: any = {}
      if (formData.dataAdminExpected.days || formData.dataAdminExpected.hours) {
        adminExpected.data = {
          days: formData.dataAdminExpected.days ? Number.parseInt(formData.dataAdminExpected.days) : 0,
          hours: formData.dataAdminExpected.hours ? Number.parseInt(formData.dataAdminExpected.hours) : 0,
        }
      }
      if (formData.designAdminExpected.days || formData.designAdminExpected.hours) {
        adminExpected.design = {
          days: formData.designAdminExpected.days ? Number.parseInt(formData.designAdminExpected.days) : 0,
          hours: formData.designAdminExpected.hours ? Number.parseInt(formData.designAdminExpected.hours) : 0,
        }
      }
      if (formData.devAdminExpected.days || formData.devAdminExpected.hours) {
        adminExpected.dev = {
          days: formData.devAdminExpected.days ? Number.parseInt(formData.devAdminExpected.days) : 0,
          hours: formData.devAdminExpected.hours ? Number.parseInt(formData.devAdminExpected.hours) : 0,
        }
      }

      if (Object.keys(adminExpected).length > 0) {
        projectData.adminExpected = adminExpected
      }

      const response = await projectsApi.create(projectData)

      toast({
        title: "Project created",
        description: "Project has been created successfully",
      })

      onClose()
      resetForm()
      const newId = (response as any)?.id || (response as any)?._id
      router.push(`/projects/${newId}`)
    } catch (error: any) {
      const message = error?.message || 'Failed to create project'
      setFormError(message)
      toast({
        title: "Error creating project",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      dataHead: "",
      designHead: "",
      devHead: "",
      dataAdminExpected: {
        days: "",
        hours: "00",
      },
      designAdminExpected: {
        days: "",
        hours: "00",
      },
      devAdminExpected: {
        days: "",
        hours: "00",
      },
    })
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="create-project-desc">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <p id="create-project-desc" className="sr-only">Fill required fields to create a new project.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-2">
              {formError}
            </div>
          )}
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter project title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter project description"
                rows={3}
                required
              />
            </div>
          </div>

          <Separator />

          {/* Stage Heads */}
          <div className="space-y-4">
            <h4 className="font-medium">Stage Heads (Required)</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="data-head">Data Head</Label>
                <select
                  id="data-head"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.dataHead}
                  onChange={(e) => setFormData({ ...formData, dataHead: e.target.value })}
                  required
                >
                  <option value="">Select data head</option>
                  {users
                    .filter((u) => u.role === "data_head")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="design-head">Design Head</Label>
                <select
                  id="design-head"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.designHead}
                  onChange={(e) => setFormData({ ...formData, designHead: e.target.value })}
                  required
                >
                  <option value="">Select design head</option>
                  {users
                    .filter((u) => u.role === "design_head")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dev-head">Dev Head</Label>
                <select
                  id="dev-head"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={formData.devHead}
                  onChange={(e) => setFormData({ ...formData, devHead: e.target.value })}
                  required
                >
                  <option value="">Select dev head</option>
                  {users
                    .filter((u) => u.role === "dev_head")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Admin Expected Durations (days/hours only) */}
          <div className="space-y-4">
            <h4 className="font-medium">Admin Expected Durations (Optional)</h4>

            {/* Data Stage */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-muted-foreground">Data Stage</h5>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="data-days">Days</Label>
                  <Input
                    id="data-days"
                    type="number"
                    min="0"
                    value={formData.dataAdminExpected.days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dataAdminExpected: { ...formData.dataAdminExpected, days: e.target.value },
                      })
                    }
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data-hours">Hours</Label>
                  <Input
                    id="data-hours"
                    type="number"
                    min="0"
                    value={formData.dataAdminExpected.hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dataAdminExpected: { ...formData.dataAdminExpected, hours: e.target.value },
                      })
                    }
                    placeholder="00"
                  />
                </div>
              </div>
            </div>

            {/* Design Stage */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-muted-foreground">Design Stage</h5>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="design-days">Days</Label>
                  <Input
                    id="design-days"
                    type="number"
                    min="0"
                    value={formData.designAdminExpected.days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        designAdminExpected: { ...formData.designAdminExpected, days: e.target.value },
                      })
                    }
                    placeholder="7"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="design-hours">Hours</Label>
                  <Input
                    id="design-hours"
                    type="number"
                    min="0"
                    value={formData.designAdminExpected.hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        designAdminExpected: { ...formData.designAdminExpected, hours: e.target.value },
                      })
                    }
                    placeholder="00"
                  />
                </div>
              </div>
            </div>

            {/* Dev Stage */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-muted-foreground">Development Stage</h5>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dev-days">Days</Label>
                  <Input
                    id="dev-days"
                    type="number"
                    min="0"
                    value={formData.devAdminExpected.days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        devAdminExpected: { ...formData.devAdminExpected, days: e.target.value },
                      })
                    }
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-hours">Hours</Label>
                  <Input
                    id="dev-hours"
                    type="number"
                    min="0"
                    value={formData.devAdminExpected.hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        devAdminExpected: { ...formData.devAdminExpected, hours: e.target.value },
                      })
                    }
                    placeholder="00"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
