// Reuse the Subscription type created for the form.
import type { Subscription } from "./SubscriptionForm";
import { useLayoutEffect, useRef, type CSSProperties } from "react";

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
  // Keep the empty message hidden while the first database request runs.
  isLoading?: boolean;
};

// Display-only component: it receives props and never talks to Supabase.
export function SubscriptionList({
  subscriptions,
  onDeleteSubscription,
  isLoading = false,
}: SubscriptionListProps) {
  // Refs remember DOM elements and positions without causing another render.
  const rowElements = useRef(new Map<string, HTMLElement>());
  const previousPositions = useRef(new Map<string, number>());

  // When a row disappears, gently move the remaining rows into their new
  // positions. React still owns the list; this effect only animates its layout.
  useLayoutEffect(() => {
    const nextPositions = new Map<string, number>();
    const animations: Animation[] = [];

    // Measure all rows before starting animations to avoid alternating DOM
    // reads and writes. offsetTop is independent of the current scroll position.
    rowElements.current.forEach((element, id) => {
      nextPositions.set(id, element.offsetTop);
    });

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nextPositions.forEach((top, id) => {
        const previousTop = previousPositions.current.get(id);
        const element = rowElements.current.get(id);

        // New rows use the CSS entrance animation instead of a layout move.
        if (previousTop === undefined || previousTop === top || !element) return;

        animations.push(
          element.animate(
            [
              { translate: `0 ${previousTop - top}px` },
              { translate: "0 0" },
            ],
            { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
          ),
        );
      });
    }

    previousPositions.current = nextPositions;

    // Stop unfinished animations if the list updates again or unmounts.
    return () => animations.forEach((animation) => animation.cancel());
  }, [subscriptions]);

  if (isLoading && subscriptions.length === 0) {
    return (
      <section className="motion-section mt-10" role="status">
        <span className="sr-only">Loading subscriptions</span>
        {/* These placeholders reserve the list's space without suggesting
            that the user's subscriptions are missing during the request. */}
        <div aria-hidden="true">
          <div className="skeleton mb-4 h-6 w-48 rounded-lg" />
          <div className="overflow-hidden rounded-3xl bg-[#1e1f20]">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="flex items-center justify-between gap-4 border-t border-white/5 px-5 py-5 first:border-t-0 sm:px-6"
              >
                <div className="space-y-2">
                  <div className="skeleton h-5 w-28 rounded-md" />
                  <div className="skeleton h-4 w-20 rounded-md" />
                </div>
                <div className="skeleton h-5 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // An early return shows the empty view instead of rendering an empty list.
  if (subscriptions.length === 0) {
    return (
      <div className="motion-section mt-10 rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center">
        <h3 className="text-lg text-white">No subscriptions yet</h3>

        <p className="mt-2 text-sm text-[#8e918f]">
          Click Add subscription to add your first one.
        </p>
      </div>
    );
  }
  // Display the list when subscriptions exist.
  return (
    <section className="mt-10" aria-busy={isLoading}>
      {/* List heading and subscription count */}
      <div className="motion-section mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="text-lg font-medium text-white sm:text-xl">Active subscriptions</h3>

        <p className="text-sm text-[#8e918f]">
          {subscriptions.length}{" "}
          {subscriptions.length === 1 ? "subscription" : "subscriptions"}
        </p>
      </div>

      {/* Container for all subscription rows */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1e1f20]">
        {/* map returns one article per object. index starts at 0, so only
            later rows get a top border. Use the stable ID as React's key
            to track rows when items are added, removed, or reordered. */}
        {subscriptions.map((subscription, index) => (
          <article
            key={subscription.id}
            ref={(element) => {
              if (element) rowElements.current.set(subscription.id, element);
              else rowElements.current.delete(subscription.id);
            }}
            // Cap the delay so long lists never make the user wait to read them.
            style={{ "--enter-delay": `${Math.min(index, 5) * 35}ms` } as CSSProperties}
            className={`motion-row flex items-center gap-2 px-4 py-4 sm:gap-4 sm:px-6 ${
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
            <p className="shrink-0 text-right text-base text-white tabular-nums">
              ${subscription.subscriptionPrice.toFixed(2)}
              {/* Move the period below the price in narrow windows so the
                  service name and delete button still have room. */}
              <span className="block text-xs text-[#8e918f] sm:ml-1 sm:inline sm:text-sm">
                / {pricePeriods[subscription.billingFrequency]}
              </span>
            </p>

            {/* The arrow function waits for a click, then sends this row's ID.
                aria-label names the icon-only control for screen readers. */}
            <button
              type="button"
              onClick={() => onDeleteSubscription(subscription.id)}
              className="motion-button grid size-10 shrink-0 place-items-center rounded-full text-[#c4c7c5] hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
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
