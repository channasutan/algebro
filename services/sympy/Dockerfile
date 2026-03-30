FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Create non-root user for security (SonarCloud docker:S6471)
RUN addgroup --system nonroot && adduser --system --ingroup nonroot nonroot

EXPOSE 8000

# Switch to non-root before running
USER nonroot

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]