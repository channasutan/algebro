observability.md

Observability

Overview

This document defines the observability strategy for the platform.

Observability enables monitoring, debugging, and analyzing system behavior in production.

The system collects telemetry for:

- application behavior
- API performance
- event processing
- background jobs
- AI usage
- user activity
- database performance

Observability ensures:

- fast debugging of production issues
- detection of system failures
- monitoring of AI costs
- performance optimization
- operational reliability

---

Observability Stack

The platform uses the following observability tools:

New Relic

Used for:

- metrics
- distributed tracing
- performance monitoring
- dashboards
- infrastructure monitoring

Sentry

Used for:

- application errors
- backend exceptions
- frontend errors
- stack traces
- error aggregation

Supabase

Used for:

- database query logs
- authentication logs
- connection errors

---

Observability Signals

The platform collects the following signals:

logs
metrics
traces
events
alerts

These signals provide full visibility into system behavior.

---

Logging

All services must emit structured logs.

Log format:

{
  "timestamp": "2026-03-11T10:30:00Z",
  "level": "info",
  "service": "practice-engine",
  "message": "practice session started",
  "user_id": "uuid",
  "request_id": "req_123"
}

Log levels:

Level| Description
debug| development debugging
info| normal operations
warn| recoverable issues
error| failed operations
fatal| critical failures

Logging rules:

- logs must be structured JSON
- logs must include request_id
- logs must include module/service name
- sensitive data must never be logged

Examples:

practice session started
step validated
AI hint generated
material uploaded
duel started
subscription updated

---

Metrics

Metrics track quantitative system performance.

Metrics are collected through New Relic.

Key metrics:

Metric| Description
api_request_latency_ms| API response latency
api_error_rate| failed request percentage
active_users| concurrent users
ai_requests_total| number of AI calls
ai_tokens_used_total| token usage
event_processing_latency_ms| event handler latency
job_queue_length| number of pending jobs
validation_latency_ms| step validation time

Example metric names:

practice_step_validation_latency_ms
ai_hint_generation_latency_ms
event_handler_execution_latency_ms

Metrics are used for:

- dashboards
- alert thresholds
- performance monitoring

---

Distributed Tracing

Distributed tracing tracks request execution across modules.

Tracing is implemented using New Relic.

Example request flow:

User request
↓
API Route
↓
Practice Engine
↓
Step Validation Engine
↓
AI Tutor
↓
Database

Each request must include:

request_id
correlation_id

Trace spans may include:

practice.start_session
validation.validate_step
ai.generate_hint

Tracing enables:

- latency bottleneck detection
- workflow debugging
- performance optimization

---

Event Monitoring

Domain events must be observable.

Each event publication records:

event_id
event_type
source
occurred_at
correlation_id

Event handler logs record:

handler_name
handler_status
latency_ms
retry_count

Event metrics include:

Metric| Description
events_published_total| total events emitted
events_processed_total| successful handler executions
event_handler_failures| failed handlers
event_processing_latency| handler execution time

Important events to monitor:

attempt_completed
material_processed
duel_finished
subscription_updated

---

Background Job Monitoring

Background jobs process asynchronous workflows.

Examples:

material extraction
AI problem generation
analytics aggregation

Each job execution records:

job_id
job_type
status
attempt_count
latency_ms

Job states:

pending
running
completed
failed
retrying

Important metrics:

Metric| Description
job_queue_length| pending job count
job_failure_rate| failed job percentage
job_execution_latency| job runtime

Alerts should trigger if:

job failures spike
queue backlog grows rapidly
job execution latency increases

---

AI Monitoring

AI usage must be monitored carefully due to cost and reliability.

Metrics tracked:

AI requests
AI latency
token usage
AI errors
quota usage

Example metrics:

ai_hint_requests_total
ai_tokens_used_total
ai_latency_ms
ai_error_rate

AI telemetry fields:

Field| Description
model_name| AI model used
tokens_input| prompt tokens
tokens_output| response tokens
latency_ms| request latency

AI monitoring helps detect:

cost spikes
model failures
slow responses
quota abuse

---

Error Monitoring

Application errors are tracked with Sentry.

Error reports must include:

error_code
error_message
stack_trace
request_id
user_id

Examples:

STEP_VALIDATION_ERROR
AI_HINT_FAILURE
MATERIAL_PROCESSING_ERROR
PAYMENT_WEBHOOK_FAILURE

Error dashboards track:

Metric| Description
error_rate| errors per request
critical_errors| production incidents
repeated_failures| recurring issues

---

Alerting

Alerts notify operators when system health degrades.

Alert triggers:

Condition| Alert
API error spike| system failure
AI request failures| AI service outage
event handler failures| event processing issue
job queue backlog| worker failure
API latency spike| performance degradation

Alerts should be delivered to:

Slack
email
incident management system

Alert levels:

info
warning
critical

---

Dashboards

Dashboards visualize system health.

Recommended dashboards:

API performance dashboard
AI usage dashboard
event processing dashboard
background job dashboard
user activity dashboard

Example panels:

requests per minute
error rate
AI cost per day
event throughput
job queue size

---

Data Retention

Observability data must follow retention policies.

Data| Retention
logs| 30 days
metrics| 90 days
traces| 7 days
AI metrics| 90 days
error reports| 90 days

Retention balances:

debugging capability
storage cost
compliance requirements

---

Security Considerations

Observability systems must protect sensitive data.

Rules:

never log authentication tokens
never log user passwords
never log payment information
never log raw uploaded files

Sensitive fields must be redacted.

Example:

user_email → masked
token → redacted

---

Summary

Observability provides full visibility into system health.

Signals collected:

logs
metrics
traces
events
AI telemetry
alerts

Tools used:

New Relic → metrics, tracing, dashboards
Sentry → error tracking
Supabase → database logs

This observability strategy ensures:

- fast debugging
- performance monitoring
- AI cost control
- reliable production operations
