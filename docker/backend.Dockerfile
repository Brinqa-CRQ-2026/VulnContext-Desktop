# Use Python 3.12 slim base image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

# Expose port 8000
EXPOSE 8000

# Set environment for SQLite DB path (mounted as volume)
ENV DB_PATH=/data/vuln_context.db

# Run the FastAPI application with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
