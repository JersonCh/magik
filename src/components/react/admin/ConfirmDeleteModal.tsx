interface ConfirmDeleteModalProps {
  isOpen: boolean
  eyebrow?: string
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeleteModal({
  isOpen,
  eyebrow = "CONFIRMAR ACCIÓN",
  title,
  description,
  confirmText = "Eliminar definitivamente",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="admin-modal-backdrop" onClick={onCancel}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p className="desc">{description}</p>
        <div className="admin-modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
