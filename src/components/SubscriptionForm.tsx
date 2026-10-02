// useState lets this component remember the form values.
// SubmitEvent is the TypeScript type for a form submission.
import { useState, type SubmitEvent } from "react";

// Shared application data shape, also imported by DashboardPage and the list.
// TypeScript checks this shape during development; types do not validate
// database responses at runtime.
export type Subscription = {
  // A unique identifier for the subscription.
  id: string;

  // The service name, such as Netflix.
  subscriptionName: string;

  // The amount paid for the selected billing period.
  subscriptionPrice: number;

  // A union limits the allowed frequencies. Biweekly means every two weeks.
  billingFrequency: "weekly" | "biweekly" | "monthly" | "yearly";
};

// The form collects data; DashboardPage decides how to save it or close it.
// These callback props let the child notify its parent without owning the list.
type SubscriptionFormProps = {
  // Sends the completed subscription to the parent.
  onAddSubscription: (subscription: Subscription) => Promise<void>;
  // The parent tracks the save request so fields and dismissal stay disabled.
  isSaving: boolean;

  // Tells the parent that the user wants to close the form.
  onCancel: () => void;
};

// Read the callbacks and request status from the component's props.
export function SubscriptionForm({
  onAddSubscription,
  onCancel,
  isSaving,
}: SubscriptionFormProps) {
  // Each pair contains the current value and a setter that triggers a render.
  // Keep price as a string so the field can be empty while the user types.
  const [subscriptionName, setSubscriptionName] = useState("");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [submitError, setSubmitError] = useState("");
  // Indexed access reuses the union defined on Subscription above.
  const [billingFrequency, setBillingFrequency] =
    useState<Subscription["billingFrequency"]>("monthly");

  // Run this function when the user submits the form.
  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // Prevent the browser from refreshing the page.
    event.preventDefault();
    if (isSaving || isFormIncomplete) return;
    setSubmitError("");

    // Combine the input values into one Subscription object.
    const newSubscription: Subscription = {
      // Generate a unique ID.
      id: crypto.randomUUID(),

      // Remove extra spaces around the service name.
      subscriptionName: subscriptionName.trim(),

      // HTML inputs return strings, so convert the price to a number.
      subscriptionPrice: Number(subscriptionPrice),

      // Use the selected billing frequency.
      billingFrequency,
    };

    // Wait for the parent to save. Preserve the inputs if it fails; on success
    // the parent closes the modal, which resets this form when it unmounts.
    try {
      await onAddSubscription(newSubscription);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Couldn’t save this subscription. Please try again.",
      );
    }
  }

  // Disable submission for blank names/prices or a nonpositive price.
  // required, min, and step on the inputs also provide browser validation.
  const isFormIncomplete =
    subscriptionName.trim() === "" ||
    subscriptionPrice === "" ||
    !Number.isFinite(Number(subscriptionPrice)) ||
    Number(subscriptionPrice) <= 0;

  return (
    <form
      // Run handleSubmit when the form is submitted.
      onSubmit={handleSubmit}
      aria-busy={isSaving}
      className="subscription-form w-full p-6 sm:p-8"
    >
      {/* Form heading */}
      <div>
        <h2 id="add-subscription-title" className="text-2xl font-normal text-white">
          Add subscription
        </h2>
        <p className="mt-2 text-sm text-[#c4c7c5]">
          Enter your subscription details.
        </p>
      </div>

      {/* Add equal vertical spacing between the fields. */}
      <fieldset
        disabled={isSaving}
        className="subscription-form-fields mt-8 flex min-w-0 flex-col gap-6"
      >
        {/* value reads React state; onChange saves edits: a controlled input. */}
        <div>
          <label
            // Matches the input id, so clicking the label focuses the field.
            htmlFor="subscription-name"
            className="mb-2 block text-sm text-[#c4c7c5]"
          >
            Subscription
          </label>

          <input
            id="subscription-name"
            data-autofocus
            type="text"
            value={subscriptionName}
            onChange={(event) => {
              // Save the latest text in state.
              setSubscriptionName(event.target.value);
            }}
            placeholder="Netflix"
            autoComplete="off"
            required
            className="motion-field w-full rounded-xl border border-white/15 bg-[#131416] px-4 py-3 text-white outline-none placeholder:text-[#8e918f] focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20"
          />
        </div>

        {/* The price applies to the selected period, not always to a month. */}
        <div>
          <label
            htmlFor="subscription-price"
            className="mb-2 block text-sm text-[#c4c7c5]"
          >
            Subscription price
          </label>

          {/* relative allows the dollar sign to sit inside the input. */}
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8e918f]">
              $
            </span>

            <input
              id="subscription-price"
              type="number"
              value={subscriptionPrice}
              onChange={(event) => {
                // Save the latest price in state.
                setSubscriptionPrice(event.target.value);
              }}
              placeholder="30.00"
              min="0.01"
              step="0.01"
              required
              className="motion-field w-full rounded-xl border border-white/15 bg-[#131416] py-3 pl-8 pr-4 text-white outline-none placeholder:text-[#8e918f] focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20"
            />
          </div>
        </div>

        {/* The default is monthly; the select always holds one of these values. */}
        <div>
          <label
            htmlFor="billing-frequency"
            className="mb-2 block text-sm text-[#c4c7c5]"
          >
            Billing frequency
          </label>

          <div className="relative">
            <select
              id="billing-frequency"
              value={billingFrequency}
              onChange={(event) => {
                // DOM values are strings. This assertion tells TypeScript
                // the value belongs to our union because we control the options;
                // it does not perform a runtime check or convert the value.
                setBillingFrequency(
                  event.target.value as Subscription["billingFrequency"],
                );
              }}
              className="motion-field w-full appearance-none rounded-xl border border-white/15 bg-[#131416] py-3 pl-4 pr-14 text-white outline-none focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            {/* appearance-none hides the native arrow. This custom chevron
                is inset from the right; pointer-events-none keeps clicks
                on the arrow going to the select underneath. */}
            <svg
              className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-[#c4c7c5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </div>
        </div>
      </fieldset>

      {submitError && (
        <p className="motion-feedback mt-5 rounded-2xl bg-[#3c1f1f] px-4 py-3 text-sm leading-5 text-[#f2b8b5]" role="alert">
          {submitError}
        </p>
      )}

      {/* Wrap the actions when a very narrow window cannot fit both buttons. */}
      <div className="subscription-form-actions mt-8 flex flex-wrap justify-end gap-3">
        <button
          // This button closes the form without submitting it.
          type="button"
          disabled={isSaving}
          onClick={onCancel}
          className="motion-button rounded-full px-5 py-3 text-sm font-medium text-[#a8c7fa] hover:bg-[#a8c7fa]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          // This button submits the form.
          type="submit"
          disabled={isFormIncomplete || isSaving}
          className="motion-button inline-flex min-w-40 items-center justify-center gap-2 rounded-full bg-[#a8c7fa] px-5 py-3 text-sm font-medium text-[#062e6f] hover:bg-[#d3e3fd] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving && <span className="loading-spinner" aria-hidden="true" />}
          {isSaving ? "Saving…" : "Add subscription"}
        </button>
      </div>
    </form>
  );
}
