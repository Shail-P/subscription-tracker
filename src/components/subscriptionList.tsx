// Reuse the Subscription type created for the form.
import type { Subscription } from "./SubscriptionForm";

// Convert stored frequencies into price periods (for example, $30 / month).
// Record requires an entry for every frequency in the Subscription union.
const pricePeriods: Record<Subscription["billingFrequency"], string> = {
  weekly: "week",
  biweekly: "2 weeks",
  monthly: "month",
  yearly: "year",
};

type SubscriptionListProps = {
  // The dashboard owns this array and supplies the latest rows after a refetch.
  subscriptions: Subscription[];
  // Report an ID to the parent, which opens a dialog before deleting anything.
  onDeleteSubscription: (subscriptionId: string) => void;
};

// Display-only component: it receives props and never talks to Supabase.
export function SubscriptionList({
  subscriptions,
  onDeleteSubscription,
}: SubscriptionListProps) {
  // An early return shows the empty view instead of rendering an empty list.
  if (subscriptions.length === 0) {
    return (
      <div className="mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center">
        <h3 className="text-lg text-white">No subscriptions yet</h3>

        <p className="mt-2 text-sm text-[#8e918f]">
          Click Add subscription to add your first one.
        </p>
      </div>
    );
  }
  // Display the list when subscriptions exist.
  return (
    <section className="mt-10">
      {/* List heading and subscription count */}
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="text-xl font-medium text-white">Active subscriptions</h3>

        <p className="text-sm text-[#8e918f]">
          {subscriptions.length}{" "}
          {subscriptions.length === 1 ? "subscription" : "subscriptions"}
        </p>
      </div>

      {/* Container for all subscription rows */}
      <div className="overflow-hidden rounded-3xl bg-[#1e1f20]">
        {/* map returns one article per object. index starts at 0, so only
            later rows get a top border. Use the stable ID as React's key
            to track rows when items are added, removed, or reordered. */}
        {subscriptions.map((subscription, index) => (
          <article
            key={subscription.id}
            className={`flex items-center gap-4 px-5 py-4 sm:px-6 ${
              index > 0 ? "border-t border-white/10" : ""
            }`}
          >
            {/* Display the full subscription name and billing frequency. */}
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-base font-medium text-white">
                {subscription.subscriptionName}
              </h4>

              <p className="mt-1 text-sm text-[#8e918f]">
                Billed {subscription.billingFrequency}
              </p>
            </div>

            {/* toFixed(2) formats the number for display without changing it. */}
            <p className="shrink-0 text-base text-white">
              ${subscription.subscriptionPrice.toFixed(2)} /{" "}
              {pricePeriods[subscription.billingFrequency]}
            </p>

            {/* The arrow function waits for a click, then sends this row's ID.
                aria-label names the icon-only control for screen readers. */}
            <button
              type="button"
              onClick={() => onDeleteSubscription(subscription.id)}
              className="grid size-10 shrink-0 place-items-center rounded-full text-[#c4c7c5] transition hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
              aria-label={`Delete ${subscription.subscriptionName}`}
              title={`Delete ${subscription.subscriptionName}`}
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
