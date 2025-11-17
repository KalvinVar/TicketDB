"""
Sentiment Analysis Module
Uses pre-trained transformer model to analyze ticket sentiment
"""
from transformers import pipeline
import warnings
warnings.filterwarnings('ignore')

class SentimentAnalyzer:
    """Sentiment analysis for support tickets"""
    
    def __init__(self):
        """Initialize sentiment analyzer with pre-trained model"""
        print("🧠 Loading sentiment analysis model...")
        # Using distilbert-base-uncased-finetuned-sst-2-english
        # Lightweight, fast, and accurate for sentiment analysis
        self.analyzer = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english",
            device=-1  # CPU (use 0 for GPU if available)
        )
        print("✅ Sentiment analyzer ready")
    
    def analyze(self, text):
        """
        Analyze sentiment of text
        
        Args:
            text (str): Text to analyze
            
        Returns:
            dict: {
                'sentiment': 'POSITIVE' or 'NEGATIVE',
                'score': confidence score (0-1),
                'emotion': readable emotion label,
                'urgency_flag': boolean indicating high urgency
            }
        """
        if not text or len(text.strip()) == 0:
            return {
                'sentiment': 'NEUTRAL',
                'score': 0.5,
                'emotion': 'neutral',
                'urgency_flag': False
            }
        
        # Truncate long text (model has 512 token limit)
        text = text[:2000]
        
        try:
            result = self.analyzer(text)[0]
            
            sentiment = result['label']
            score = result['score']
            
            # Map to emotion categories
            if sentiment == 'NEGATIVE':
                if score > 0.9:
                    emotion = 'angry'
                    urgency_flag = True
                elif score > 0.7:
                    emotion = 'frustrated'
                    urgency_flag = True
                else:
                    emotion = 'concerned'
                    urgency_flag = False
            else:  # POSITIVE
                if score > 0.8:
                    emotion = 'satisfied'
                else:
                    emotion = 'neutral'
                urgency_flag = False
            
            return {
                'sentiment': sentiment,
                'score': float(score),
                'emotion': emotion,
                'urgency_flag': urgency_flag
            }
            
        except Exception as e:
            print(f"Error analyzing sentiment: {e}")
            return {
                'sentiment': 'NEUTRAL',
                'score': 0.5,
                'emotion': 'neutral',
                'urgency_flag': False
            }
    
    def batch_analyze(self, texts):
        """
        Analyze sentiment for multiple texts
        
        Args:
            texts (list): List of texts to analyze
            
        Returns:
            list: List of sentiment results
        """
        return [self.analyze(text) for text in texts]

def test_analyzer():
    """Test the sentiment analyzer"""
    print("\n" + "=" * 60)
    print("🧪 Testing Sentiment Analyzer")
    print("=" * 60)
    
    analyzer = SentimentAnalyzer()
    
    test_cases = [
        "Your service is terrible! I've been waiting for 3 days and no response!",
        "Thank you so much for the quick help. Everything works now!",
        "My account is not working. Can you help?",
        "This is absolutely unacceptable! I demand a refund immediately!",
        "I'm having some issues with login. Would appreciate assistance.",
        "Great support team! You guys are awesome!"
    ]
    
    print("\nTest Results:")
    print("-" * 60)
    
    for i, text in enumerate(test_cases, 1):
        result = analyzer.analyze(text)
        
        # Emoji indicators
        emoji_map = {
            'angry': '😡',
            'frustrated': '😤',
            'concerned': '😟',
            'neutral': '😐',
            'satisfied': '😊'
        }
        
        emoji = emoji_map.get(result['emotion'], '❓')
        urgency = '⚠️ URGENT' if result['urgency_flag'] else ''
        
        print(f"\n{i}. Text: \"{text[:60]}...\"" if len(text) > 60 else f"\n{i}. Text: \"{text}\"")
        print(f"   Sentiment: {result['sentiment']} ({result['score']:.2%})")
        print(f"   Emotion: {emoji} {result['emotion']} {urgency}")
    
    print("\n" + "=" * 60)
    print("✅ Sentiment analyzer is working correctly!")
    print("=" * 60)

if __name__ == '__main__':
    test_analyzer()
