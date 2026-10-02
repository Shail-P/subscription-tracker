import { useId } from "react";
import { Modal } from "./Modal";

// The dashboard supplies the selected name, request status, and actions.
// The dialog confirms intent; database deletion lives in DashboardPage.
type DeleteConfirmationDialogProps = {
  isOpen: boolean;
  subscriptionName: string;
  // True while the delete request and following list refetch are running.
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  errorMessage?: string;
};

// Custom React overlay matching the app's theme instead of window.confirm().
export function DeleteConfirmationDialog({
  isOpen,
  subscriptionName,
  isDeleting,
  onCancel,
  onConfirm,
  errorMessage,
}: DeleteConfirmationDialogProps) {
  // useId makes accessibility IDs unique even if two dialogs are rendered.
  const titleId = useId();
  const descriptionId = useId();

  return (
    // Modal handles opening/closing animation, focus, and background dismissal.
    <Modal
      isOpen={isOpen}
      isBusy={isDeleting}
      onClose={onCancel}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
      panelClassName="max-w-md p-6 sm:p-8"
    >
      <h2 id={titleId} className="text-2xl font-normal text-white">
        Delete subscription?
      </h2>

      <p id={descriptionId} className="mt-4 leading-6 text-[#c4c7c5]">
        Are you sure you want to delete {subscriptionName}? This action cannot
        be undone.
      </p>

      {/* Keep errors in the dialog so the user can retry without losing it. */}
      {errorMessage && (
        <p role="alert" className="motion-feedback mt-4 text-sm text-[#f2b8b5]">
          {errorMessage}
        </p>
      )}

      {/* Disable both actions while the parent is processing confirmation. */}
      <div className="mt-8 flex justify-end gap-2">
        <button
          type="button"
          // Focus the safer action when the confirmation opens.
          data-autofocus
          onClick={onCancel}
          disabled={isDeleting}
          className="motion-button rounded-full px-5 py-2.5 text-sm font-medium text-[#a8c7fa] hover:bg-[#a8c7fa]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          // Start the parent's async handler on click. void ignores its
          // returned Promise; the parent handles status and error messages.
          onClick={() => void onConfirm()}
          disabled={isDeleting}
          className="motion-button inline-flex min-w-28 items-center justify-center gap-2 rounded-full bg-[#f2b8b5] px-5 py-2.5 text-sm font-medium text-[#601410] hover:bg-[#ffdad6] disabled:cursor-wait disabled:opacity-60"
        >
          {/* Fixed button width keeps the layout still while saving. */}
          {isDeleting && <span className="loading-spinner" aria-hidden="true" />}
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
