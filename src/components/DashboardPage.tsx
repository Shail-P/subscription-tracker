import { useCallback, useEffect, useState } from "react";
import { SubscriptionForm, type Subscription } from "./SubscriptionForm";
import { supabase } from "../lib/supabase";
import { SubscriptionList } from "./subscriptionList";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { Modal } from "./Modal";
import { AnnualSubscriptionTotal } from "./AnnualSubscriptionTotal";

// LoginPage passes the signed-in account and its sign-out function down as props.
// userId is the Supabase Auth ID used in subscriptions.user_id, not the email.
type DashboardPageProps = {
  userId: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
};

// This component owns the displayed data and all database operations.
// Form, list, and dialog components report user actions through callback props.
export function DashboardPage({
  userId,
  userEmail,
  onSignOut,
}: DashboardPageProps) {
  // Changing this Boolean opens or closes the form on the next React render.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(true);
  const [loadError, setLoadError] = useState("");

  // React renders this local copy; PostgreSQL stores the permanent subscriptions.
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  // null hides the delete dialog; a Subscription selects which item it confirms.
  const [subscriptionPendingDelete, setSubscriptionPendingDelete] =
    useState<Subscription | null>(null);
  // Passed to the dialog to disable its buttons during deletion and refetching.
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // Keep the name visible while the closing dialog finishes its exit animation.
  const [lastDeleteName, setLastDeleteName] = useState("");

  // Share one loader between the initial effect and the delete handler.
  // useCallback keeps the function reference stable until userId changes;
  // it does not cache query results. Each call makes a new Supabase request.
  const loadSubscriptions = useCallback(async () => {
    setIsLoadingSubscriptions(true);
    setLoadError("");
    try {
      // Stop if Supabase is not configured.
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      // select lists the database columns to return; eq filters by the owner.
      // Supabase's Row Level Security policies enforce ownership independently.
      // order shows the most recently created subscriptions first.
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          id,
          subscription_name,
          subscription_price,
          billing_frequency
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Log failures in Electron DevTools and keep the current list unchanged.
      if (error) {
        throw new Error(error.message);
      }

      // map creates one application object for each database row, converting
      // snake_case column names to the camelCase names our components expect.
      const loadedSubscriptions: Subscription[] = data.map((row) => ({
        id: row.id,
        subscriptionName: row.subscription_name,
        subscriptionPrice: Number(row.subscription_price),
        billingFrequency: row.billing_frequency,
      }));

      // Replace the displayed list with the latest database result.
      setSubscriptions(loadedSubscriptions);
    } catch (error) {
      console.error("Could not load subscriptions:", error);
      setLoadError(
        "Couldn’t load your subscriptions. Check your connection and try again.",
      );
    } finally {
      // Always end loading feedback, including after a failed request.
      setIsLoadingSubscriptions(false);
    }
  }, [userId]);

  // Effects run after rendering. This also reruns when the loader changes
  // because a different userId was supplied.
  useEffect(() => {
    // Start the async work without returning a Promise from this effect.
    // void discards the return value; it does not catch rejected Promises.
    void loadSubscriptions();
  }, [loadSubscriptions]);

  // Save the submitted subscription in Supabase.
  async function handleAddSubscription(newSubscription: Subscription) {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Stop if the Supabase environment variables are missing.
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      // Insert the form values. created_at is filled in by the database default.
      const { data, error } = await supabase
        .from("subscriptions")
        .insert({
          // Use the ID created by SubscriptionForm.
          id: newSubscription.id,

          // Connect the row to the signed-in user.
          user_id: userId,

          // Convert camelCase TypeScript names into
          // snake_case PostgreSQL column names.
          subscription_name: newSubscription.subscriptionName,

          subscription_price: newSubscription.subscriptionPrice,

          billing_frequency: newSubscription.billingFrequency,
        })
        // Return the inserted row so we display what the database actually saved.
        .select()
        // Expect exactly one row and return an object rather than an array.
        .single();

      // Stop if PostgreSQL rejected the insert.
      if (error) {
        console.error("Could not save subscription:", error.message);
        // The form catches this so it can show an error without clearing inputs.
        throw new Error("Couldn’t save this subscription. Please try again.");
      }

      // Convert the returned database row into
      // the format used by the React application.
      const savedSubscription: Subscription = {
        id: data.id,
        subscriptionName: data.subscription_name,

        // Normalize the price to the number type used for display and calculations.
        subscriptionPrice: Number(data.subscription_price),

        billingFrequency: data.billing_frequency,
      };

      // React supplies the latest array to this updater callback. The spread
      // copies it into a new array, then appends the returned subscription.
      setSubscriptions((currentSubscriptions) => [
        ...currentSubscriptions,
        savedSubscription,
      ]);

      // Close the form after the save succeeds.
      setIsFormOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  // Open the custom confirmation dialog for the selected subscription.
  function handleDeleteSubscription(subscriptionId: string) {
    // find returns the first matching object (or undefined). No deletion yet:
    // we only need its ID and name for the confirmation dialog.
    const subscription = subscriptions.find(
      (item) => item.id === subscriptionId,
    );

    if (!subscription) return;

    setDeleteError("");
    setLastDeleteName(subscription.subscriptionName);
    // Storing this object opens the dialog below for this subscription.
    setSubscriptionPendingDelete(subscription);
  }

  // Delete only after the user confirms in the custom dialog.
  async function handleConfirmDelete() {
    if (!supabase || !subscriptionPendingDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError("");
    try {
      // Restrict the delete to both the selected ID and the current user.
      // The database's DELETE policy still controls which rows may be removed.
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", subscriptionPendingDelete.id)
        .eq("user_id", userId);

      if (error) {
        // Keep the dialog open and re-enable its buttons so the user can retry.
        console.error("Could not delete subscription:", error.message);
        throw new Error("Couldn’t delete this subscription. Please try again.");
      }

      // Wait for the latest database rows instead of filtering local state.
      // The loader logs read errors and keeps the old list if the refetch fails.
      await loadSubscriptions();

      // Close the dialog and reset its loading label once the refetch finishes.
      setSubscriptionPendingDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Couldn’t delete this subscription. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  // Use the part before @ as a greeting, with a fallback for an empty value.
  const displayName = userEmail.split("@")[0] || "there";

  return (
    <div className="motion-page min-h-[calc(100svh-2.5rem)] bg-[#0f1115] text-[#e3e3e3]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1115]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <h1 className="text-xl font-medium tracking-tight text-white">
            SubTrack
          </h1>
          <button
            className="motion-button rounded-full px-4 py-2 text-sm font-medium text-[#a8c7fa] hover:bg-[#a8c7fa]/10"
            type="button"
            onClick={onSignOut}
            aria-label={`Log out ${userEmail}`}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="motion-section flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#c4c7c5]">
              Welcome back, {displayName}
            </p>
            <h2 className="mt-1 text-3xl font-normal tracking-tight text-white sm:text-4xl">
              Your subscriptions
            </h2>
          </div>
          <button
            type="button"
            data-modal-trigger
            onClick={() => setIsFormOpen(true)}
            className="motion-button inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[#a8c7fa] px-5 text-sm font-medium text-[#062e6f] hover:bg-[#d3e3fd]"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add subscription
          </button>
        </section>
        {loadError && (
          <p className="motion-feedback mt-8 rounded-2xl bg-[#3c1f1f] px-4 py-3 text-sm text-[#f2b8b5]" role="alert">
            {loadError}
          </p>
        )}

        {/* The total component calculates an annual estimate from this list. */}
        <AnnualSubscriptionTotal
          subscriptions={subscriptions}
          isLoading={isLoadingSubscriptions}
        />

        {/* Pass the data and a function reference; the list calls it on click. */}
        <SubscriptionList
          subscriptions={subscriptions}
          isLoading={isLoadingSubscriptions}
          onDeleteSubscription={handleDeleteSubscription}
        />
      </main>
      {/* Modal keeps its content mounted briefly to animate both open and close. */}
      <Modal
        isOpen={isFormOpen}
        isBusy={isSaving}
        onClose={() => setIsFormOpen(false)}
        labelledBy="add-subscription-title"
      >
        <SubscriptionForm
          // Receive the subscription when the form is submitted.
          onAddSubscription={handleAddSubscription}
          isSaving={isSaving}
          // Close the modal when Cancel is clicked.
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Leave the component mounted so its modal can animate a graceful exit. */}
      <DeleteConfirmationDialog
        isOpen={subscriptionPendingDelete !== null}
        subscriptionName={
          subscriptionPendingDelete?.subscriptionName ?? lastDeleteName
        }
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setSubscriptionPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
