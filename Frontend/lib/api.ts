// Centralized API client with JWT token injection
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"

export interface ApiError {
  message: string
  details?: string[]
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = typeof window !== "undefined" ? localStorage.getItem("pms_token") : null
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Clear token and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("pms_token")
        localStorage.removeItem("pms_role")
        window.location.href = "/login"
      }
      throw new Error("Unauthorized")
    }

    let data: any = null
    try {
      data = await response.json()
    } catch (_) {
      // ignore JSON parse error for empty responses
    }

    if (!response.ok) {
      const base = (data && (data.message || data.error)) || `HTTP ${response.status}`
      const details = (data && (data.details || data.errors?.map((e: any) => e.msg || e.message))) || []
      const message = details.length ? `${base}: ${details.join('; ')}` : base
      throw { message, details } as ApiError
    }

    return data as T
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<T>(response)
  }
}

export const api = new ApiClient()

// Auth API methods
export const authApi = {
  login: async (email: string, password: string) => {
    return api.post<{ token: string; user: any }>("/api/auth/login", { email, password })
  },
}

// Users API methods
export const usersApi = {
  listActive: async (role?: string) => {
    const query = role ? `?role=${encodeURIComponent(role)}` : ""
    const data = await api.get<any>(`/api/users${query}`)
    const items = Array.isArray(data.items) ? data.items : []
    return items.map((u: any) => ({ id: u.id || u._id, name: u.name, email: u.email, role: u.role }))
  },
}

// Projects API methods
export const projectsApi = {
  getMine: async (page = 1, limit = 10) => {
    const data = await api.get<any>(`/api/projects/mine?page=${page}&limit=${limit}`)
    const items = Array.isArray(data.items) ? data.items : []
    return {
      projects: items.map((p: any) => ({
        id: p.id || p._id,
        title: p.title,
        status: p.status,
        currentTeam: p.currentTeam,
        created: p.createdAt,
      })),
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
    }
  },

  getAll: async (page = 1, limit = 10) => {
    const data = await api.get<any>(`/api/projects?page=${page}&limit=${limit}`)
    const items = Array.isArray(data.items) ? data.items : []
    return {
      projects: items.map((p: any) => ({
        id: p.id || p._id,
        title: p.title,
        status: p.status,
        currentTeam: p.currentTeam,
        created: p.createdAt,
      })),
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages,
    }
  },

  getById: async (id: string) => {
    const p = await api.get<any>(`/api/projects/${id}`)
    const stagesByTeam: any = { data: {}, design: {}, dev: {} }
    const stages: any[] = Array.isArray(p.stages) ? p.stages : []
    stages.forEach((s: any) => {
      const mapped: any = {
        status: s.status,
      }
      // optional head mapping if populated
      if (s.head && typeof s.head === 'object' && (s.head.name || s.head.email)) {
        mapped.head = { name: s.head.name, email: s.head.email }
      }
      if (s.expected && (s.expected.start || s.expected.hours != null)) {
        mapped.headExpected = { start: s.expected.start, hours: s.expected.hours }
      }
      if (s.adminExpected && (s.adminExpected.start || s.adminExpected.hours != null)) {
        mapped.adminExpected = { start: s.adminExpected.start, hours: s.adminExpected.hours }
      }
      if (s.actual && s.actual.start) {
        mapped.actual = {
          start: s.actual.start,
          end: s.actual.end,
          actualHours: s.actualHours,
          penaltyHours: s.penaltyHours,
        }
      }
      stagesByTeam[s.team] = mapped
    })
    return {
      id: p.id || p._id,
      title: p.title,
      description: p.description,
      status: p.status,
      currentTeam: p.currentTeam,
      stages: stagesByTeam,
    }
  },

  create: (data: any) => api.post("/api/projects", data),

  updateStageEstimate: (id: string, team: string, data: any) =>
    api.patch(`/api/projects/${id}/stage/${team}/estimate`, data),

  completeStage: (id: string, team: string, data: any) => api.patch(`/api/projects/${id}/stage/${team}/complete`, data),

  updateAdminExpected: (id: string, team: string, data: any) =>
    api.patch(`/api/projects/${id}/stage/${team}/adminExpected`, data),

  getNotes: async (id: string, team: string) => {
    const data = await api.get<any>(`/api/projects/${id}/stage/${team}/notes`)
    const items = Array.isArray(data.items) ? data.items : []
    return {
      notes: items.map((n: any) => ({
        id: n.id || n._id,
        text: n.text,
        author: n.author && typeof n.author === 'object'
          ? { id: n.author.id || n.author._id, name: n.author.name, email: n.author.email }
          : { id: String(n.author || ''), name: '', email: '' },
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    }
  },

  addNote: (id: string, team: string, text: string) => api.post(`/api/projects/${id}/stage/${team}/notes`, { text }),

  updateNote: (id: string, team: string, noteId: string, text: string) =>
    api.patch(`/api/projects/${id}/stage/${team}/notes/${noteId}`, { text }),

  deleteNote: (id: string, team: string, noteId: string) =>
    api.delete(`/api/projects/${id}/stage/${team}/notes/${noteId}`),

  delete: (id: string) => api.delete(`/api/projects/${id}`),
}
