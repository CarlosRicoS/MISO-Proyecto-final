FROM python:3.12-bookworm AS builder

RUN apt-get update && apt-get install --no-install-recommends -y \
        build-essential && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ADD https://astral.sh/uv/install.sh /install.sh

RUN chmod -R 655 /install.sh && /install.sh && rm /install.sh

ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app

COPY ./pyproject.toml .
COPY ./uv.lock .

RUN uv sync --frozen

FROM python:3.12-slim-bookworm AS production

RUN useradd --create-home appuser

USER appuser

WORKDIR /app

COPY main.py .


COPY --from=builder --chown=app:app /app/.venv .venv

COPY --from=builder  /app/pyproject.toml pyproject.toml

ENV PATH="/app/.venv/bin:$PATH"

ENV PYTHONPATH="/app/src:$PYTHONPATH"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]