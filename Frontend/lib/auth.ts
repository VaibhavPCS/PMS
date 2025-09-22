// Authentication utilities for JWT token and role management
export interface User {
  id: string
  email: string
  role: "admin" | "data" | "design" | "dev"
}

export interface AuthState {
  token: string | null
  user: User | null
  role: string | null
}

// Storage keys
const TOKEN_KEY = "pms_token"
const ROLE_KEY = "pms_role"

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken: (token: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(TOKEN_KEY, token)
  },

  getRole: (): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(ROLE_KEY)
  },

  setRole: (role: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(ROLE_KEY, role)
  },

  clear: (): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
  },
}

export const parseJWT = (token: string): any => {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    return null
  }
}
