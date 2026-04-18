# UI Foundation

This document defines the first-pass frontend foundation for `wumbo-ui`.

## Goals

- establish the long-term frontend baseline
- keep the first product surface intentionally small
- preserve the Cognito browser flow
- create a strong starting point for a rich component library

## First-Pass Decisions

- Next.js 16 App Router
- TypeScript in strict mode
- Tailwind CSS 4 for styling and design tokens
- Storybook 9 for component documentation
- Radix UI primitives for accessibility-oriented composition
- no Redux
- no route groups
- minimal Route Handlers limited to auth

## Routing Conventions

- use straightforward route folders under `src/app`
- avoid route groups until there is a clear layout partitioning need
- keep auth handlers under `src/app/api/auth/*` for now to preserve the current Cognito callback shape

## Rendering Conventions

- default to Server Components
- use Client Components only for interactive leaves
- prefer local component state over global client state
- introduce Server Actions when real product mutations arrive

## API Boundary

`wumbo-ui` is not defining the final `wumbo-core` access pattern in this pass.

Current boundary:

- `wumbo-ui` owns browser-facing auth/session flow
- `wumbo-core` owns domain logic and authorization

That means:

- Cognito sign-in/sign-up redirects start in `wumbo-ui`
- OAuth callback and cookie session handling stay in `wumbo-ui`
- Cognito PostConfirmation lives in `wumbo-identity`
- `wumbo-core` projects users asynchronously from identity events

## Component Library Conventions

- `src/components/ui` contains reusable base primitives
- primitives should be app-agnostic and story-driven
- component variants should use `class-variance-authority`
- class merging should go through a shared `cn` helper
- accessibility should come from semantic HTML first, with Radix where it adds value

## What Comes Later

- final `wumbo-core` access pattern
- domain screens and workflows
- richer composite components
- broader test coverage and visual regression strategy
