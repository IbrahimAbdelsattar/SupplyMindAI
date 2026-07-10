# SupplyMind Agencies (Next.js Sub-project)

This is the legacy Next.js prototype app, separate from the main `frontend/` Vite app.

## Tech Stack
- Next.js (Clerk auth, React, Tailwind)
- Clerk (`@clerk/nextjs`) for auth
- `proxy.ts` uses `clerkMiddleware`
- Layout includes `<ClerkProvider>`, `<SignInButton>`, `<SignUpButton>`, `<UserButton>`
- Sign-in at `/sign-in/[[...sign-in]]`, sign-up at `/sign-up/[[...sign-up]]`

See `D:\SupplyMindAI\frontend\` for the current production app.
