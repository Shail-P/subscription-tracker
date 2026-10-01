// useState lets this component remember the form values.
// SubmitEvent is the TypeScript type for a form submission.
import { useState, type SubmitEvent } from "react";

// This type describes one complete subscription.
export type Subscription = {
  // A unique identifier for the subscription.
  id: string;

  // The service name, such as Netflix.
  subscriptionName: string;

  // The amount paid every month.
  subscriptionPrice: number;

  // The date when the subscription renews.
  renewalDate: string;
};

// These are the functions the parent must give to SubscriptionForm.
type SubscriptionFormProps = {
  // Sends the completed subscription to the parent.
  onAddSubscription: (subscription: Subscription) => void;

  // Tells the parent that the user wants to close the form.
  onCancel: () => void;
};

// Destructure both functions from the component's props.
export function SubscriptionForm({
  onAddSubscription,
  onCancel,
}: SubscriptionFormProps) {
  // Store the current value of each input.
  const [subscriptionName, setSubscriptionName] = useState("");
  const [subscriptionPrice, setSubscriptionPrice] = useState("");
  const [renewalDate, setRenewalDate] = useState("");

  // Run this function when the user submits the form.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    // Prevent the browser from refreshing the page.
    event.preventDefault();

    // Combine the input values into one Subscription object.
    const newSubscription: Subscription = {
      // Generate a unique ID.
      id: crypto.randomUUID(),

      // Remove extra spaces around the service name.
      subscriptionName: subscriptionName.trim(),

      // HTML inputs return strings, so convert the price to a number.
      subscriptionPrice: Number(subscriptionPrice),

      // Use the selected date.
      renewalDate,
    };

    // Send the finished object to the parent component.
    onAddSubscription(newSubscription);

    // Clear the form after submission.
    setSubscriptionName("");
    setSubscriptionPrice("");
    setRenewalDate("");
  }

  // Keep the submit button disabled until every value is valid.
  const isFormIncomplete =
    subscriptionName.trim() === "" ||
    subscriptionPrice === "" ||
    Number(subscriptionPrice) <= 0 ||
    renewalDate === "";

  return (
    <form
      // Run handleSubmit when the form is submitted.
      onSubmit={handleSubmit}
      className="w-full max-w-lg rounded-3xl bg-[#1e1f20] p-6 shadow-2xl sm:p-8"
    >
      {/* Form heading */}
      <div>
        <h2 className="text-2xl font-normal text-white">Add subscription</h2>
        <p className="mt-2 text-sm text-[#c4c7c5]">
          Enter your subscription details.
        </p>
      </div>

      {/* Add equal vertical spacing between the fields. */}
      <div className="mt-8 space-y-6">
        {/* Subscription name field */}
        <div>
          <label
            htmlFor="subscription-name"
            className="mb-2 block text-sm text-[#c4c7c5]"
          >
            Subscription
          </label>

          <input
            id="subscription-name"
            type="text"
            value={subscriptionName}
            onChange={(event) => {
              // Save the latest text in state.
              setSubscriptionName(event.target.value);
            }}
            placeholder="Netflix"
            autoComplete="off"
            required
            className="w-full rounded-xl border border-white/15 bg-[#131416] px-4 py-3 text-white outline-none transition placeholder:text-[#8e918f] focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20"
          />
        </div>

        {/* Monthly price field */}
        <div>
          <label
            htmlFor="subscription-price"
            className="mb-2 block text-sm text-[#c4c7c5]"
          >
            Monthly price
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
              className="w-full rounded-xl border border-white/15 bg-[#131416] py-3 pl-8 pr-4 text-white outline-none transition placeholder:text-[#8e918f] focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20"
            />
          </div>
        </div>

        {/* Renewal date field */}
        <div>
          <label
            htmlFor="renewal-date"
            className="mb-2 block text-sm text-[#c4c7c5]"
          >
            Renewal date
          </label>

          <input
            id="renewal-date"
            type="date"
            value={renewalDate}
            onChange={(event) => {
              // Save the selected date in state.
              setRenewalDate(event.target.value);
            }}
            required
            className="w-full rounded-xl border border-white/15 bg-[#131416] px-4 py-3 text-white outline-none transition focus:border-[#a8c7fa] focus:ring-2 focus:ring-[#a8c7fa]/20"
          />
        </div>
      </div>

      {/* Form buttons */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          // This button closes the form without submitting it.
          type="button"
          onClick={onCancel}
          className="rounded-full px-5 py-3 text-sm font-medium text-[#a8c7fa] transition hover:bg-[#a8c7fa]/10"
        >
          Cancel
        </button>

        <button
          // This button submits the form.
          type="submit"
          disabled={isFormIncomplete}
          className="rounded-full bg-[#a8c7fa] px-5 py-3 text-sm font-medium text-[#062e6f] transition hover:bg-[#d3e3fd] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add subscription
        </button>
      </div>
    </form>
  );
}
