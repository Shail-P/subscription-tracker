// The dashboard supplies the selected name, request status, and actions.
// The dialog confirms intent; database deletion lives in DashboardPage.
type DeleteConfirmationDialogProps = {
  subscriptionName: string;
  // True while the delete request and following list refetch are running.
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

// Custom React overlay matching the app's theme instead of window.confirm().
export function DeleteConfirmationDialog({
  subscriptionName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  return (
    // aria-labelledby/aria-describedby connect the dialog to its text below.
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <div className="w-full max-w-md rounded-[28px] bg-[#1e1f20] p-6 shadow-2xl sm:p-8">
        <h2
          id="delete-dialog-title"
          className="text-2xl font-normal text-white"
        >
          Delete subscription?
        </h2>

        <p
          id="delete-dialog-description"
          className="mt-4 leading-6 text-[#c4c7c5]"
        >
          Are you sure you want to delete {subscriptionName}? This action
          cannot be undone.
        </p>

        {/* Disable both actions while the parent is processing confirmation. */}
        <div className="mt-8 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-[#a8c7fa] transition hover:bg-[#a8c7fa]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            // Start the parent's async handler on click. void ignores its
            // returned Promise; the parent updates isDeleting and logs errors.
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="rounded-full bg-[#f2b8b5] px-5 py-2.5 text-sm font-medium text-[#601410] transition hover:bg-[#ffdad6] disabled:cursor-wait disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
