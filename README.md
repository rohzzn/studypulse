# StudyPulse

StudyPulse is a clean, modern Expo React Native concept for the Medpace sponsor challenge at RevolutionUC 2026. It focuses on the clinical trial experience from both sides: participants stay on track with medication, visits, and daily check-ins, while coordinators get a lightweight signal board for adherence risks and follow-up.

## What is inside

- A polished four-screen mobile experience built with Expo and TypeScript
- A Supabase client that uses Expo SQLite-backed `localStorage` for session persistence
- Demo-ready fallback data, so the UI still works before you connect a real Supabase project
- A starter Supabase schema with seed data tailored to the app concept

## Stack

- Expo SDK 54
- React Native 0.81
- Supabase JavaScript client
- Expo SQLite local storage polyfill
- Expo Linear Gradient for the hero and action surfaces

## Local setup

1. Install Node.js 20.19.x or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your Supabase project URL and publishable key.
5. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
6. Start the app with `npm run start`.

If `.env` is missing, the app automatically falls back to demo mode so you can still present the concept.

## Supabase notes

The schema intentionally keeps policies open for a hackathon demo. Before shipping a real product, tighten RLS policies around authenticated users, study membership, and role-based access.
