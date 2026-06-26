interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'error';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  const buttonClass = variant === 'error' ? 'btn btn-error' : 'btn btn-primary';

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box border border-base-300">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="py-4 opacity-80">{description}</p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={buttonClass} onClick={() => void onConfirm()}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
