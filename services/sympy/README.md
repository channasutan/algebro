# SymPy Microservice

FastAPI service for symbolic math evaluation. Used by `lib/math/sympy-client.ts`.

## Endpoint

`POST /evaluate` — evaluate a symbolic math expression.

## Running locally

### Option A: Python directly

```bash
cd services/sympy
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Option B: Docker

```bash
cd services/sympy
docker build -t alegbro-sympy .
docker run -d -p 8000:8000 alegbro-sympy
```

## Environment variable

Add to `.env.local`:

```bash
SYMPY_SERVICE_URL=http://127.0.0.1:8000
```

## Health check

```bash
curl http://127.0.0.1:8000/health
# -> {"status":"ok"}
```

## Operations supported

| operation | description |
|---|---|
| `solve` | solve expression for variable (context: `{"variable": "x"}`) |
| `simplify` | simplify expression |
| `expand` | expand expression |
| `equivalence` | check if two expressions are equivalent (context: `{"expr2": "..."}`) |
