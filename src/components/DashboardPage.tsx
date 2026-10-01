import { useState } from "react";
import { SubscriptionForm, type Subscription } from "./SubscriptionForm";
import { supabase } from "../lib/supabase";
type DashboardPageProps = {
  userId: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
};

export function DashboardPage({
  userId,
  userEmail,
  onSignOut,
}: DashboardPageProps) {
  // false means the form is closed.
  // true means the form is visible.
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  // Save the submitted subscription in Supabase.
  async function handleAddSubscription(newSubscription: Subscription) {
    // Stop if the Supabase environment variables are missing.
    if (!supabase) {
      console.error("Supabase is not configured.");
      return;
    }

    // Insert the subscription and ask Supabase
    // to return the row that PostgreSQL saved.
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

        renewal_date: newSubscription.renewalDate,
      })
      .select()
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

      // PostgreSQL numeric values may be returned as strings.
      subscriptionPrice: Number(data.subscription_price),

      renewalDate: data.renewal_date,
    };

    // Add the row returned by Supabase to the visible list.
    setSubscriptions((currentSubscriptions) => [
      ...currentSubscriptions,
      savedSubscription,
    ]);

    // Close the form after the save succeeds.
    setIsFormOpen(false);
  }

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
        {/* Show how many subscriptions are currently stored. */}
        <p className="mt-8 text-sm text-[#c4c7c5]">
          {subscriptions.length}{" "}
          {subscriptions.length === 1 ? "subscription" : "subscriptions"}
        </p>
      </main>
      {/* Only render the modal when isFormOpen is true. */}
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
    </div>
  );
}
