# Database Architecture

## Overview

This document defines the database architecture of the platform.

The system uses:

- Supabase PostgreSQL
- Row Level Security (RLS)
- module-based table ownership
- migration-based schema management

The database acts as the **single source of truth** for all persistent data.

All schema changes must be performed through migrations.

---

# Design Principles

## Module Ownership

Each module owns its own tables.

Modules must **not directly access tables owned by other modules**.

Interaction between modules must happen through:

- module services
- domain events

Example:

Practice module owns:

practice_sessions  
attempts  
solution_steps  

Billing module owns:

subscriptions  
payments  

---

## Row Level Security (RLS)

Row Level Security is the primary authorization layer.

Example policy:

auth.uid() = user_id

Tables that contain user data must enforce RLS.

Examples:

practice_sessions  
attempts  
materials  
subscriptions  

---

## Least Privilege Access

Database access must follow least privilege rules.

Client applications use:

NEXT_PUBLIC_SUPABASE_ANON_KEY

Server-side services use:

SUPABASE_SERVICE_ROLE_KEY

The service role must **never be exposed to the client**.

---

# Database Structure

The database is organized around platform modules.

Each module owns a set of tables.

## Practice Module

practice_sessions  
attempts  
solution_steps  

## Problem Generation

problem_templates  
problem_pool  

## Curriculum

user_mastery  
learning_progress  

## Material Processing

materials  
material_topics  

## Gamification

xp_events  
leaderboard  

## PvP Duel

duels  
duel_answers  

## Billing

subscriptions  
payments  

---

# Naming Conventions

Tables use **plural snake_case**.

Examples:

practice_sessions  
solution_steps  
problem_templates  

Columns use **snake_case**.

Examples:

user_id  
problem_id  
created_at  

Primary keys:

id uuid primary key

Foreign keys:

{entity}_id

Example:

user_id  
problem_id  

---

# Indexing Strategy

Indexes must exist for:

- foreign keys
- RLS filter columns
- frequently queried fields

Examples:

index on user_id  
index on problem_id  
index on topic_id  

Indexes ensure fast queries for:

- user practice sessions
- curriculum recommendations
- leaderboard queries

---

# Migration Strategy

All database changes must use migrations.

Migration files are stored in:

supabase/migrations/

Migration workflow:

developer creates migration  
↓  
migration committed to repository  
↓  
migration applied to staging  
↓  
migration applied to production  

Destructive migrations must be carefully reviewed.

---

# Data Integrity

Data integrity is enforced through:

- foreign key constraints
- NOT NULL constraints
- application-level validation

Examples:

attempt must reference a valid practice_session  

solution_step must reference a valid attempt  

---

# Soft Deletes

Some records may use soft deletion.

Example column:

deleted_at timestamp

This allows recovery and audit tracking.

---

# Observability

Database activity should be observable.

Monitoring includes:

- query latency
- slow queries
- error rates

Monitoring tools:

- New Relic
- Supabase query insights

---

# Backup Strategy

Backups are handled by Supabase.

Backup policies include:

- automated daily backups
- point-in-time recovery

Production databases must enable automated backups.

---

# Security Considerations

Sensitive data must be protected.

Rules:

- enforce RLS on user data
- avoid logging sensitive values
- never expose service role keys

Examples of sensitive data:

authentication tokens  
payment identifiers  
private user content  

---

# Summary

The database architecture follows a modular design.

Key characteristics:

- module-owned tables
- RLS-based authorization
- migration-driven schema management
- strong indexing strategy
- strict security rules

This ensures the platform remains:

- secure
- scalable
- maintainable
