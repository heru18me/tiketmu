import Modal from './Modal'
import Button from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    // Saat proses berjalan, dialog tidak boleh ditutup lewat overlay/Esc
    <Modal isOpen={isOpen} onClose={isLoading ? () => undefined : onClose} title={title} size="sm">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="danger" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
