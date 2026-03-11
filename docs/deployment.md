# deployment.md

# Deployment Strategy

## Overview

This document describes how the platform is deployed to production.

Deployment includes:

- application build process
- environment configuration
- database migrations
- release safety checks
- rollback procedures

The platform uses automated deployments through Vercel.

---

# Infrastructure Overview

The platform runs on the following infrastructure.

Frontend & API

- Next.js (App Router)

Hosting

- Vercel

Database

- Supabase (PostgreSQL)

Object Storage

- Supabase Storage

Monitoring

- Sentry
- New Relic

External Services

- AI provider APIs
- Payment gateways (Midtrans / Xendit)

---

# Deployment Environments

The platform uses three environments.

## Development

Used for local development.

Components:

- local Next.js server
- optional Supabase local environment
- mocked external APIs

Example command:

npm run dev

---

## Preview / Staging

Preview environments are created automatically for pull requests.

Purpose:

- preview new features
- verify UI changes
- test functionality before merging

Preview deployments run on Vercel and use preview environment variables.

---

## Production

Production is the live environment used by real users.

Characteristics:

- production Supabase project
- production Vercel deployment
- production payment gateways
- production monitoring

Production deployments are triggered from the `main` branch.

---

# Deployment Workflow

Typical release flow:

Developer pushes code  
↓  
Pull request created  
↓  
Vercel preview deployment generated  
↓  
Feature tested in preview environment  
↓  
Pull request merged to `main`  
↓  
Vercel production deployment triggered  

---

# Build Process

The build process includes:

- dependency installation
- TypeScript compilation
- Next.js build
- asset bundling
- serverless function packaging

Example command:

npm run build

Build failures must block deployment.

---

# Environment Variables

Environment variables are configured through Vercel.

Examples:

Public variables:

NEXT_PUBLIC_SUPABASE_URL  
NEXT_PUBLIC_SUPABASE_ANON_KEY  

Server-only variables:

SUPABASE_SERVICE_ROLE_KEY  
AI_PROVIDER_API_KEY  
PAYMENT_GATEWAY_SECRET  
WEBHOOK_SIGNING_SECRET  

Rules:

- secrets must never be committed to the repository
- production secrets must differ from preview secrets
- server-only secrets must never be exposed to the client

---

# Database Migrations

Database schema changes must use migration files.

Migration workflow:

Developer creates migration  
↓  
Migration committed to repository  
↓  
Migration applied to staging environment  
↓  
Migration verified  
↓  
Migration applied to production

Tools:

- Supabase CLI
- SQL migration files

Rules:

- migrations must be reviewed
- destructive migrations must be planned carefully
- migrations must be reproducible

---

# Pre-Deployment Checks

Before merging to production, developers should run:

npm run lint  
npm run test  
npm run build  

These checks ensure:

- code quality
- test stability
- successful build

---

# Rollback Strategy

If a deployment causes issues, rollback options exist.

Application rollback:

- redeploy previous Vercel build

Database rollback:

- apply reverse migration
- restore database backup if required

Emergency rollback steps:

1. revert problematic commit
2. redeploy previous version
3. verify system health
4. investigate root cause

---

# Deployment Safety Rules

Production safety rules include:

- database migrations must be reviewed
- risky features should use feature flags
- monitoring must be active before deployment
- secrets must never be exposed in logs

Feature flags are recommended for:

- AI features
- billing features
- PvP gameplay
- experimental functionality

---

# Monitoring After Deployment

After deployment, system health must be monitored.

Key signals include:

- error rates
- API latency
- database performance
- AI provider failures
- payment webhook errors

Monitoring tools include:

- Sentry
- New Relic

Alerts should notify operators when critical issues occur.

---

# Secrets and Security

Deployment systems must handle secrets securely.

Rules:

- secrets must be stored in Vercel environment settings
- secrets must not appear in logs
- access to deployment settings must be restricted

---

# Summary

The platform uses automated deployments through Vercel.

Key principles:

- preview deployments for pull requests
- automated builds
- controlled database migrations
- secure environment variable management
- monitoring after release

This strategy enables fast and reliable releases while keeping production safe.
