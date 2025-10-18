"""
Simple ML test using scikit-learn (much smaller download)
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

def simple_text_classifier():
    """Create and test a simple text classifier."""
    
    print("Creating a simple text classifier...")
    
    # Sample training data
    training_texts = [
        "I love this product amazing quality",
        "Great service excellent experience", 
        "Wonderful fantastic brilliant",
        "Terrible awful horrible experience",
        "Bad quality disappointing product",
        "Worst service ever very upset"
    ]
    
    training_labels = ["positive", "positive", "positive", "negative", "negative", "negative"]
    
    # Create a simple pipeline
    classifier = Pipeline([
        ('tfidf', TfidfVectorizer()),
        ('naive_bayes', MultinomialNB())
    ])
    
    # Train the model
    classifier.fit(training_texts, training_labels)
    
    # Test sentences
    test_texts = [
        "I love using machine learning models!",
        "This assignment is challenging but interesting.",
        "The weather is terrible today.",
        "Python makes AI development so much easier.",
        "I'm not sure about this approach."
    ]
    
    print("\n" + "="*50)
    print("SIMPLE TEXT CLASSIFICATION RESULTS")
    print("="*50)
    
    for text in test_texts:
        prediction = classifier.predict([text])[0]
        probabilities = classifier.predict_proba([text])[0]
        
        print(f"\nText: '{text}'")
        print(f"Prediction: {prediction}")
        print("Probabilities:")
        for i, label in enumerate(classifier.classes_):
            print(f"  {label}: {probabilities[i]:.4f} ({probabilities[i]*100:.2f}%)")

if __name__ == "__main__":
    try:
        simple_text_classifier()
        print("\n✅ Simple ML test completed successfully!")
    except Exception as e:
        print(f"\n❌ Error: {e}")