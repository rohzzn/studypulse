# StudyPulse

StudyPulse is a clean, modern clinical trial product concept for the Medpace sponsor challenge at RevolutionUC 2026. The repo now includes:

- an Expo mobile app for the patient flow
- a separate authenticated web portal for both patients and clinicians
- one shared Supabase database for studies, applications, requests, and status updates

## What is inside

- A polished Expo mobile experience for the patient workflow
- A separate Vite + React web portal in `web/` with dark mode, light mode, login, patient views, and clinician dashboards
- A Supabase client that uses Expo SQLite-backed `localStorage` for session persistence
- A starter Supabase schema with seed data plus auth-linked profile support

## Stack

- Expo SDK 54
- React Native 0.81
- Vite + React 19 for the web portal
- Supabase JavaScript client
- Expo SQLite local storage polyfill
- Expo Linear Gradient for the hero and action surfaces

## Local setup

1. Install Node.js 20.19.x or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and publishable key.
5. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
6. Start the mobile app with `npm run start`.

## Web portal setup

1. Go to `web/`.
2. Copy `web/.env.example` to `web/.env`.
3. Use the same Supabase URL and publishable key as the mobile app.
4. Install web dependencies with `npm run web:install`.
5. Start the site with `npm run web:dev`.

You can also build the site with `npm run web:build`.

If the Expo `.env` is missing, the mobile app automatically falls back to demo mode so you can still present the concept.

## Supabase notes

The schema now adds auth-linked `profiles`, clinician account provisioning, and shared patient applications. RLS is still intentionally open in several places for hackathon speed; before shipping, tighten policies around role-based access and remove open write access.
