# security.md

# Security

## Overview

This document defines the security architecture of the platform.

Security protects the platform against:

- unauthorized access
- broken access control
- API abuse
- data leaks
- malicious file uploads
- payment fraud
- prompt injection attacks
- denial-of-service attacks

Security principles:

- least privilege
- secure defaults
- defense in depth
- strict validation at trust boundaries
- monitoring and auditability
- explicit separation of public and private secrets

Security controls apply across:

- authentication
- authorization
- API boundaries
- storage
- payment flows
- AI integrations
- observability
- operational response

---

# Authentication

Authentication is handled by Supabase Auth.

Supported methods:

- email/password
- OAuth providers (optional)

Authentication flow:

User  
↓  
Supabase Auth  
↓  
JWT/session issued  
↓  
Protected API request authenticated  

Rules:

- protected endpoints must require authentication
- unauthenticated requests must be rejected
- authentication tokens must never be logged
- refresh tokens must be handled securely
- session expiration must be enforced
- server-side code must treat auth context as authoritative

Additional rules:

- client-side auth state is not a security boundary
- all protected server operations must re-check authenticated identity
- service-role credentials must never be exposed to the client
- OAuth redirect URLs must be explicitly whitelisted

---

# Authorization

Authorization ensures users access only resources they are allowed to access.

Primary enforcement layer:

Supabase Row Level Security (RLS)

Service-layer checks provide defense in depth.

Authorization rules:

- users may access only their own practice sessions
- users may access only their own attempts
- users may access only their own uploaded materials
- users may access only their own subscriptions
- PvP duel access is limited to duel participants

Protected tables include:

- practice_sessions
- attempts
- solution_steps
- materials
- subscriptions
- ai_hint_usage

Recommended RLS pattern:

(select auth.uid()) = user_id

Rules:

- RLS is the primary enforcement layer
- service logic must not bypass RLS unless explicitly required
- privileged operations must be isolated and audited
- RLS filter columns should be indexed

---

# Input Validation

All untrusted input must be validated at system boundaries.

Validation boundaries:

- API routes
- server actions
- webhook endpoints
- background job inputs
- file upload metadata

Examples of untrusted input:

- step_latex
- API parameters
- request bodies
- uploaded file metadata
- user-generated text
- AI prompts
- webhook payloads

Recommended controls:

- schema validation (e.g., Zod)
- strict TypeScript types
- explicit allowlists
- max size and length limits

Validation rules:

- reject malformed inputs
- reject unexpected fields
- enforce length limits
- validate numeric ranges
- validate enum values
- fail closed on invalid input

Important rule:

Client-side validation improves UX, but **server-side validation is mandatory**.

---

# File Upload Security

Users may upload learning materials.

Allowed formats:

- PDF
- plain text
- LaTeX text files

Upload controls:

- maximum file size limits
- extension allowlist
- MIME type checks
- server-side file content inspection
- optional malware scanning
- upload quotas

Security rules:

- client-provided MIME types must not be trusted alone
- validation must occur server-side
- uploaded files must use randomized storage names
- uploaded files must not be executable
- uploaded files must not be publicly accessible by default
- storage paths must never be exposed directly
- downloads must use signed URLs

Storage recommendations:

- private object storage buckets
- signed URLs for controlled access
- signed URLs should be short-lived and scoped to specific files

Processing rules:

- uploaded files must never be executed
- file parsing should occur in isolated processing flows
- raw uploaded content must not appear in logs

---

# API Security

All API endpoints must enforce consistent security protections.

Required protections:

- authentication
- authorization checks
- request validation
- request size limits
- rate limiting
- safe error handling
- request correlation IDs
- CORS restrictions

CORS rule:

Only trusted frontend origins should be allowed.

Error handling rule:

Error responses for sensitive endpoints must remain generic and must not reveal internal authorization, storage, or payment details.

Mass assignment protection:

Request payloads must map only to allowlisted fields.  
Unexpected fields must be rejected.

Sensitive endpoints include:

- AI hint generation
- material upload
- payment endpoints
- webhook endpoints
- PvP matchmaking

Rate limiting layers:

Edge layer:

- IP burst protection
- IP throttling

Application layer:

- per-user quotas
- feature usage limits
- subscription-tier enforcement

