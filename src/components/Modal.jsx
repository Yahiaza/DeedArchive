import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, children, onClose, width = 760 }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
    <div className="modal-card" style={{ maxWidth: width }}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} title="إغلاق (Esc)"><X size={20}/></button></div>
      {children}
    </div>
  </div>;
}
