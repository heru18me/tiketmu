import { useEffect, useRef, useState } from 'react'
import { toast } from '../../lib/toast'
import Button from '../ui/Button'

export default function CopyReferral({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // Fallback untuk konteks non-HTTPS / izin clipboard ditolak
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    toast.success('Kode referral disalin')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-sm font-semibold tracking-wider text-gray-900">
        {code}
      </code>
      <Button size="sm" variant="outline" onClick={copy} aria-live="polite">
        {copied ? 'Tersalin ✓' : 'Salin'}
      </Button>
    </div>
  )
}
