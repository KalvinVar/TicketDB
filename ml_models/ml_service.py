"""
Flask ML Microservice
Serves predictions for ticket categorization and sentiment analysis
Run on port 5001
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
from sentiment_analyzer import SentimentAnalyzer
import os
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for Express server to connect

# Load models on startup
print("🚀 Starting ML Service...")
print("=" * 60)

# Check if models exist
models_dir = 'models'
if not os.path.exists(models_dir):
    print("❌ Error: models/ directory not found")
    print("   Please run: python train_classifier.py first")
    exit(1)

required_files = ['vectorizer.pkl', 'type_classifier.pkl', 'priority_classifier.pkl']
for file in required_files:
    if not os.path.exists(os.path.join(models_dir, file)):
        print(f"❌ Error: {file} not found in models/")
        print("   Please run: python train_classifier.py first")
        exit(1)

# Load categorization models
print("📦 Loading categorization models...")
vectorizer = joblib.load('models/vectorizer.pkl')
type_classifier = joblib.load('models/type_classifier.pkl')
priority_classifier = joblib.load('models/priority_classifier.pkl')

# Load metadata
with open('models/metadata.json', 'r') as f:
    metadata = json.load(f)

print(f"✅ Type classifier loaded (accuracy: {metadata['type_accuracy']:.2%})")
print(f"✅ Priority classifier loaded (accuracy: {metadata['priority_accuracy']:.2%})")

# Load sentiment analyzer
print("\n📦 Loading sentiment analyzer...")
sentiment_analyzer = SentimentAnalyzer()

print("\n" + "=" * 60)
print("✨ ML Service Ready!")
print("=" * 60)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': True,
        'trained_at': metadata['trained_at'],
        'type_accuracy': metadata['type_accuracy'],
        'priority_accuracy': metadata['priority_accuracy']
    })

@app.route('/predict/category', methods=['POST'])
def predict_category():
    """
    Predict ticket type and priority
    
    Request body:
    {
        "title": "Ticket subject",
        "description": "Ticket body text"
    }
    
    Response:
    {
        "type": {
            "prediction": "incident",
            "confidence": 0.85,
            "probabilities": {...}
        },
        "priority": {
            "prediction": "high",
            "confidence": 0.78,
            "probabilities": {...}
        }
    }
    """
    try:
        data = request.json
        title = data.get('title', '')
        description = data.get('description', '')
        
        if not title and not description:
            return jsonify({'error': 'title or description required'}), 400
        
        # Combine text
        combined_text = f"{title} {description}"
        
        # Vectorize
        X = vectorizer.transform([combined_text])
        
        # Predict type
        type_pred = type_classifier.predict(X)[0]
        type_proba = type_classifier.predict_proba(X)[0]
        type_confidence = float(max(type_proba))
        
        # Map types to match API validation (lowercase and map Change to question)
        type_mapping = {
            'Incident': 'incident',
            'Request': 'request',
            'Problem': 'problem',
            'Change': 'question',
            'Question': 'question'
        }
        type_pred_normalized = type_mapping.get(type_pred, type_pred.lower())
        
        type_probabilities = {
            type_mapping.get(cls, cls.lower()): float(prob) 
            for cls, prob in zip(type_classifier.classes_, type_proba)
        }
        
        # Predict priority
        priority_pred = priority_classifier.predict(X)[0]
        priority_proba = priority_classifier.predict_proba(X)[0]
        priority_confidence = float(max(priority_proba))
        
        # Normalize priority to lowercase
        priority_pred_normalized = priority_pred.lower()
        
        priority_probabilities = {
            cls.lower(): float(prob)
            for cls, prob in zip(priority_classifier.classes_, priority_proba)
        }
        
        return jsonify({
            'type': {
                'prediction': type_pred_normalized,
                'confidence': type_confidence,
                'probabilities': type_probabilities
            },
            'priority': {
                'prediction': priority_pred_normalized,
                'confidence': priority_confidence,
                'probabilities': priority_probabilities
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/sentiment', methods=['POST'])
def predict_sentiment():
    """
    Analyze sentiment of ticket text
    
    Request body:
    {
        "text": "Ticket text to analyze"
    }
    
    Response:
    {
        "sentiment": "NEGATIVE",
        "score": 0.92,
        "emotion": "angry",
        "urgency_flag": true
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'text required'}), 400
        
        result = sentiment_analyzer.analyze(text)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/full', methods=['POST'])
def predict_full():
    """
    Get both category and sentiment predictions
    
    Request body:
    {
        "title": "Ticket subject",
        "description": "Ticket body text"
    }
    
    Response:
    {
        "category": {...},
        "sentiment": {...}
    }
    """
    try:
        data = request.json
        title = data.get('title', '')
        description = data.get('description', '')
        
        if not title and not description:
            return jsonify({'error': 'title or description required'}), 400
        
        # Get category prediction
        combined_text = f"{title} {description}"
        X = vectorizer.transform([combined_text])
        
        type_pred = type_classifier.predict(X)[0]
        type_proba = type_classifier.predict_proba(X)[0]
        type_confidence = float(max(type_proba))
        
        # Map types to match API validation
        type_mapping = {
            'Incident': 'incident',
            'Request': 'request',
            'Problem': 'problem',
            'Change': 'question',
            'Question': 'question'
        }
        type_pred_normalized = type_mapping.get(type_pred, type_pred.lower())
        
        priority_pred = priority_classifier.predict(X)[0]
        priority_proba = priority_classifier.predict_proba(X)[0]
        priority_confidence = float(max(priority_proba))
        priority_pred_normalized = priority_pred.lower()
        
        # Get sentiment
        sentiment_result = sentiment_analyzer.analyze(combined_text)
        
        return jsonify({
            'category': {
                'type': {
                    'prediction': type_pred_normalized,
                    'confidence': type_confidence
                },
                'priority': {
                    'prediction': priority_pred_normalized,
                    'confidence': priority_confidence
                }
            },
            'sentiment': sentiment_result
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """
    Batch prediction for multiple tickets
    
    Request body:
    {
        "tickets": [
            {"title": "...", "description": "..."},
            {"title": "...", "description": "..."}
        ]
    }
    """
    try:
        data = request.json
        tickets = data.get('tickets', [])
        
        if not tickets:
            return jsonify({'error': 'tickets array required'}), 400
        
        results = []
        
        for ticket in tickets:
            title = ticket.get('title', '')
            description = ticket.get('description', '')
            combined_text = f"{title} {description}"
            
            # Vectorize
            X = vectorizer.transform([combined_text])
            
            # Predictions
            type_pred = type_classifier.predict(X)[0]
            type_conf = float(max(type_classifier.predict_proba(X)[0]))
            
            priority_pred = priority_classifier.predict(X)[0]
            priority_conf = float(max(priority_classifier.predict_proba(X)[0]))
            
            sentiment = sentiment_analyzer.analyze(combined_text)
            
            results.append({
                'type': {'prediction': type_pred, 'confidence': type_conf},
                'priority': {'prediction': priority_pred, 'confidence': priority_conf},
                'sentiment': sentiment
            })
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n🌐 Starting Flask server on http://localhost:5001")
    print("   Available endpoints:")
    print("   - GET  /health")
    print("   - POST /predict/category")
    print("   - POST /predict/sentiment")
    print("   - POST /predict/full")
    print("   - POST /predict/batch")
    print("\nPress Ctrl+C to stop\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
