"""
Download Kaggle dataset using Python API
"""
import os
import json
from kaggle.api.kaggle_api_extended import KaggleApi

def setup_kaggle():
    """Set up Kaggle API credentials"""
    
    # Create .kaggle directory
    kaggle_dir = r"C:\Users\kalvi\.kaggle"
    if not os.path.exists(kaggle_dir):
        os.makedirs(kaggle_dir)
        print(f"✅ Created directory: {kaggle_dir}")
    
    # Copy credentials if they exist in Downloads
    downloads_kaggle = r"C:\Users\kalvi\Downloads\kaggle.json"
    target_kaggle = os.path.join(kaggle_dir, "kaggle.json")
    
    if os.path.exists(downloads_kaggle) and not os.path.exists(target_kaggle):
        import shutil
        shutil.copy2(downloads_kaggle, target_kaggle)
        print(f"✅ Copied kaggle.json to {target_kaggle}")
    
    # Verify credentials exist
    if os.path.exists(target_kaggle):
        with open(target_kaggle, 'r') as f:
            creds = json.load(f)
        print(f"✅ Kaggle credentials found for user: {creds['username']}")
        return True
    else:
        print(f"❌ kaggle.json not found at {target_kaggle}")
        return False

def download_support_tickets():
    """Download the multilingual customer support tickets dataset"""
    
    try:
        print("🔗 Initializing Kaggle API...")
        api = KaggleApi()
        api.authenticate()
        print("✅ Kaggle API authenticated")
        
        # Download the dataset
        dataset_name = "tobiasbueck/multilingual-customer-support-tickets"
        print(f"📥 Downloading: {dataset_name}")
        
        api.dataset_download_files(
            dataset_name,
            path=".",
            unzip=True
        )
        
        print("✅ Dataset downloaded and extracted!")
        
        # List what we got
        print("\n📁 Files in current directory:")
        for file in os.listdir("."):
            if os.path.isfile(file):
                size = os.path.getsize(file) / (1024*1024)  # MB
                print(f"   {file} ({size:.1f} MB)")
        
        return True
        
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return False

if __name__ == "__main__":
    print("📦 Setting up Kaggle dataset download...")
    
    if setup_kaggle():
        if download_support_tickets():
            print("\n🎉 Dataset ready!")
            print("Next: Run the filter script to get English-only tickets")
        else:
            print("❌ Download failed")
    else:
        print("❌ Credential setup failed")