Examples:

- AI hints per day
- uploads per day
- matchmaking attempts per minute
- practice submission throttling

---

# Payment Security

Payments are handled by external providers.

Examples:

- Midtrans
- Xendit

Rules:

- raw payment credentials must never be handled by the application
- hosted checkout flows should be preferred
- payment status must come from verified provider events

Webhook security rules:

- verify webhook signature
- reject unsigned requests
- process events idempotently
- tolerate duplicate delivery

Idempotency strategy:

- store processed webhook event IDs
- ignore duplicates
- process duplicate checks atomically in a transaction

Webhook flow:

verify signature  
↓  
persist event  
↓  
check duplication  
↓  
apply state change  
↓  
acknowledge event  

---

# AI Security

AI features introduce additional attack surfaces.

Threats include:

- prompt injection
- prompt leakage
- quota abuse
- hallucinated responses
- unsafe output rendering

Security rules:

- AI must not reveal hidden prompts
- AI must not expose system instructions
- prompt context must be minimal
- user text must be treated as untrusted
- sensitive internal data must not be sent to the model

Output rules:

- AI output must be treated as untrusted data
- UI rendering must escape or sanitize AI output
- AI responses must not be trusted for authorization or billing logic

Abuse controls:

- per-user quotas
- request rate limits
- anomaly monitoring
- subscription feature gating

---

# Data Protection

Sensitive data must be protected in transit and storage.

Sensitive data includes:

- authentication tokens
- payment identifiers
- private user content
- uploaded materials
- internal secrets

Protection rules:

- HTTPS must be enforced
- sensitive values must not appear in logs
- database access must require authentication
- internal keys must remain private
- least privilege access must be enforced

Database protections:

- Supabase Row Level Security
- minimal privilege access
- restricted service role usage

Logging rules:

- redact tokens and secrets
- avoid logging raw uploaded content
- mask sensitive identifiers where possible

---

# Secrets Management

Secrets must never be hardcoded.

Secret examples:

- Supabase service role key
- AI provider API keys
- payment gateway keys
- webhook signing secrets

Secret classes:

Public client-safe values:

NEXT_PUBLIC_SUPABASE_URL  
NEXT_PUBLIC_SUPABASE_ANON_KEY  

Server-only secrets:

SUPABASE_SERVICE_ROLE_KEY  
AI_PROVIDER_API_KEY  
PAYMENT_GATEWAY_SECRET  
WEBHOOK_SIGNING_SECRET  

Rules:

- server secrets must never appear in client bundles
- secrets must not be committed to the repository
- compromised secrets must be rotated immediately
- environments must use separate credentials

---

# Abuse Protection

The system must prevent abusive behavior.

Examples:

- AI request spam
- excessive practice submissions
- upload abuse
- matchmaking spam
- webhook replay attempts

Protection mechanisms:

- IP rate limiting
- per-user quotas
- subscription-tier limits
- anomaly detection

Two enforcement layers:

Edge protection:

- IP throttling
- burst protection

Application protection:

- user quotas
- feature gating
- per-resource limits

---

# Monitoring and Alerts

Security-relevant events must be monitored.

Examples:

- repeated authentication failures
- spikes in 401/403 responses
- spikes in 429 rate limits
- suspicious upload failures
- invalid webhook signature attempts
- abnormal AI usage

Monitoring tools may include:

- Sentry
- New Relic

Alerts should notify operators when suspicious activity occurs.

---

# Dependency Security

Dependencies must be actively maintained.

Rules:

- regularly update dependencies
- monitor security advisories
- avoid abandoned libraries
- scan dependencies in CI pipelines

Tools:

- GitHub security alerts
- dependency scanners

---

# Security Incident Response

If a security incident occurs:

1. identify the issue
2. isolate affected systems
3. rotate compromised secrets
4. patch vulnerabilities
5. review logs and scope the impact
6. restore services safely
7. notify stakeholders if required
8. document incident and prevention steps

---

# Summary

Security is enforced across multiple layers:

- authentication
- RLS-based authorization
- strict boundary validation
- secure file upload handling
- API rate limiting and quotas
- payment webhook verification
- AI abuse prevention
- secrets isolation
- monitoring and incident response

These controls ensure the platform remains secure, reliable, and maintainable.
