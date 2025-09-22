"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Pencil, Trash2, Plus, MessageSquare } from "lucide-react"
import { projectsApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface Note {
  id: string
  text: string
  author: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface NotesModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  team: string
  readOnly?: boolean
}

export function NotesModal({ isOpen, onClose, projectId, team, readOnly = false }: NotesModalProps) {
  const { user, isAdmin } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [newNoteText, setNewNoteText] = useState("")
  const [editingNote, setEditingNote] = useState<{ id: string; text: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchNotes = async () => {
    if (!isOpen) return

    setLoading(true)
    try {
      const data = await projectsApi.getNotes(projectId, team)
      setNotes(data.notes || [])
    } catch (error: any) {
      toast({
        title: "Error loading notes",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [isOpen, projectId, team])

  const handleAddNote = async () => {
    if (readOnly) return
    if (!newNoteText.trim()) return

    setSubmitting(true)
    try {
      await projectsApi.addNote(projectId, team, newNoteText.trim())
      setNewNoteText("")
      await fetchNotes()
      toast({
        title: "Note added",
        description: "Your note has been added successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditNote = async (noteId: string, text: string) => {
    if (readOnly) return
    if (!text.trim()) return

    setSubmitting(true)
    try {
      await projectsApi.updateNote(projectId, team, noteId, text.trim())
      setEditingNote(null)
      await fetchNotes()
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error updating note",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (readOnly) return
    if (!confirm("Are you sure you want to delete this note?")) return

    setSubmitting(true)
    try {
      await projectsApi.deleteNote(projectId, team, noteId)
      await fetchNotes()
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const canEditNote = (note: Note) => {
    if (readOnly) return false
    return isAdmin || (user && user.id === note.author.id)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" aria-describedby="notes-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            <MessageSquare className="h-5 w-5" />
            {team} Stage Notes
          </DialogTitle>
        </DialogHeader>
        <p id="notes-desc" className="sr-only">View and manage notes for this stage.</p>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add New Note */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a new note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={3}
                  disabled={readOnly}
                />
                <div className="flex justify-end">
                  <Button onClick={handleAddNote} disabled={readOnly || !newNoteText.trim() || submitting} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No notes yet. Add the first note above.</div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(note.author.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{note.author.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(note.createdAt)}
                              {note.updatedAt !== note.createdAt && " (edited)"}
                            </div>
                          </div>
                          {canEditNote(note) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingNote({ id: note.id, text: note.text })}
                                disabled={submitting}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={submitting}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {editingNote?.id === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingNote.text}
                              onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingNote(null)}
                                disabled={submitting}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditNote(note.id, editingNote.text)}
                                disabled={submitting}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm whitespace-pre-wrap">{note.text}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
