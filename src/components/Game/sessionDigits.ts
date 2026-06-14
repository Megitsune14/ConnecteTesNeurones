import { useCallback, useState } from 'react'
import { RECOGNIZED_DIGITS } from './constants'

export const STORAGE_KEY_SESSION_DIGITS = 'gameSessionDigits'

export type SessionDigitEntry = {
  id: string
  digit: number
  grid: number[][]
  savedAt: number
}

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => [...row])
}

function isValidGrid(grid: unknown): grid is number[][] {
  if (!Array.isArray(grid) || grid.length !== 9) return false
  return grid.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 6 &&
      row.every((cell) => cell === 0 || cell === 1)
  )
}

export function loadSessionDigits(): SessionDigitEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION_DIGITS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SessionDigitEntry =>
        entry != null &&
        typeof entry === 'object' &&
        typeof (entry as SessionDigitEntry).id === 'string' &&
        typeof (entry as SessionDigitEntry).digit === 'number' &&
        RECOGNIZED_DIGITS.includes((entry as SessionDigitEntry).digit) &&
        isValidGrid((entry as SessionDigitEntry).grid) &&
        typeof (entry as SessionDigitEntry).savedAt === 'number'
    )
  } catch {
    return []
  }
}

export function persistSessionDigits(entries: SessionDigitEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY_SESSION_DIGITS, JSON.stringify(entries))
  } catch {
    /* ignore */
  }
}

export function useSessionDigits() {
  const [sessionDigits, setSessionDigits] = useState<SessionDigitEntry[]>(
    loadSessionDigits
  )

  const saveDigit = useCallback((digit: number, grid: number[][]) => {
    if (!RECOGNIZED_DIGITS.includes(digit) || !isValidGrid(grid)) return
    const entry: SessionDigitEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      digit,
      grid: cloneGrid(grid),
      savedAt: Date.now(),
    }
    setSessionDigits((prev) => {
      const next = [...prev, entry]
      persistSessionDigits(next)
      return next
    })
  }, [])

  const removeDigit = useCallback((id: string) => {
    setSessionDigits((prev) => {
      const next = prev.filter((e) => e.id !== id)
      persistSessionDigits(next)
      return next
    })
  }, [])

  return { sessionDigits, saveDigit, removeDigit }
}
