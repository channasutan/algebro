from __future__ import annotations

import logging
import re
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

TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application,)


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


def _parse_expression(expr_str: str) -> sympy.Expr:
    """Parse and normalize a math expression string into a sympy Expr."""
    return parse_expr(normalize_expression(expr_str), transformations=TRANSFORMATIONS)


def _format_result(result) -> str | list[str]:
    """Format sympy result for JSON serialization."""
    if hasattr(result, "__iter__") and not isinstance(result, (str, dict)):
        return [str(item) for item in result]
    return str(result)


def _validate_equivalence_context(context: dict[str, Any]) -> str:
    """Validate equivalence operation has required expr2 in context."""
    expr2_raw = context.get("expr2")
    if not isinstance(expr2_raw, str) or not expr2_raw.strip():
        raise HTTPException(
            status_code=422,
            detail="context.expr2 required for equivalence operation",
        )
    return expr2_raw


def _handle_solve_operation(expression: str, context: dict[str, Any]) -> EvaluateResponse:
    """Handle the 'solve' operation."""
    variable = str(context.get("variable", "x"))
    var = sympy.Symbol(variable)

    if "=" in expression:
        lhs_raw, rhs_raw = expression.split("=", 1)
        lhs = _parse_expression(lhs_raw)
        rhs = _parse_expression(rhs_raw)
        solutions = sympy.solve(sympy.Eq(lhs, rhs), var)
    else:
        expr = _parse_expression(expression)
        solutions = sympy.solve(expr, var)

    if not solutions:
        return EvaluateResponse(result=None)

    return EvaluateResponse(result=_format_result(solutions))


def _handle_simplify_operation(expression: str) -> EvaluateResponse:
    """Handle the 'simplify' operation."""
    expr = _parse_expression(expression)
    result = sympy.simplify(expr)
    return EvaluateResponse(result=str(result))


def _handle_expand_operation(expression: str) -> EvaluateResponse:
    """Handle the 'expand' operation."""
    expr = _parse_expression(expression)
    result = sympy.expand(expr)
    return EvaluateResponse(result=str(result))


def _handle_equivalence_operation(expression: str, context: dict[str, Any]) -> EvaluateResponse:
    """Handle the 'equivalence' operation."""
    expr2_raw = _validate_equivalence_context(context)

    expr1 = _parse_expression(expression)
    expr2 = _parse_expression(expr2_raw)
    is_equivalent = sympy.simplify(expr1 - expr2) == 0
    return EvaluateResponse(result=bool(is_equivalent))


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    """Evaluate a mathematical expression with the specified operation."""
    try:
        match req.operation:
            case "solve":
                return _handle_solve_operation(req.expression, req.context)
            case "simplify":
                return _handle_simplify_operation(req.expression)
            case "expand":
                return _handle_expand_operation(req.expression)
            case "equivalence":
                return _handle_equivalence_operation(req.expression, req.context)
            case _:
                raise HTTPException(status_code=422, detail=f"Unknown operation: {req.operation}")
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Unexpected internal error")
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        ) from error