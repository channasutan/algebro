# llm-prompt-spec.md

# LLM Prompt Specification

## Overview

This document defines how Large Language Models (LLMs) are used inside the platform.

LLMs are used for:

- AI tutoring
- reasoning validation
- olympiad problem generation
- story problem generation
- material topic extraction

The system uses a **controlled prompt design** to ensure:

- consistent outputs
- safe tutoring behavior
- structured responses
- predictable integrations with system modules

Primary model:

```
Gemini Flash
```

Future models may include:

```
OpenAI
Claude
local LLMs
```

---

# Core LLM Usage Rules

LLMs must follow strict behavioral constraints.

Rules:

1. LLM must **never reveal final answers directly**.
2. LLM must guide reasoning rather than solve the problem.
3. LLM responses must follow **structured JSON output when required**.
4. LLM must rely on **problem context + validation output**.
5. LLM must avoid hallucinating mathematical transformations.

---

# LLM Roles in the System

The platform uses LLMs in five roles.

| Role | Module |
|-----|-----|
| AI Tutor | AI Tutor |
| Reasoning Validator | Step Validation Engine |
| Olympiad Problem Generator | Problem Generator |
| Story Generator | Problem Generator |
| Material Topic Extractor | Material Processing |

---

# 1. AI Tutor Prompt

Used when students submit an incorrect step.

Goal:

Explain the mistake without revealing the final answer.

Input:

```
problem
previous_step
student_step
error_type
```

Prompt template:

```
You are a mathematics tutor.

Your goal is to help the student understand their mistake.

Problem:
{problem}

Previous step:
{previous_step}

Student step:
{student_step}

Detected error:
{error_type}

Instructions:

Explain why the student's step is incorrect.
Provide guidance on how to think about the next step.
Do NOT reveal the final answer.
Do NOT solve the entire problem.
```

Expected response:

```
explanation
hint
suggested_direction
```

---

# 2. Reasoning Validation Prompt

Used for olympiad-style problems where symbolic validation is insufficient.

Goal:

Determine if a reasoning step is logically valid.

Input:

```
problem
previous_step
student_step
```

Prompt template:

```
You are a mathematical proof validator.

Problem:
{problem}

Previous step:
{previous_step}

Student step:
{student_step}

Determine whether the student's step logically follows.

Return JSON:

{
  "is_valid": true/false,
  "error_type": "...",
  "explanation": "..."
}
```

Important:

The validator must **only check logical correctness**.

It must not continue solving the problem.

---

# 3. Olympiad Problem Generation Prompt

Used to generate high-difficulty reasoning problems.

Prompt template:

```
Generate a challenging olympiad-level math problem.

Constraints:

- algebra or number theory
- difficulty: high school olympiad
- solvable without advanced university mathematics
- requires reasoning, not brute computation

Output JSON:

{
  "problem_text": "...",
  "topic": "...",
  "difficulty": 5,
  "solution_outline": "..."
}
```

Note:

The solution outline is stored internally but never shown to the student.

---

# 4. Story Problem Generation

Used to convert symbolic equations into narrative problems.

Input:

```
symbolic_equation
topic
difficulty
```

Prompt template:

```
Convert the following algebra equation into a short story problem.

Equation:
{equation}

Topic:
{topic}

Difficulty:
{difficulty}

The story must clearly represent the equation.

Output only the problem statement.
```

Example:

Input equation:

```
7x + 3 = 31
```

Generated story:

```
A bookstore sells notebooks.

Each notebook costs x dollars.

If 7 notebooks plus a $3 shipping fee cost $31,
what is the price of one notebook?
```

---

# 5. Material Topic Extraction

Used when users upload textbooks or notes.

Input:

```
extracted_text
```

Prompt template:

```
Analyze the following educational text.

Identify mathematical topics discussed.

Return JSON:

{
  "topics": [
    "linear equations",
    "systems of equations"
  ]
}
```

These topics feed into the **Curriculum Engine**.

---

# Prompt Safety Rules

LLM outputs must be checked before use.

Safety checks:

```
JSON schema validation
response length limit
token usage limit
```

Forbidden responses:

```
full solutions
unsafe instructions
irrelevant content
```

---

# Token Budget Strategy

To control cost and latency:

```
AI Tutor: low token budget
Reasoning Validator: medium
Problem Generation: high
Material Processing: batch jobs
```

Example limits:

```
AI Tutor: 300 tokens
Validator: 400 tokens
Problem generation: 800 tokens
```

---

# Rate Limiting

AI usage must be rate-limited per user.

Example:

| Plan | AI Hints |
|-----|-----|
| Free | 5/day |
| Premium | unlimited |

Quota is enforced using:

```
ai_hint_usage table
```

---

# Observability

All LLM requests must be logged.

Logs include:

```
prompt_type
token_usage
latency
success/failure
```

This allows monitoring and prompt optimization.

---

# Future Extensions

Future LLM capabilities may include:

```
adaptive hint generation
difficulty tuning
solution path comparison
automated feedback reports
```

The prompt specification allows new prompt types to be added safely.

---

# Summary

The LLM Prompt System ensures:

- safe AI tutoring
- structured LLM responses
- predictable validator behavior
- reliable olympiad problem generation

LLMs act as **assistants and validators**, not as solvers.

The core mathematical correctness remains handled by:

```
symbolic engines (SymPy / CortexJS)
```

while LLMs handle:

```
reasoning
explanations
problem generation
```
