"use client";

import { Button } from "@/components/ui/button";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LuX } from "@/components/ui/icons";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { cn } from "@/lib/utils";

export type ModalWidth = "sm" | "md" | "lg" | "xl";
export type ModalLayer = "modal" | "nested";
export type ModalPlacement = "center" | "bottom";
export type ModalHeaderVariant = "default" | "accent";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  headerContent?: ReactNode;
  headerVariant?: ModalHeaderVariant;
  children?: ReactNode;
  footer?: ReactNode;
  width?: ModalWidth;
  layer?: ModalLayer;
  bodyClassName?: string;
  footerClassName?: string;
  closeLabel?: string;
  fitContent?: boolean;
  showCloseButton?: boolean;
  placement?: ModalPlacement;
  preserveScrollbarGutter?: boolean;
  onExitComplete?: () => void;
}

interface ModalActionsProps {
  children: ReactNode;
  className?: string;
  divided?: boolean;
  align?: "start" | "end" | "between";
}

interface ModalNoticeProps {
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
  tone?: "info" | "warning" | "danger" | "success";
}

const widthStyles: Record<ModalWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const modalExitDurationMs = 300;

const actionAlignmentStyles: Record<
  NonNullable<ModalActionsProps["align"]>,
  string
> = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between",
};

const noticeToneStyles: Record<
  NonNullable<ModalNoticeProps["tone"]>,
  string
> = {
  info: "border-primary/25 bg-primary/10 text-primary",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  success: "border-success/30 bg-success/10 text-success",
};

export function ModalActions({
  children,
  className,
  divided = true,
  align = "end",
}: ModalActionsProps) {
  return (
    <div
      data-slot="modal-actions"
      className={cn(
        "flex flex-wrap items-center gap-3",
        actionAlignmentStyles[align],
        divided && "border-t border-border pt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModalNotice({
  title,
  children,
  icon,
  className,
  tone = "info",
}: ModalNoticeProps) {
  return (
    <div
      data-slot="modal-notice"
      className={cn(
        "rounded-2xl border p-4 text-sm leading-6",
        noticeToneStyles[tone],
        className,
      )}
    >
      <div className={cn(icon && "flex items-start gap-3")}>
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className={cn(title && "mt-1")}>{children}</div>
        </div>
      </div>
    </div>
  );
}

let rootScrollLockCount = 0;
let rootOverflowBeforeLock = "";
let rootScrollbarGutterBeforeLock = "";
let bodyPaddingRightBeforeLock = "";
let cachedNativeScrollbarWidth: number | null = null;

function getNativeScrollbarWidth() {
  if (cachedNativeScrollbarWidth !== null) {
    return cachedNativeScrollbarWidth;
  }

  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "absolute",
    top: "-9999px",
    left: "-9999px",
    width: "100px",
    height: "100px",
    overflow: "scroll",
    visibility: "hidden",
    pointerEvents: "none",
  });
  document.body.appendChild(probe);
  cachedNativeScrollbarWidth = Math.max(
    0,
    probe.offsetWidth - probe.clientWidth,
  );
  probe.remove();

  return cachedNativeScrollbarWidth;
}

function lockPageScroll(preserveScrollbarGutter: boolean) {
  if (rootScrollLockCount === 0) {
    const root = document.documentElement;
    const rootGutterWidth = Math.max(0, window.innerWidth - root.clientWidth);
    const reservedGutterWidth =
      rootGutterWidth > 0 ? rootGutterWidth : getNativeScrollbarWidth();

    rootOverflowBeforeLock = root.style.overflow;
    rootScrollbarGutterBeforeLock = root.style.scrollbarGutter;
    bodyPaddingRightBeforeLock = document.body.style.paddingRight;

    if (preserveScrollbarGutter && reservedGutterWidth > 0) {
      const bodyPaddingRight =
        Number.parseFloat(
          window.getComputedStyle(document.body).paddingRight,
        ) || 0;
      document.body.style.paddingRight = `${bodyPaddingRight + reservedGutterWidth}px`;
    }

    root.style.scrollbarGutter = "auto";
    root.style.overflow = "hidden";
  }
  rootScrollLockCount += 1;
}

