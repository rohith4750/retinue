import { useEffect } from 'react'

interface KeyboardShortcutOptions {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  key: string
  callback: () => void
  preventDefault?: boolean
}

export function useKeyboardShortcut({
  ctrl = false,
  shift = false,
  alt = false,
  key,
  callback,
  preventDefault = true,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const ctrlMatch = !ctrl || event.ctrlKey || event.metaKey
      const shiftMatch = !shift || event.shiftKey
      const altMatch = !alt || event.altKey
      const keyMatch = event.key.toLowerCase() === key.toLowerCase()

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [ctrl, shift, alt, key, callback, preventDefault])
}
