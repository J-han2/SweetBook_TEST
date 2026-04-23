FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential cmake git && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY apps/api/ /app/
COPY models/ /app/models/

RUN test -f /app/models/qwen2.5-0.5b-instruct-q4_k_m.gguf || (echo "Bundled GGUF model is missing at models/qwen2.5-0.5b-instruct-q4_k_m.gguf" && exit 1)
RUN mkdir -p /app/data /app/storage/uploads/runtime

EXPOSE 8000
