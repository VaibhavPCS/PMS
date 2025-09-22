"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { authStorage, parseJWT, type User } from "@/lib/auth"
import { authApi } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

interface AuthContextType {
  user: User | null
  role: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = authStorage.getToken()
    const storedRole = authStorage.getRole()

    if (token && storedRole) {
      const payload = parseJWT(token)
      if (payload && payload.exp > Date.now() / 1000) {
        setUser(payload.user || { id: payload.sub, email: payload.email, role: storedRole })
        setRole(storedRole)
      } else {
        authStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password)
      const { token, user: userData } = response

      authStorage.setToken(token)
      authStorage.setRole(userData.role)

      setUser(userData)
      setRole(userData.role)

      toast({
        title: "Login successful",
        description: "Welcome back!",
      })

      router.push("/projects")
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      })
      throw error
    }
  }

  const logout = () => {
    authStorage.clear()
    setUser(null)
    setRole(null)
    router.push("/login")
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    })
  }

  const isAdmin = role === "admin"

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        login,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
