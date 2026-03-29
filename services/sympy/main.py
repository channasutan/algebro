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


def parse_math_expression(expression: str) -> sympy.Expr:
    return parse_expr(normalize_expression(expression), transformations=TRANSFORMATIONS)


@app.post("/evaluate", response_model=EvaluateResponse)
def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    try:
        if req.operation == "solve":
            variable = str(req.context.get("variable", "x"))
            var = sympy.Symbol(variable)

            if "=" in req.expression:
                lhs_raw, rhs_raw = req.expression.split("=", 1)
                lhs = parse_math_expression(lhs_raw)
                rhs = parse_math_expression(rhs_raw)
                solutions = sympy.solve(sympy.Eq(lhs, rhs), var)
            else:
                expr = parse_math_expression(req.expression)
                solutions = sympy.solve(expr, var)

            if not solutions:
                return EvaluateResponse(result=None)

            return EvaluateResponse(result=[str(solution) for solution in solutions])

        if req.operation == "simplify":
            expr = parse_math_expression(req.expression)
            result = sympy.simplify(expr)
            return EvaluateResponse(result=str(result))

        if req.operation == "expand":
            expr = parse_math_expression(req.expression)
            result = sympy.expand(expr)
            return EvaluateResponse(result=str(result))

        if req.operation == "equivalence":
            expr2_raw = req.context.get("expr2")
            if not isinstance(expr2_raw, str) or not expr2_raw.strip():
                raise HTTPException(
                    status_code=422,
                    detail="context.expr2 required for equivalence operation",
                )

            expr1 = parse_math_expression(req.expression)
            expr2 = parse_math_expression(expr2_raw)
            is_equivalent = sympy.simplify(expr1 - expr2) == 0
            return EvaluateResponse(result=bool(is_equivalent))

        raise HTTPException(status_code=422, detail=f"Unknown operation: {req.operation}")
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Unexpected internal error")
        raise HTTPException(status_code=500, detail="Internal server error") from error
