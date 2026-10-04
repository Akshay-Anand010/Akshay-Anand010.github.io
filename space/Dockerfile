FROM python:3.11-slim

WORKDIR /app

# CPU-only PyTorch. The free Space has no GPU.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py notes.json ./

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
