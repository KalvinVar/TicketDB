"""
Simple HuggingFace model test using a lightweight text classification model.
This uses distilbert-base-uncased-finetuned-sst-2-english which is relatively small (~250MB).
"""

from transformers import pipeline
import torch

def test_sentiment_model():
    """Test a pre-trained sentiment analysis model from HuggingFace."""
    
    print("Loading sentiment analysis model...")
    print("Model: distilbert-base-uncased-finetuned-sst-2-english")
    
    # Create a sentiment analysis pipeline
    # This model is small and good for testing
    classifier = pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        return_all_scores=True
    )
    
    # Test sentences
    test_texts = [
        "I love using machine learning models!",
        "This assignment is challenging but interesting.",
        "The weather is terrible today.",
        "Python makes AI development so much easier.",
        "I'm not sure about this approach."
    ]
    
    print("\n" + "="*50)
    print("SENTIMENT ANALYSIS RESULTS")
    print("="*50)
    
    for text in test_texts:
        result = classifier(text)
        
        print(f"\nText: '{text}'")
        print("Predictions:")
        for prediction in result[0]:
            label = prediction['label']
            score = prediction['score']
            print(f"  {label}: {score:.4f} ({score*100:.2f}%)")
        
        # Show the top prediction
        top_prediction = max(result[0], key=lambda x: x['score'])
        print(f"  → Top prediction: {top_prediction['label']}")

def check_system_info():
    """Display system information for debugging."""
    print("SYSTEM INFORMATION")
    print("="*30)
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA device: {torch.cuda.get_device_name()}")
    print()

if __name__ == "__main__":
    try:
        check_system_info()
        test_sentiment_model()
        print("\n✅ Model test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        print("\nMake sure you have the required packages installed:")
        print("pip install transformers torch")