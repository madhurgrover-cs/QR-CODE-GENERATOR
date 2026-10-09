import type { FormValues, QRType } from './qrData'
import type { QRStyle } from './style'

export interface RecentQR {
  id: string
  type: QRType
  values: FormValues
  style: QRStyle
  payload: string
  label: string
  thumbnail: string
  createdAt: number
}

export const RECENT_KEY = 'qr-designer:recent'
export const MAX_RECENT = 12

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function loadRecent(): RecentQR[] {
  const raw = safeGet(RECENT_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.id === 'string' && r.values && r.style) : []
  } catch {
    return []
  }
}

function sameEntry(a: RecentQR, b: Omit<RecentQR, 'id' | 'createdAt'>): boolean {
  return a.type === b.type && a.payload === b.payload && JSON.stringify(a.style) === JSON.stringify(b.style)
}

/** Adds an entry to the front, removing duplicates and trimming to MAX_RECENT. */
export function addRecent(list: RecentQR[], entry: Omit<RecentQR, 'id' | 'createdAt'>): RecentQR[] {
  const item: RecentQR = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() }
  return [item, ...list.filter((r) => !sameEntry(r, entry))].slice(0, MAX_RECENT)
}

/** Persists the list; if storage is full, drops the oldest entries until it fits. */
export function saveRecent(list: RecentQR[]): RecentQR[] {
  let current = list
  while (current.length > 0 && !safeSet(RECENT_KEY, JSON.stringify(current))) current = current.slice(0, -1)
  if (current.length === 0) safeSet(RECENT_KEY, '[]')
  return current
}

export const THEME_KEY = 'qr-designer:theme'
export type Theme = 'light' | 'dark'

export function loadTheme(): Theme {
  const saved = safeGet(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function saveTheme(t: Theme) {
  safeSet(THEME_KEY, t)
}
