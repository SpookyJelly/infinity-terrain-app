import { useEffect, useState } from 'react'

interface FlexibleNumberInputProps {
  value: number | null
  min?: number
  max?: number
  step?: number
  placeholder?: string
  onChange: (value: number | null) => void
}

export function FlexibleNumberInput({
  value,
  min,
  max,
  step = 1,
  placeholder,
  onChange,
}: FlexibleNumberInputProps) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))

  useEffect(() => {
    setDraft(value === null ? '' : String(value))
  }, [value])

  const commit = () => {
    if (draft.trim() === '') {
      if (min !== undefined) {
        setDraft(String(min))
        onChange(min)
      } else {
        onChange(null)
      }
      return
    }
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(value === null ? '' : String(value))
      return
    }
    const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
    setDraft(String(bounded))
    onChange(bounded)
  }

  return (
    <input
      type="text"
      inputMode={step < 1 ? 'decimal' : 'numeric'}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
