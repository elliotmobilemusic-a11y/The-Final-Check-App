import type { PropsWithChildren, Ref } from 'react';
import { createPortal } from 'react-dom';

type ControlPanelModalProps = PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  title: string;
  bodyRef?: Ref<HTMLDivElement>;
}>;

export function ControlPanelModal({ open, onClose, title, bodyRef, children }: ControlPanelModalProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="drawer-backdrop control-drawer-backdrop" onClick={onClose}>
      <div
        aria-modal="true"
        className="drawer-panel control-drawer-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="control-drawer-body" ref={bodyRef}>
          <div className="control-drawer-header">
            <h2 className="control-drawer-title">{title}</h2>
            <button className="button button-secondary" onClick={onClose} type="button">
              Close ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
