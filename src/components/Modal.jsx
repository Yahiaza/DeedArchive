import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, children, onClose, width = 760 }) {
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-card" style={{ maxWidth: width }}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={20}/></button></div>
      {children}
    </div>
  </div>;
}