function unlockPageScroll() {
  rootScrollLockCount = Math.max(0, rootScrollLockCount - 1);
  if (rootScrollLockCount !== 0) return;

  const root = document.documentElement;
  root.style.overflow = rootOverflowBeforeLock;
  root.style.scrollbarGutter = rootScrollbarGutterBeforeLock;
  document.body.style.paddingRight = bodyPaddingRightBeforeLock;
  rootOverflowBeforeLock = "";
  rootScrollbarGutterBeforeLock = "";
  bodyPaddingRightBeforeLock = "";
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  headerContent,
  headerVariant = "default",
  children,
  footer,
  width = "xl",
  layer = "modal",
  bodyClassName = "p-4 md:p-6",
  footerClassName,
  closeLabel = "Close dialog",
  fitContent = false,
  showCloseButton = true,
  placement = "center",
  preserveScrollbarGutter = true,
  onExitComplete,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dragControls = useDragControls();
  const [isDragDismissing, setIsDragDismissing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockPageScroll(preserveScrollbarGutter);

    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable =
        panelRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? panelRef.current)?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      const modalRoots = document.querySelectorAll("[data-modal-root]");
      if (modalRoots[modalRoots.length - 1] !== rootRef.current) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleScrollToTop() {
      bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("stepchanged", handleScrollToTop);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.setTimeout(unlockPageScroll, modalExitDurationMs);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("stepchanged", handleScrollToTop);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <motion.div
          ref={rootRef}
          data-modal-root
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`fixed inset-0 bg-overlay ${
            placement === "center" ? "backdrop-blur-sm" : ""
          } ${layer === "nested" ? "z-110" : "z-100"}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div
            className={`fixed inset-0 flex justify-center p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] [padding-top:max(0.75rem,env(safe-area-inset-top))] md:p-6 md:[padding-bottom:max(1.5rem,env(safe-area-inset-bottom))] md:[padding-top:max(1.5rem,env(safe-area-inset-top))] ${
              placement === "bottom"
                ? "items-end overflow-hidden md:items-center"
                : "items-center overflow-y-auto"
            }`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={
                description && !headerContent ? descriptionId : undefined
              }
              tabIndex={-1}
              initial={
                placement === "bottom"
                  ? { y: 48 }
                  : { opacity: 0, scale: 0.985, y: 12 }
              }
              animate={
                placement === "bottom"
                  ? { y: isDragDismissing ? "110%" : 0 }
                  : { opacity: 1, scale: 1, y: 0 }
              }
              exit={
                placement === "bottom"
                  ? { y: "110%" }
                  : { opacity: 0, scale: 0.985, y: 12 }
              }
              transition={
                placement === "bottom"
                  ? { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0.2, ease: "easeOut" }
              }
              drag={placement === "bottom" ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 1000 }}
              dragElastic={0}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 700) {
                  setIsDragDismissing(true);
                }
              }}
              onAnimationComplete={() => {
                if (!isDragDismissing) return;
                setIsDragDismissing(false);
                onClose();
              }}
              className={`relative flex max-h-full w-full flex-col overflow-hidden border border-border bg-card shadow-2xl outline-none ${widthStyles[width]} ${
                placement === "bottom"
                  ? "transform-gpu will-change-transform rounded-t-3xl rounded-b-xl md:rounded-2xl"
                  : "rounded-2xl"
              } ${
                fitContent || width === "sm" || width === "md"
                  ? "h-fit"
                  : "h-full"
              }`}
            >
              {placement === "bottom" && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center justify-center"
                >
                  <span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
                </span>
              )}
              <header
                onPointerDown={
                  placement === "bottom"
                    ? (event) => dragControls.start(event)
                    : undefined
                }
                className={`flex shrink-0 items-start justify-between gap-4 border-b px-5 pb-4 md:px-6 ${
                  headerVariant === "accent"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                } ${
                  placement === "bottom"
                    ? "touch-none cursor-grab select-none pt-7 active:cursor-grabbing"
                    : "pt-4"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h2
                    id={titleId}
                    className={cn(
                      headerContent
                        ? "sr-only"
                        : "text-lg font-semibold leading-7",
                      headerVariant === "accent"
                        ? "text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {title}
                  </h2>
                  {headerContent ??
                    (description && (
                      <p
                        id={descriptionId}
                        className={cn(
                          "mt-0.5 text-sm leading-5",
                          headerVariant === "accent"
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        )}
                      >
                        {description}
                      </p>
                    ))}
                </div>
                {showCloseButton && placement !== "bottom" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    aria-label={closeLabel}
                    className={
                      headerVariant === "accent"
                        ? "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                        : undefined
                    }
                  >
                    <LuX aria-hidden="true" size={22} animated />
                  </Button>
                )}
              </header>

              {children !== undefined && children !== null && (
                <div
                  ref={bodyRef}
                  className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}
                >
                  {children}
                </div>
              )}

              {footer && (
                <footer
                  data-slot="modal-footer"
                  className={cn(
                    "flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-card px-4 py-4 md:px-6",
                    footerClassName,
                  )}
                >
                  {footer}
                </footer>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
