import { useEffect, useRef, useState, type DragEvent } from 'react'
import { api } from '../../lib/axios'
import { getErrorMessage } from '../../lib/utils'
import type { ApiResponse, Transaction } from '../../types'
import Button from '../ui/Button'

interface PaymentProofUploadProps {
  transactionId: string
  disabled?: boolean
  onUploaded: (transaction: Transaction) => void
}

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png']

export default function PaymentProofUpload({ transactionId, disabled = false, onUploaded }: PaymentProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null)
  const file = picked?.file ?? null
  const preview = picked?.url ?? null
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  // Bebaskan object URL saat diganti atau saat komponen dilepas
  const previewUrl = picked?.url
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!ALLOWED.includes(f.type)) {
      setError('Format file harus JPG atau PNG')
      return
    }
    if (f.size > MAX_SIZE) {
      setError('Ukuran file maksimal 5MB')
      return
    }
    setError('')
    setPicked({ file: f, url: URL.createObjectURL(f) })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) pick(e.dataTransfer.files[0])
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('paymentProof', file)
      const res = await api.post<ApiResponse<Transaction>>(`/transactions/${transactionId}/payment-proof`, body)
      onUploaded(res.data.data)
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal mengunggah bukti pembayaran'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
            : dragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Preview bukti pembayaran" className="max-h-64 rounded-lg object-contain" />
        ) : (
          <>
            <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-700">Seret gambar ke sini atau klik untuk memilih</p>
            <p className="text-xs text-gray-500">JPG atau PNG, maksimal 5MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          aria-label="Pilih bukti pembayaran"
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = '' // izinkan memilih file yang sama lagi
          }}
        />
      </div>

      {file && (
        <p className="text-xs text-gray-500">
          {file.name} · {(file.size / 1024).toFixed(0)} KB ·{' '}
          <button type="button" className="text-primary-600 underline" onClick={() => setPicked(null)} disabled={uploading}>
            Ganti
          </button>
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <Button className="w-full" disabled={!file || disabled} isLoading={uploading} onClick={upload}>
        Upload Bukti Bayar
      </Button>
    </div>
  )
}
