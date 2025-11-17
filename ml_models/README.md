# TicketDB ML Setup Guide

## 🤖 Machine Learning Features

This project includes automatic ticket categorization and sentiment analysis powered by machine learning.

## Prerequisites

- Python 3.8+ with venv
- PyTorch (CPU version is fine)
- At least 2GB free disk space for models

## Quick Start

### 1. Install Python Dependencies

```powershell
cd C:\Users\Kalvin\OneDrive\ITDB
.\venv\Scripts\activate
pip install -r requirements.txt
```

This will install:
- `scikit-learn` - for ticket categorization models
- `transformers` - for sentiment analysis
- `torch` - required by transformers
- `flask` & `flask-cors` - ML API server
- `joblib` - for model persistence

### 2. Train the Categorization Models

```powershell
cd ml_models
python train_classifier.py
```

This will:
- Load `english_support_tickets.csv`
- Train Random Forest classifiers for ticket type and priority
- Save models to `ml_models/models/` directory
- Display accuracy metrics

Expected output:
```
✅ Type Classifier Accuracy: 85-90%
✅ Priority Classifier Accuracy: 75-85%
```

### 3. Test Sentiment Analyzer

```powershell
python sentiment_analyzer.py
```

This will download the pre-trained sentiment model (first run only) and run test cases.

### 4. Start the ML Service

```powershell
python ml_service.py
```

The Flask server will start on **http://localhost:5001**

Expected output:
```
✅ Type classifier loaded
✅ Priority classifier loaded
✅ Sentiment analyzer ready
🌐 Starting Flask server on http://localhost:5001
```

### 5. Start the TicketDB Application

In a separate terminal:

```powershell
cd C:\Users\Kalvin\OneDrive\ITDB
.\start-ticket-app.ps1
```

## API Endpoints

### Check ML Service Health
```bash
GET http://localhost:3001/api/ml/health
Authorization: Bearer <token>
```

### Predict Ticket Category
```bash
POST http://localhost:3001/api/ml/predict-category
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Cannot access my account",
  "description": "I've been trying to log in but keep getting errors"
}
```

Response:
```json
{
  "type": {
    "prediction": "incident",
    "confidence": 0.85,
    "probabilities": {
      "incident": 0.85,
      "request": 0.10,
      "problem": 0.03,
      "question": 0.02
    }
  },
  "priority": {
    "prediction": "high",
    "confidence": 0.78,
    "probabilities": {
      "high": 0.78,
      "medium": 0.18,
      "low": 0.04
    }
  }
}
```

### Analyze Sentiment
```bash
POST http://localhost:3001/api/ml/analyze-sentiment
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Your service is terrible! I've been waiting for 3 days!"
}
```

Response:
```json
{
  "sentiment": "NEGATIVE",
  "score": 0.92,
  "emotion": "angry",
  "urgency_flag": true
}
```

### Full Prediction (Category + Sentiment)
```bash
POST http://localhost:3001/api/ml/predict-full
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Urgent: System down",
  "description": "The entire system is not working. This is critical!"
}
```

## Models Directory Structure

After training, you'll have:

```
ml_models/
├── models/
│   ├── vectorizer.pkl              # TF-IDF vectorizer
│   ├── type_classifier.pkl         # Type prediction model
│   ├── priority_classifier.pkl     # Priority prediction model
│   └── metadata.json               # Training metadata
├── train_classifier.py
├── sentiment_analyzer.py
└── ml_service.py
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'transformers'"
```powershell
pip install transformers torch
```

### "Model not found" when starting ml_service.py
```powershell
cd ml_models
python train_classifier.py
```

### ML Service returns 503 from Express
Make sure the Flask ML service is running:
```powershell
cd ml_models
python ml_service.py
```

### Slow sentiment analysis
First run downloads the model (~250MB). Subsequent runs are fast.

## Model Performance

### Ticket Type Classifier
- **Accuracy**: 85-90%
- **Classes**: request, problem, incident, question
- **Features**: 3000 TF-IDF features from title + description

### Priority Classifier
- **Accuracy**: 75-85%
- **Classes**: low, medium, high
- **Features**: Same 3000 TF-IDF features

### Sentiment Analyzer
- **Model**: DistilBERT (fine-tuned on SST-2)
- **Emotions**: angry, frustrated, concerned, neutral, satisfied
- **Urgency Detection**: Flags high-emotion negative tickets

## Retraining Models

To retrain with new data:

1. Update `english_support_tickets.csv` with new tickets
2. Run training script:
```powershell
cd ml_models
python train_classifier.py
```
3. Restart ML service:
```powershell
python ml_service.py
```

Models automatically reload with updated versions.

## Production Deployment

For production:

1. Use **gunicorn** instead of Flask dev server:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 ml_service:app
```

2. Consider GPU for faster sentiment analysis:
   - Change `device=-1` to `device=0` in `sentiment_analyzer.py`
   - Requires CUDA-enabled GPU

3. Add caching for repeated predictions:
   - Use Redis to cache prediction results
   - TTL of 1 hour for identical text

## Next Steps

1. **UI Integration**: Update CreateTicket.tsx to show real-time suggestions
2. **Auto-tagging**: Automatically set type/priority when creating tickets
3. **Analytics Dashboard**: Show model performance metrics
4. **A/B Testing**: Compare manual vs ML categorization accuracy
