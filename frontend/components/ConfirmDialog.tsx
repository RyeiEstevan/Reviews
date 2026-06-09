"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

// Reusable confirmation modal. Reuses the existing .modal / .modal-backdrop /
// .modal-icon styles so it matches the admin "delete user" dialog.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" data-cy="confirm-backdrop" onClick={onCancel}>
      <div className="modal" data-cy="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon danger">
          <AlertTriangle size={22} />
        </div>
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="secondary" data-cy="confirm-cancel" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button className="danger" data-cy="confirm-ok" onClick={onConfirm} disabled={loading}>
            {loading ? "Excluindo…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
