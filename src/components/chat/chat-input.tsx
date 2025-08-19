'use client'

import { useRef, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SendHorizontal, Square } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isLoading && value.trim()) onSubmit()
      }
    },
    [isLoading, value, onSubmit]
  )

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message… (Shift+Enter for newline)"
        className="min-h-[44px] max-h-[200px] resize-none"
        rows={1}
        disabled={disabled}
      />

      {isLoading ? (
        <Button size="icon" variant="outline" onClick={onStop} className="shrink-0">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          size="icon"
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          className="shrink-0"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
