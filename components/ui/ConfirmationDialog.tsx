"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

import Modal from "@/components/ui/Modal";

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: "primary" | "danger";
  showCloseButton?: boolean;
}

export default function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  busy = false,
  tone = "primary",
  showCloseButton = true,
}: ConfirmationDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      description={description}
      width="md"
      layer="nested"
      showCloseButton={showCloseButton}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "destructive" : "default"}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Please wait..." : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
