export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
