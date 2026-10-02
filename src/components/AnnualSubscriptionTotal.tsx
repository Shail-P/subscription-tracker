import type { Subscription } from "./SubscriptionForm";

type AnnualSubscriptionTotalProps = {
  subscriptions: Subscription[];
  isLoading?: boolean;
};

// Each multiplier converts one billing payment into its estimated yearly cost.
// For example, a $10 monthly subscription contributes $10 × 12 = $120.
const paymentsPerYear: Record<Subscription["billingFrequency"], number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  yearly: 1,
};

// Keep currency formatting in one place instead of manually adding commas.
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// This component only calculates and displays a value. DashboardPage continues
// to own the subscriptions and all Supabase requests.
export function AnnualSubscriptionTotal({
  subscriptions,
  isLoading = false,
}: AnnualSubscriptionTotalProps) {
  // reduce visits every subscription and adds its yearly cost to the running
  // total. The 0 is the starting value before the first item is processed.
  const annualTotal = subscriptions.reduce((total, subscription) => {
    const yearlyCost =
      subscription.subscriptionPrice *
      paymentsPerYear[subscription.billingFrequency];

    return total + yearlyCost;
  }, 0);

  return (
    <section
      className="motion-section mt-10 rounded-3xl bg-[#1e1f20] px-6 py-6 sm:px-8"
      aria-labelledby="annual-total-heading"
      aria-busy={isLoading}
    >
      <p
        id="annual-total-heading"
        className="text-sm font-medium text-[#c4c7c5]"
      >
        Estimated yearly total
      </p>

      {isLoading && subscriptions.length === 0 ? (
        // Match the final number's space while the first database query runs.
        <div
          className="skeleton mt-3 h-10 w-40 rounded-lg"
          aria-label="Calculating yearly total"
        />
      ) : (
        <p className="mt-2 text-3xl font-normal tracking-tight text-white tabular-nums sm:text-4xl">
          {currencyFormatter.format(annualTotal)}
          <span className="ml-2 text-sm text-[#8e918f]">per year</span>
        </p>
      )}
    </section>
  );
}
