# Use official Python image
FROM python:3.11-slim

# Install system dependencies for Cairo and PDF generation
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libcairo2-dev \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ ./backend/

# Set environment variables
ENV PYTHONPATH=/app/backend
ENV PORT=8000

# Start the application
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
