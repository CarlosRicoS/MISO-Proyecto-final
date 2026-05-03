FROM python:3.13-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends build-essential

ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh

WORKDIR /app
COPY pyproject.toml uv.lock* README.md ./
ENV PATH="/root/.local/bin:$PATH"
RUN uv sync --no-dev

COPY src/ src/
COPY main.py .

FROM python:3.13-slim-bookworm

RUN useradd --create-home appuser
WORKDIR /app

COPY --from=builder /app/main.py .
COPY --from=builder /app/src/ src/
COPY --from=builder /app/.venv .venv

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app/src

USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
