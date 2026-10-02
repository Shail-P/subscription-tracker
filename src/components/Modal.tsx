import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  isBusy?: boolean;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  panelClassName?: string;
};

// Keep the closing duration in sync with .modal-panel in styles.css.
// The overlay stays mounted until its exit transition has finished.
const EXIT_DURATION = 180;
const FOCUSABLE_SELECTOR =
  'button, a[href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  children,
  isBusy = false,
  label,
  labelledBy,
  describedBy,
  role = "dialog",
  panelClassName = "",
}: ModalProps) {
  // "Present" controls mounting; "visible" selects the opening/closing CSS.
  // Separating them lets the closing animation finish before React removes it.
  const [isPresent, setIsPresent] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const latestProps = useRef({ isOpen, isBusy, onClose });

  // Event listeners read the latest callback without rebuilding the focus trap
  // whenever a parent supplies an inline onClose function.
  useEffect(() => {
    latestProps.current = { isOpen, isBusy, onClose };
  }, [isOpen, isBusy, onClose]);

  useEffect(() => {
    let openingFrame = 0;
    let secondOpeningFrame = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (isOpen) {
      setIsPresent(true);

      // Give the browser a painted closed state before transitioning to open.
      // Two frames also make this reliable when the modal is newly mounted.
      openingFrame = requestAnimationFrame(() => {
        secondOpeningFrame = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      exitTimer = setTimeout(
        () => setIsPresent(false),
        reduceMotion ? 0 : EXIT_DURATION,
      );
    }

    // React StrictMode can run effects twice in development. Cancel old work
    // so an abandoned animation cannot reopen or remove the current modal.
    return () => {
      cancelAnimationFrame(openingFrame);
      cancelAnimationFrame(secondOpeningFrame);
      if (exitTimer !== undefined) clearTimeout(exitTimer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isPresent) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function getFocusableElements() {
      return Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter(
        (element) =>
          !element.matches(":disabled") &&
          element.getAttribute("tabindex") !== "-1" &&
          element.getClientRects().length > 0,
      );
    }

    function focusInside() {
      const preferred = panelRef.current?.querySelector<HTMLElement>(
        "[data-autofocus]:not(:disabled)",
      );
      const target = preferred ?? getFocusableElements()[0] ?? panelRef.current;
      target?.focus({ preventScroll: true });
    }

    // Move focus into the dialog once the DOM has been mounted.
    const focusFrame = requestAnimationFrame(focusInside);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        const props = latestProps.current;
        if (props.isOpen && !props.isBusy) props.onClose();
        return;
      }

      if (event.key !== "Tab") return;

      // Tab and Shift+Tab loop through this dialog instead of reaching controls
      // hidden behind it. If all controls are disabled, focus the panel itself.
      const focusable = getFocusableElements();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!first) {
        event.preventDefault();
        panelRef.current?.focus({ preventScroll: true });
      } else if (
        !panelRef.current?.contains(active) ||
        (event.shiftKey && (active === first || active === panelRef.current))
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      // Also catch programmatic focus changes to controls outside the dialog.
      if (
        event.target instanceof Node &&
        !panelRef.current?.contains(event.target)
      ) {
        focusInside();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn);
      document.body.style.overflow = previousOverflow;

      // A deleted row's trigger no longer exists. Use the dashboard's Add
      // button as a fallback so keyboard users retain a useful focus position.
      const restoreTarget =
        previousFocus instanceof HTMLElement && previousFocus.isConnected
          ? previousFocus
          : document.querySelector<HTMLElement>("[data-modal-trigger]");
      restoreTarget?.focus({ preventScroll: true });
    };
  }, [isPresent]);

  if (!isPresent) return null;

  // Portaling to body keeps the overlay independent of page-entry transforms.
  // A transformed page would otherwise become the fixed overlay's container.
  return createPortal(
    <div
      className="modal-backdrop"
      data-state={isVisible ? "open" : "closed"}
      onClick={(event) => {
        // Only clicks on the backdrop close the dialog, not clicks inside it.
        if (event.target === event.currentTarget && isOpen && !isBusy) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`modal-panel ${panelClassName}`}
        data-state={isVisible ? "open" : "closed"}
        role={role}
        aria-modal="true"
        aria-label={labelledBy ? undefined : (label ?? "Dialog")}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-busy={isBusy || undefined}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
