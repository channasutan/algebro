# Practice Generation

## Overview

This document defines how the platform generates practice problems.

The practice generation system is responsible for:

- selecting appropriate problem types
- generating randomized parameters
- ensuring problems are solvable
- matching difficulty to user skill
- preventing duplicate problems

---

# Generation Sources

Problems may originate from three sources.

## Template Generation (Primary)

Most problems are generated from mathematical templates.

Example template:

ax + b = 0

Randomized examples:

2x + 6 = 0  
3x - 9 = 0  

---

## Problem Pool

Previously generated problems may be reused.

Benefits:

- faster response time
- reproducible problems
- difficulty balancing

Problems in the pool are validated and stored.

---

## AI-Augmented Generation (Optional)

LLMs may generate:

- story problems
- word problems
- contextual variations
- explanations

Important rule:

AI output must **never** be trusted as mathematical truth.

All generated math must be validated symbolically.

---

# Generation Pipeline

The generation pipeline:

problem request  
↓  
curriculum engine selects topic  
↓  
problem generator selects template  
↓  
parameters randomized  
↓  
symbolic validation  
↓  
problem stored in pool  
↓  
practice session created  

---

# Parameter Randomization

Each template defines parameter constraints.

Example template:

ax + b = 0

Constraints:

a ∈ [-10,10], a ≠ 0  
b ∈ [-20,20]

Example generated problem:

4x - 8 = 0  

---

# Solvability Validation

Every generated problem must pass symbolic validation.

Validation methods include:

- symbolic solving
- expression equivalence checking
- derivative verification
- integral verification

Tools used:

SymPy (server side)  
CortexJS (client side)

---

# Duplicate Prevention

The system should avoid sending identical problems to the same user.

Strategy:

hash(problem_template + parameters)

Hashes are stored per user to prevent repetition.

---

# Difficulty Matching

The curriculum engine selects difficulty based on mastery level.

Example:

mastery < 0.3 → easy  
mastery < 0.7 → medium  
mastery ≥ 0.7 → hard  

Difficulty affects parameter ranges and step complexity.

---

# Practice Session Flow

User starts practice  
↓  
Practice engine requests problem  
↓  
Problem generator creates problem  
↓  
Problem sent to client  
↓  
User submits steps  
↓  
Step validation engine verifies each step  

---

# Future Improvements

Future enhancements may include:

- AI-generated olympiad problems
- adaptive difficulty tuning
- topic mixing strategies
- challenge modes
- PvP problem sets

---

# Summary

Practice generation combines:

- problem templates
- parameter randomization
- symbolic validation
- difficulty adaptation

This ensures problems are:

- solvable
- unique
- appropriate for the learner
