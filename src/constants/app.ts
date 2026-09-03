/** PocketBase API (задаётся через VITE_POCKETBASE_URL при сборке). */
export const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL?.trim() || 'http://127.0.0.1:8090'
