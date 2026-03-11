# step-validation-spec.md

# Step Validation Specification

## Overview

This document defines how the platform validates **student solution steps**.

The system supports two categories of validation:

1. Symbolic transformations (algebra, equations, calculus)
2. Mathematical reasoning steps (proof-style reasoning)

Because olympiad-level problems involve logical reasoning, the system uses a **hybrid validation architecture**:

```
Symbolic Math Engine
+
LLM Reasoning Validator
```

Primary goals:

- verify step correctness
- detect transformation errors
- classify mistakes
- support AI tutoring feedback

---

# Validation Architecture

The step validation pipeline:

```
Student Step
↓
Step Classifier
↓
Symbolic Step? ---- yes ----→ Symbolic Validator
      │
      no
      ↓
Reasoning Validator (LLM)
↓
Validation Result
```

---

# Step Types

The system categorizes steps into two main types.

## 1. Symbolic Steps

These involve algebraic transformations.

Examples:

```
2(x+3) → 2x + 6
7x + 3 = 31 → 7x = 28
x + x → 2x
d/dx(x²) → 2x
∫2x dx → x² + C
```

These steps are validated using symbolic math.

Symbolic engine:

```
CortexJS Compute Engine
SymPy (server fallback)
```

---

## 2. Reasoning Steps

These involve logical mathematical reasoning.

Examples:

```
Let x = 0
Assume f(a) = f(b)
Therefore a = b
Let y = f(t)
f is injective
```

These steps cannot be validated purely symbolically.

They are validated using an LLM reasoning validator.

LLM responsibilities:

- detect logical validity
- confirm reasoning consistency
- classify proof steps

---

# Step Input Format

Each student step is submitted with context.

```
{
  problem_id
  attempt_id
  step_index
  step_text
  previous_expression
  current_expression
}
```

Example symbolic step:

```
{
  step_text: "7x = 28",
  previous_expression: "7x + 3 = 31",
  current_expression: "7x = 28"
}
```

Example reasoning step:

```
{
  step_text: "Let x = 0"
}
```

---

# Step Classification

Before validation, the system classifies the step.

Classifier categories:

```
symbolic_transformation
equation_operation
calculus_operation
substitution
assumption
logical_reasoning
definition
```

Example:

```
7x = 28 → symbolic_transformation
Let x = 0 → substitution
Assume f(a)=f(b) → assumption
```

Classification methods:

- rule-based detection
- lightweight LLM classifier

---

# Symbolic Validation

Symbolic validation checks **mathematical equivalence**.

Example:

```
2(x+3) → 2x + 6
```

Validation process:

```
parse expression
↓
AST generation
↓
canonicalization
↓
equivalence comparison
```

Example equivalence check:

```
simplify(expr1 - expr2) == 0
```

SymPy example:

```
simplify((7*x+3-31) - (7*x-28)) == 0
```

If true:

```
step is valid
```

---

# Equation Validation

Equations are normalized.

Example:

```
7x + 3 = 31
```

Converted to:

```
7x + 3 - 31 = 0
```

Student step:

```
7x = 28
```

Converted to:

```
7x - 28 = 0
```

Equivalence check:

```
simplify((7x+3-31) - (7x-28)) = 0
```

Valid.

---

# System of Equations Validation

Systems are represented as sets of equations.

Example:

```
x + y = 5
x - y = 1
```

Converted to:

```
x + y - 5 = 0
x - y - 1 = 0
```

Transformations allowed:

- addition of equations
- substitution
- elimination

Validation checks equivalence of equation systems.

---

# Calculus Validation

Calculus steps use symbolic differentiation and integration.

Example derivative step:

```
d/dx(x²) → 2x
```

Validation:

```
diff(x**2) = 2x
```

Integral example:

```
∫2x dx → x² + C
```

Validation:

```
diff(x²) = 2x
```

---

# Reasoning Validation (LLM)

Reasoning steps are validated using an LLM.

Examples:

```
Assume f(a)=f(b)
Therefore a=b
```

```
Let y = f(t)
```

LLM prompt structure:

```
Problem:
<original problem>

Previous steps:
<step history>

Student step:
<current step>

Question:
Is this step logically valid?
```

LLM response schema:

```
{
  is_valid: true | false
  reasoning_type: assumption | substitution | deduction
  explanation: string
}
```

---

# Error Classification

When a step is invalid, the system assigns an error type.

Symbolic errors:

```
syntax_error
non_equivalent_transformation
incorrect_distribution
sign_error
invalid_equation_operation
```

Reasoning errors:

```
invalid_assumption
invalid_deduction
missing_justification
logical_inconsistency
```

These errors are used by the AI tutor.

---

# AI Tutor Integration

After validation the system emits:

```
step_validated
```

Payload:

```
{
  step_index
  is_valid
  error_type
}
```

AI Tutor receives:

```
problem
previous_steps
student_step
error_type
```

AI generates:

```
explanation
hint
guidance
```

Constraint:

```
AI must not reveal the full solution.
```

---

# Performance Strategy

To maintain responsiveness:

Priority order:

```
1. CortexJS client validation
2. Server symbolic validation
3. LLM reasoning validation
```

Only reasoning steps require LLM calls.

---

# Future Extensions

The validator architecture allows expansion to:

```
functional equations
number theory proofs
geometry reasoning
competition-level math
```

This enables the platform to support olympiad-level problems.

---

# Summary

The step validation system combines:

```
Symbolic Math Engine
+
LLM Reasoning Validator
```

Symbolic engine ensures **mathematical correctness**.

LLM reasoning validator ensures **logical proof validity**.

This hybrid design enables the platform to support:

- algebra practice
- calculus
- systems of equations
- olympiad-style functional equations
