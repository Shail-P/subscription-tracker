# SubTrack

SubTrack is a desktop subscription tracker built with Electron, React, TypeScript, Tailwind CSS, Supabase, and PostgreSQL. It lets a user sign in with Google, save recurring subscriptions, see their estimated yearly cost, and remove subscriptions they no longer use.

I built this project to learn how to use Electron and understand how a desktop application can combine a React interface with native window behavior, browser-based OAuth, and a hosted PostgreSQL database.

## Demo

[![Watch the SubTrack demo on YouTube](https://img.youtube.com/vi/eRtFyRNI1ps/maxresdefault.jpg)](https://youtu.be/eRtFyRNI1ps)

**[Watch the demo on YouTube](https://youtu.be/eRtFyRNI1ps)**

## What the app does

- Signs users in through Google OAuth and Supabase Auth.
- Restores the saved session when the desktop app opens again.
- Stores each user's subscriptions in PostgreSQL.
- Supports weekly, biweekly, monthly, and yearly billing frequencies.
- Calculates an estimated annual total across all subscriptions.
- Lets users add and delete their own subscriptions.
- Uses PostgreSQL Row Level Security so users can only access their own rows.
- Provides custom Electron close, minimize, and maximize controls.
- Uses responsive layouts, loading skeletons, dialogs, focus management, and reduced-motion support.

## Technology stack

| Technology | Purpose |
| --- | --- |
| Electron | Runs the project as a native desktop application and provides OS-level window behavior. |
| React | Builds the component-based user interface. |
| TypeScript | Adds static types for component props, subscription data, and Electron APIs. |
| Vite | Runs the development server and builds the React renderer. |
| Tailwind CSS | Styles the responsive dark interface. |
| Supabase Auth | Handles Google OAuth, sessions, and authenticated users. |
| Supabase JavaScript client | Connects the React renderer to authentication and database APIs. |
| PostgreSQL | Permanently stores subscriptions. |
| Row Level Security | Restricts every database operation to the signed-in user's rows. |

## How the application works

Electron applications have more than one JavaScript environment. SubTrack separates them so the renderer never receives unrestricted access to Node.js or Electron internals.

```text
System browser
    │ Google OAuth redirect
    ▼
Electron main process ── IPC through preload ──► React renderer
       │                                           │
       │ owns the native window                    │ renders the interface
       │ handles window controls                   │ manages React state
       │ receives the local OAuth callback         │ calls the Supabase client
       │                                           │
       └───────────────────────────────────────────┤
                                                   ▼
                                        Supabase Auth + PostgreSQL
```

### Electron main process

[`electron/main.cjs`](electron/main.cjs) creates the frameless desktop window. It owns actions that require Electron privileges, including closing, minimizing, maximizing, and opening the OAuth URL in the user's normal browser.

The window starts hidden and appears after `ready-to-show`, which avoids displaying an unpainted white window during startup. During development it loads Vite from `http://localhost:5173`; a packaged build loads `dist/index.html`.

### Preload bridge

[`electron/preload.cjs`](electron/preload.cjs) is the controlled bridge between Electron and React. Context isolation is enabled and Node integration is disabled. The preload script exposes only the methods the interface needs:

- `electronWindow.close()`
- `electronWindow.minimize()`
- `electronWindow.toggleMaximize()`
- `electronAuth.openOAuth(url)`
- `electronAuth.onCallback(listener)`

This is safer than exposing the complete `ipcRenderer` or Node.js environment to the webpage.

### React renderer

[`src/main.tsx`](src/main.tsx) mounts the React application and always renders the custom title bar. `LoginPage` checks the current Supabase session and decides whether to display the Google sign-in screen or the authenticated dashboard.

`DashboardPage` owns the subscription array and all database operations. Smaller components receive data and callback functions through props:

- `SubscriptionForm` collects and validates a new subscription.
- `SubscriptionList` maps the array into visible rows.
- `AnnualSubscriptionTotal` calculates the yearly estimate.
- `DeleteConfirmationDialog` confirms deletion before the database request.
- `Modal` provides animation, Escape-key handling, focus trapping, scroll locking, and focus restoration.
- `TitleBar` provides the controls for the frameless Electron window.

### Google OAuth flow

1. The user clicks **Continue with Google**.
2. The React renderer asks Supabase for a Google OAuth URL using PKCE.
3. The preload bridge sends that URL to the Electron main process.
4. Electron starts a temporary local server on `127.0.0.1:57432` and opens the URL in the system browser.
5. Google authenticates the user and Supabase redirects the browser to `http://127.0.0.1:57432/auth/callback` with a short-lived code.
6. The Electron main process forwards the callback URL to React through IPC.
7. React exchanges the code for a Supabase session.
8. Supabase persists and refreshes the session, so the user stays signed in between launches.

### Subscription data flow

When the dashboard opens, it queries Supabase for rows whose `user_id` matches the signed-in account. Database rows use PostgreSQL `snake_case` names; React converts them to TypeScript `camelCase` objects.

```ts
type Subscription = {
  id: string;
  subscriptionName: string;
  subscriptionPrice: number;
  billingFrequency: "weekly" | "biweekly" | "monthly" | "yearly";
};
```

Adding a subscription inserts a row and uses `.select().single()` to return the saved database row. Deleting a subscription removes it by both its ID and user ID, then refetches the list from PostgreSQL so the screen reflects the database.

### Annual total calculation

[`src/components/AnnualSubscriptionTotal.tsx`](src/components/AnnualSubscriptionTotal.tsx) uses `reduce()` to add the estimated yearly cost of every subscription:

| Billing frequency | Annual multiplier |
| --- | ---: |
| Weekly | 52 |
| Biweekly | 26 |
| Monthly | 12 |
| Yearly | 1 |

For example, a `$30` monthly subscription contributes `$30 × 12 = $360` to the annual estimate.

## Database structure

The application expects a public `subscriptions` table connected to `auth.users`:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated by the application. |
| `user_id` | `uuid` | Owner of the row; references `auth.users.id`. |
| `subscription_name` | `text` | Name such as Netflix or Spotify. |
| `subscription_price` | `numeric(10, 2)` | Price for one billing period. |
| `billing_frequency` | `text` | Weekly, biweekly, monthly, or yearly. |
| `created_at` | `timestamptz` | Time the row was created. |

The following SQL creates the table, enables Row Level Security, and adds ownership policies:

```sql
create table public.subscriptions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_name text not null check (char_length(trim(subscription_name)) > 0),
  subscription_price numeric(10, 2) not null check (subscription_price > 0),
  billing_frequency text not null
    check (billing_frequency in ('weekly', 'biweekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read their own subscriptions"
on public.subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own subscriptions"
on public.subscriptions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own subscriptions"
on public.subscriptions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own subscriptions"
on public.subscriptions for delete
to authenticated
using ((select auth.uid()) = user_id);
```

## Running the project locally

### Prerequisites

- Node.js and npm
- A Supabase project
- A Google Cloud OAuth client

### 1. Clone and install

```bash
git clone https://github.com/Shail-P/subscription-tracker.git
cd subscription-tracker
npm install
```

### 2. Configure environment variables

Copy [`.env.example`](.env.example) to `.env.local` and fill in the public values from **Supabase → Project Settings → API**.

```bash
cp .env.example .env.local
```

Only use the Supabase publishable or legacy anon key in the renderer. Never put the service-role key in this project.

### 3. Create the database table

Open **Supabase → SQL Editor**, paste the SQL from the database section above, and run it.

### 4. Configure Google OAuth

1. In Google Cloud, create an OAuth 2.0 web client.
2. Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud.
3. Copy the Google client ID and client secret into **Supabase → Authentication → Sign In / Providers → Google**.
4. In **Supabase → Authentication → URL Configuration**, add `http://127.0.0.1:57432/auth/callback` as the Site URL and an allowed Redirect URL.

The Google callback points to Supabase first. Supabase then sends the completed authentication flow back to Electron's local callback server.

### 5. Start the desktop app

```bash
npm run dev
```

This starts Vite on port `5173`, waits for it to become available, and then launches Electron.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts Vite and Electron together for development. |
| `npm run build` | Type-checks the application and builds the React renderer into `dist`. |
| `npm run preview` | Previews the built renderer in a browser. |

An installer/package script has not been configured yet. The current build command creates the renderer assets Electron can load in packaged mode.

## Project structure

```text
subscriptiontracker/
├── electron/
│   ├── main.cjs                   # Window, IPC, OAuth callback server
│   └── preload.cjs                # Safe bridge exposed to React
├── src/
│   ├── components/
│   │   ├── AnnualSubscriptionTotal.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── DeleteConfirmationDialog.tsx
│   │   ├── LoginPage.tsx
│   │   ├── Modal.tsx
│   │   ├── SubscriptionForm.tsx
│   │   ├── subscriptionList.tsx
│   │   └── TitleBar.tsx
│   ├── lib/
│   │   └── supabase.ts            # Supabase client and PKCE settings
│   ├── electron.d.ts              # Types for preload APIs on window
│   ├── main.tsx                   # React entry point
│   └── styles.css                 # Tailwind, theme, and motion styles
├── index.html
├── package.json
├── tsconfig.app.json
└── vite.config.ts
```

## Security decisions

- Node integration is disabled in the renderer.
- Electron context isolation is enabled.
- Preload exposes a small, typed API instead of the complete IPC interface.
- OAuth URLs are validated before Electron opens them.
- The OAuth callback server listens only on the local loopback interface.
- Secrets and local environment files are excluded through `.gitignore`.
- PostgreSQL Row Level Security protects data even if a client request is modified.
- Every delete query includes both the subscription ID and current user ID.

## What I learned

Building SubTrack helped me learn:

- how Electron's main, preload, and renderer processes work together;
- how to call native desktop actions safely through IPC;
- how React state, props, callbacks, forms, and list rendering fit together;
- how to model and query relational data with PostgreSQL and Supabase;
- how Google OAuth with PKCE returns from a browser to a desktop app;
- why authentication and database authorization are separate concerns;
- how Row Level Security protects multi-user data;
- how TypeScript describes component contracts and application data;
- how responsive layouts, keyboard focus, loading states, and reduced motion improve a desktop interface.

## Current scope

SubTrack intentionally stays focused on the core learning experience: authentication and subscription CRUD. It currently assumes USD, estimates a year as 52 weekly payments or 26 biweekly payments, and does not yet ship with an installer or renewal notifications.
