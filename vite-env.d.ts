/// <reference types="vite/client" />

/**
 * Environment Variables Type Definitions
 * Modified: January 2025
 * 
 * VITE_API_BASE_URL: Override for backend base URL (optional)
 * VITE_API_URL: Legacy environment variable (optional)
 * 
 * Default production endpoint: https://pms.upda.co.in:5001
 * Previous localhost endpoint: http://localhost:5000 (development)
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_URL: string
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}