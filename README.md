# AI Math Practice Platform

An AI-powered mathematics learning platform that enables students to solve problems step-by-step while receiving intelligent guidance and feedback.

The platform focuses on **conceptual understanding**, **step-by-step validation**, and **adaptive practice generation**.

---

# Core Features

## Step-by-Step Problem Solving

Students solve math problems step-by-step instead of submitting only final answers.

Each step is validated by a deterministic math engine to ensure correctness.

## AI Tutor

An integrated AI tutor can:

- generate hints
- explain concepts
- guide students toward the next step

AI assists learning but **does not replace deterministic validation**.

## Adaptive Practice Generation

Practice problems can be generated from:

- predefined curriculum topics
- uploaded learning materials
- AI-assisted problem generation

## Material-Based Learning

Students can upload learning materials such as:

- PDF textbooks
- notes
- LaTeX documents

The system extracts topics and generates practice questions.

## Competitive PvP Mode

Students can compete with other learners in real-time math duels.

---

# Architecture Overview

The system follows a modular architecture designed for reliability and scalability.

Core subsystems:

Frontend (Next.js)  
↓  
API Layer  
↓  
Practice Engine  
↓  
Step Validation Engine  
↓  
AI Tutor System  
↓  
Supabase Database  

Deterministic validation always runs before AI assistance.

---

# Tech Stack

## Frontend

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- TanStack Query

## Backend

- Next.js API routes
- Supabase (PostgreSQL + Auth + Storage)

## AI

- External LLM provider APIs

## Infrastructure

- Vercel
- Supabase
- Sentry
- New Relic

---

# Project Structure

app/  
Next.js routes

components/  
Reusable UI components

features/  
Feature modules

hooks/  
Custom React hooks

lib/  
Utilities and API clients

docs/  
Engineering documentation

---

# Documentation

Engineering documentation is located in the `docs` folder.

Key documents include:

architecture.md  
system-flow.md  
data-model.md  
api-contracts.md  
event-contracts.md  
ai-architecture.md  
step-validation.md  
security.md  
deployment.md  
testing-strategy.md  

---

# Running Locally

Install dependencies:

npm install

Start development server:

npm run dev

The application will start on:

http://localhost:3000

---

# Environment Variables

Required environment variables include:

NEXT_PUBLIC_SUPABASE_URL  
NEXT_PUBLIC_SUPABASE_ANON_KEY  

SUPABASE_SERVICE_ROLE_KEY  
AI_PROVIDER_API_KEY  
PAYMENT_GATEWAY_SECRET  
WEBHOOK_SIGNING_SECRET  

Secrets must never be committed to the repository.

Environment variables should be configured in the hosting platform (e.g. Vercel).

---

# Database

The platform uses **Supabase PostgreSQL**.

Core tables include:

users  
practice_sessions  
attempts  
solution_steps  
problems  
materials  
subscriptions  
duels  
ai_usage_logs  

Row Level Security (RLS) ensures users can only access their own data.

---

# Testing

Testing includes multiple layers:

- unit tests
- integration tests
- end-to-end tests

Tools used:

- Vitest
- Playwright
- TestSprite

Run tests:

npm run test

---

# Deployment

The platform is deployed using **Vercel**.

Deployment flow:

Developer pushes code  
↓  
Vercel builds the project  
↓  
Preview deployment created  
↓  
Merge to main branch  
↓  
Production deployment

Database migrations are managed using **Supabase CLI**.

---

# Security

Key security measures include:

- Supabase authentication
- Row Level Security (RLS)
- strict API validation
- rate limiting
- secure file uploads
- AI prompt safety

More details are documented in:

docs/security.md

---

# License

This project is currently private and under development.
