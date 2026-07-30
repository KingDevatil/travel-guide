import { useRef } from "react";
import { useDialogAccessibility } from "../hooks/useDialogAccessibility";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "确认", onConfirm, onClose }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const panelRef = useDialogAccessibility<HTMLElement>(open, onClose);
  if (!open) return null;
  return <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={panelRef} className="dialog-panel confirm-dialog">
      <div className="dialog-header"><h2 id="confirm-title" className="dialog-title">{title}</h2></div>
      <p className="confirm-dialog__message">{message}</p>
      <div className="dialog-actions confirm-dialog__actions">
        <button type="button" className="dialog-btn-cancel" onClick={onClose}>取消</button>
        <button ref={confirmRef} type="button" className="dialog-btn-submit" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </section>
  </div>;
}
