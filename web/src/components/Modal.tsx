import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

// Native <dialog>: focus trap, Esc and inert background come from the browser.
export default function Modal({ onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {children}
    </dialog>
  );
}
