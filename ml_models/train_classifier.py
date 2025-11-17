"""
Ticket Categorization Model Training
Trains Random Forest classifiers for ticket type and priority prediction
"""
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from datetime import datetime

# Create models directory if it doesn't exist
os.makedirs('models', exist_ok=True)

def load_and_prepare_data(csv_path='../english_support_tickets.csv'):
    """Load ticket data and prepare for training"""
    print("📊 Loading ticket data...")
    df = pd.read_csv(csv_path)
    
    # Combine subject and body for better context
    df['combined_text'] = df['subject'].fillna('') + ' ' + df['body'].fillna('')
    
    # Clean and filter data
    df = df.dropna(subset=['combined_text', 'type', 'priority'])
    
    print(f"✅ Loaded {len(df)} tickets")
    print(f"   Types: {df['type'].value_counts().to_dict()}")
    print(f"   Priorities: {df['priority'].value_counts().to_dict()}")
    
    return df

def train_type_classifier(X_train, X_test, y_train, y_test):
    """Train ticket type classifier"""
    print("\n🎯 Training Type Classifier...")
    
    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=50,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"✅ Type Classifier Accuracy: {accuracy:.2%}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Cross-validation
    cv_scores = cross_val_score(clf, X_train, y_train, cv=5)
    print(f"Cross-validation scores: {cv_scores}")
    print(f"Average CV score: {cv_scores.mean():.2%} (+/- {cv_scores.std() * 2:.2%})")
    
    return clf, accuracy

def train_priority_classifier(X_train, X_test, y_train, y_test):
    """Train ticket priority classifier"""
    print("\n🔥 Training Priority Classifier...")
    
    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=50,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"✅ Priority Classifier Accuracy: {accuracy:.2%}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Cross-validation
    cv_scores = cross_val_score(clf, X_train, y_train, cv=5)
    print(f"Cross-validation scores: {cv_scores}")
    print(f"Average CV score: {cv_scores.mean():.2%} (+/- {cv_scores.std() * 2:.2%})")
    
    return clf, accuracy

def save_models(vectorizer, type_clf, priority_clf, type_acc, priority_acc):
    """Save trained models and metadata"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Save vectorizer and classifiers
    joblib.dump(vectorizer, 'models/vectorizer.pkl')
    joblib.dump(type_clf, 'models/type_classifier.pkl')
    joblib.dump(priority_clf, 'models/priority_classifier.pkl')
    
    # Save metadata
    metadata = {
        'trained_at': timestamp,
        'type_accuracy': type_acc,
        'priority_accuracy': priority_acc,
        'vectorizer_features': vectorizer.max_features,
        'type_classes': type_clf.classes_.tolist(),
        'priority_classes': priority_clf.classes_.tolist()
    }
    
    import json
    with open('models/metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n💾 Models saved to ml_models/models/")
    print(f"   - vectorizer.pkl")
    print(f"   - type_classifier.pkl")
    print(f"   - priority_classifier.pkl")
    print(f"   - metadata.json")

def main():
    """Main training pipeline"""
    print("=" * 60)
    print("🤖 Ticket Categorization Model Training")
    print("=" * 60)
    
    # Load data
    df = load_and_prepare_data()
    
    # Prepare text features
    print("\n📝 Vectorizing text data...")
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 3),
        min_df=2,
        max_df=0.85,
        stop_words='english',
        sublinear_tf=True
    )
    
    X = vectorizer.fit_transform(df['combined_text'])
    print(f"✅ Created {X.shape[1]} features from text")
    
    # Split data
    X_train, X_test, y_type_train, y_type_test, y_priority_train, y_priority_test = train_test_split(
        X, df['type'], df['priority'],
        test_size=0.2,
        random_state=42,
        stratify=df['type']
    )
    
    print(f"\n📊 Data split:")
    print(f"   Training: {X_train.shape[0]} samples")
    print(f"   Testing: {X_test.shape[0]} samples")
    
    # Train models
    type_clf, type_acc = train_type_classifier(X_train, X_test, y_type_train, y_type_test)
    priority_clf, priority_acc = train_priority_classifier(X_train, X_test, y_priority_train, y_priority_test)
    
    # Save models
    save_models(vectorizer, type_clf, priority_clf, type_acc, priority_acc)
    
    print("\n" + "=" * 60)
    print("✨ Training Complete!")
    print("=" * 60)
    print(f"Type Accuracy: {type_acc:.2%}")
    print(f"Priority Accuracy: {priority_acc:.2%}")
    print("\nYou can now use these models in the Flask ML service.")

if __name__ == '__main__':
    main()
