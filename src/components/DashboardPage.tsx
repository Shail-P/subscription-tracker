import { useCallback, useEffect, useState } from "react";
import { SubscriptionForm, type Subscription } from "./SubscriptionForm";
import { supabase } from "../lib/supabase";
import { SubscriptionList } from "./subscriptionList";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

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

  // React renders this local copy; PostgreSQL stores the permanent subscriptions.
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  // null hides the delete dialog; a Subscription selects which item it confirms.
  const [subscriptionPendingDelete, setSubscriptionPendingDelete] =
    useState<Subscription | null>(null);
  // Passed to the dialog to disable its buttons during deletion and refetching.
  const [isDeleting, setIsDeleting] = useState(false);

  // Share one loader between the initial effect and the delete handler.
  // useCallback keeps the function reference stable until userId changes;
  // it does not cache query results. Each call makes a new Supabase request.
  const loadSubscriptions = useCallback(async () => {
    // Stop if Supabase is not configured.
    if (!supabase) {
      console.error("Supabase is not configured.");
      return;
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
      console.error("Could not load subscriptions:", error.message);
      return;
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
    // Stop if the Supabase environment variables are missing.
    if (!supabase) {
      console.error("Supabase is not configured.");
      return;
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
      return;
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
  }

  // Open the custom confirmation dialog for the selected subscription.
  function handleDeleteSubscription(subscriptionId: string) {
    // find returns the first matching object (or undefined). No deletion yet:
    // we only need its ID and name for the confirmation dialog.
    const subscription = subscriptions.find(
      (item) => item.id === subscriptionId,
    );

    if (!subscription) return;

    // Storing this object causes the conditional dialog below to appear.
    setSubscriptionPendingDelete(subscription);
  }

  // Delete only after the user confirms in the custom dialog.
  async function handleConfirmDelete() {
    if (!supabase || !subscriptionPendingDelete) return;

    setIsDeleting(true);

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
      setIsDeleting(false);
      return;
    }

    // Wait for the latest database rows instead of filtering local state.
    // The loader logs read errors and keeps the old list if the refetch fails.
    await loadSubscriptions();

    // Close the dialog and reset its loading label once the refetch finishes.
    setSubscriptionPendingDelete(null);
    setIsDeleting(false);
  }

  // Use the part before @ as a greeting, with a fallback for an empty value.
  const displayName = userEmail.split("@")[0] || "there";

  return (
    <div className="min-h-[calc(100svh-2.5rem)] bg-[#0f1115] text-[#e3e3e3]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0f1115]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <h1 className="text-xl font-medium tracking-tight text-white">
            SubTrack
          </h1>
          <button
            className="rounded-full px-4 py-2 text-sm font-medium text-[#a8c7fa] transition hover:bg-[#a8c7fa]/10"
            type="button"
            onClick={onSignOut}
            aria-label={`Log out ${userEmail}`}
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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
            onClick={() => setIsFormOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[#a8c7fa] px-5 text-sm font-medium text-[#062e6f] transition hover:bg-[#d3e3fd]"
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
        {/* Pass the data and a function reference; the list calls it on click. */}
        <SubscriptionList
          subscriptions={subscriptions}
          onDeleteSubscription={handleDeleteSubscription}
        />
      </main>
      {/* && includes this JSX only while isFormOpen is true. */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Add subscription"
        >
          <SubscriptionForm
            // Receive the subscription when the form is submitted.
            onAddSubscription={handleAddSubscription}
            // Close the modal when Cancel is clicked.
            onCancel={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* The chosen subscription opens the dialog; setting it to null closes it. */}
      {subscriptionPendingDelete && (
        <DeleteConfirmationDialog
          subscriptionName={subscriptionPendingDelete.subscriptionName}
          isDeleting={isDeleting}
          onCancel={() => setSubscriptionPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
