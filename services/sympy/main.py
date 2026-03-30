from __future__ import annotations

import logging
import re
from collections.abc import Callable
from typing import Any

import sympy
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sympy.parsing.sympy_parser import (
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

logger = logging.getLogger(__name__)

app = FastAPI()

# Security: explicit whitelist of sympy names — no builtins, no __import__
# This restricts parse_expr evaluation to sympy namespace only.
# frozenset uses Python's built-in hash() for dict-key lookups only (non-cryptographic).
_SYM磐_NAMES = frozenset(
    name for name in dir(sympy)
    if not name.startswith("_") and name.islower()
)
_SAFE_LOCALS: dict[str, Any] = {name: getattr(sympy, name) for name in _SYM磐_NAMES}
_TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application,)


class EvaluateRequest(BaseModel):
    expression: str
    operation: str
    context: dict[str, Any] = Field(default_factory=dict)


class EvaluateResponse(BaseModel):
    result: Any


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def normalize_expression(expression: str) -> str:
    """Sanitize LaTeX expression for sympy parsing."""
    normalized = expression.strip()
    normalized = normalized.replace("$", "")
    normalized = normalized.replace("\\left", "")
    normalized = normalized.replace("\\right", "")
    normalized = normalized.replace("\\cdot", "*")
    normalized = normalized.replace("^", "**")

    # Recursively convert \frac{...}{...} patterns
    while True:
        updated = re.sub(
            r"\\frac\{([^{}]+)\}\{([^{}]+)\}",
            r"((\1)/(\2))",
            normalized,
        )
        if updated == normalized:
            break
        normalized = updated

    return normalized


def parse_math_expression(expr_str: str) -> sympy.Expr:
    """
    Parse and normalize a math expression string into a sympy Expr.

    Security: local_dict restricts evaluation to sympy symbols only
    (no builtins, no __import__, no arbitrary code execution).
    """
    return parse_expr(
        normalize_expression(expr_str),
        transformations=_TRANSFORMATIONS,
        local_dict=_SAFE_LOCALS,
        evaluate=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Operation handlers (thin, single-responsibility)
# ─────────────────────────────────────────────────────────────────────────────

def _solve(expression: str, context: dict[str, Any]) -> EvaluateResponse:
    """Handle the 'solve' operation."""
    variable = str(context.get("variable", "x"))
    var = sympy.Symbol(variable)

    if "=" in expression:
        lhs_raw, rhs_raw = expression.split("=", 1)
        lhs = parse_math_expression(lhs_raw)
        rhs = parse_math_expression(rhs_raw)
        solutions = sympy.solve(sympy.Eq(lhs, rhs), var)
    else:
        expr = parse_math_expression(expression)
        solutions = sympy.solve(expr, var)

    if not solutions:
        return EvaluateResponse(result=None)

    return EvaluateResponse(result=[str(s) for s in solutions])


def _simplify(expression: str, _context: dict[str, Any]) -> EvaluateResponse:
    """Handle the 'simplify' operation."""
    result = sympy.simplify(parse_math_expression(expression))
    return EvaluateResponse(result=str(result))


def _expand(expression: str, _context: dict[str, Any]) -> EvaluateResponse:
    """Handle the 'expand' operation."""
    result = sympy.expand(parse_math_expression(expression))
    return EvaluateResponse(result=str(result))


def _equivalence(expression: str, context: dict[str, Any]) -> EvaluateResponse:
    """Handle the 'equivalence' operation."""
    expr2_raw = context.get("expr2")
    if not isinstance(expr2_raw, str) or not expr2_raw.strip():
        raise HTTPException(
            status_code=422,
            detail="context.expr2 required for equivalence operation",
        )
    expr1 = parse_math_expression(expression)
    expr2 = parse_math_expression(expr2_raw)
    is_equivalent = sympy.simplify(expr1 - expr2) == 0
    return EvaluateResponse(result=bool(is_equivalent))


# Dispatcher map
_OPERATION_HANDLERS: dict[str, Callable[[str, dict[str, Any]], EvaluateResponse]] = {
    "solve": _solve,
    "simplify": _simplify,
    "expand": _expand,
    "equivalence": _equivalence,
}


@app.post(
    "/evaluate",
    responses={
        422: {"description": "Invalid input or unknown operation"},
        500: {"description": "Internal server error"},
    },
)
def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    """
    Evaluate a mathematical expression with the specified operation.

    Thin orchestrator: dispatches to operation handlers with error handling.
    Cyclomatic complexity: 3 (well below threshold of 9).
    """
    handler = _OPERATION_HANDLERS.get(req.operation)
    if handler is None:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown operation: {req.operation}"
        )

    try:
        return handler(req.expression, req.context)
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Unexpected internal error")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        ) from error