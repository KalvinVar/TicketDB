"""
Analyze English support tickets to answer interesting questions about the data
"""
import sqlite3
import pandas as pd
from collections import Counter
import matplotlib.pyplot as plt

def connect_to_database():
    """Connect to the English support tickets database"""
    try:
        conn = sqlite3.connect('english_support_tickets.db')
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def question_1_top_categories():
    """Question 1: What are the top 10 most common ticket categories?"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 1: What are the top 10 most common ticket categories?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        query = """
        SELECT category, COUNT(*) as ticket_count
        FROM tickets 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY ticket_count DESC 
        LIMIT 10
        """
        
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            print("❌ No category data found")
            return
        
        print(f"📊 Top 10 Categories:")
        print("-" * 40)
        
        total_tickets = df['ticket_count'].sum()
        
        for idx, row in df.iterrows():
            category = row['category']
            count = row['ticket_count']
            percentage = (count / total_tickets) * 100
            print(f"{idx+1:2}. {category:<25} {count:>6} tickets ({percentage:5.1f}%)")
        
        print(f"\nTotal analyzed: {total_tickets:,} tickets")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_2_priority_distribution():
    """Question 2: What is the distribution of ticket priorities?"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 2: What is the distribution of ticket priorities?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        query = """
        SELECT priority, COUNT(*) as ticket_count
        FROM tickets 
        WHERE priority IS NOT NULL 
        GROUP BY priority 
        ORDER BY ticket_count DESC
        """
        
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            print("❌ No priority data found")
            return
        
        print(f"⚡ Priority Distribution:")
        print("-" * 40)
        
        total_tickets = df['ticket_count'].sum()
        
        for idx, row in df.iterrows():
            priority = row['priority']
            count = row['ticket_count']
            percentage = (count / total_tickets) * 100
            
            # Add visual indicator
            bar = "█" * int(percentage / 2)  # Visual bar
            print(f"{priority:<15} {count:>6} tickets ({percentage:5.1f}%) {bar}")
        
        print(f"\nTotal analyzed: {total_tickets:,} tickets")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_3_average_text_length():
    """Question 3: What is the average length of ticket descriptions?"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 3: What is the average length of ticket descriptions?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        # Try different possible text column names
        text_columns = ['description', 'content', 'text', 'body', 'message', 'title']
        
        for col in text_columns:
            try:
                query = f"""
                SELECT 
                    COUNT(*) as total_tickets,
                    AVG(LENGTH({col})) as avg_length,
                    MIN(LENGTH({col})) as min_length,
                    MAX(LENGTH({col})) as max_length
                FROM tickets 
                WHERE {col} IS NOT NULL AND {col} != ''
                """
                
                df = pd.read_sql_query(query, conn)
                
                if not df.empty and df['total_tickets'].iloc[0] > 0:
                    print(f"📝 Text Analysis for '{col}' column:")
                    print("-" * 40)
                    
                    total = df['total_tickets'].iloc[0]
                    avg_len = df['avg_length'].iloc[0]
                    min_len = df['min_length'].iloc[0]
                    max_len = df['max_length'].iloc[0]
                    
                    print(f"Total tickets with text: {total:,}")
                    print(f"Average text length: {avg_len:.1f} characters")
                    print(f"Shortest text: {min_len} characters")
                    print(f"Longest text: {max_len:,} characters")
                    
                    # Show some examples
                    sample_query = f"""
                    SELECT {col}, LENGTH({col}) as length
                    FROM tickets 
                    WHERE {col} IS NOT NULL AND {col} != ''
                    ORDER BY LENGTH({col}) DESC
                    LIMIT 3
                    """
                    
                    samples = pd.read_sql_query(sample_query, conn)
                    print(f"\n📄 Sample long texts:")
                    for idx, row in samples.iterrows():
                        text = str(row[col])[:100] + "..." if len(str(row[col])) > 100 else str(row[col])
                        print(f"   {idx+1}. ({row['length']} chars) {text}")
                    
                    break
                    
            except Exception:
                continue
        else:
            print("❌ No text columns found")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_4_status_analysis():
    """Question 4: What percentage of tickets are resolved vs open?"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 4: What percentage of tickets are resolved vs open?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        query = """
        SELECT status, COUNT(*) as ticket_count
        FROM tickets 
        WHERE status IS NOT NULL 
        GROUP BY status 
        ORDER BY ticket_count DESC
        """
        
        df = pd.read_sql_query(query, conn)
        
        if df.empty:
            print("❌ No status data found")
            return
        
        print(f"📈 Ticket Status Analysis:")
        print("-" * 40)
        
        total_tickets = df['ticket_count'].sum()
        
        # Categorize statuses
        resolved_keywords = ['closed', 'resolved', 'completed', 'done']
        open_keywords = ['open', 'pending', 'new', 'in progress', 'assigned']
        
        resolved_count = 0
        open_count = 0
        
        for idx, row in df.iterrows():
            status = str(row['status']).lower()
            count = row['ticket_count']
            percentage = (count / total_tickets) * 100
            
            print(f"{row['status']:<20} {count:>6} tickets ({percentage:5.1f}%)")
            
            # Categorize
            if any(keyword in status for keyword in resolved_keywords):
                resolved_count += count
            elif any(keyword in status for keyword in open_keywords):
                open_count += count
        
        print(f"\n📊 Summary:")
        print(f"Likely resolved tickets: {resolved_count:,} ({resolved_count/total_tickets*100:.1f}%)")
        print(f"Likely open tickets: {open_count:,} ({open_count/total_tickets*100:.1f}%)")
        print(f"Other/unclear status: {total_tickets - resolved_count - open_count:,}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_5_most_common_words():
    """Question 5: What are the most common words in ticket titles/descriptions?"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 5: What are the most common words in ticket content?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        # Try to find a text column
        text_columns = ['title', 'description', 'content', 'text']
        
        for col in text_columns:
            try:
                query = f"SELECT {col} FROM tickets WHERE {col} IS NOT NULL LIMIT 1000"
                df = pd.read_sql_query(query, conn)
                
                if not df.empty:
                    print(f"📝 Analyzing words in '{col}' column:")
                    print("-" * 40)
                    
                    # Combine all text
                    all_text = ' '.join(df[col].astype(str).str.lower())
                    
                    # Simple word extraction (remove common words)
                    import re
                    words = re.findall(r'\b[a-zA-Z]+\b', all_text)
                    
                    # Filter out common stop words
                    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
                    
                    filtered_words = [word for word in words if len(word) > 2 and word not in stop_words]
                    
                    # Count words
                    word_counts = Counter(filtered_words)
                    
                    print(f"Top 15 most common words:")
                    for word, count in word_counts.most_common(15):
                        print(f"   {word:<15} {count:>4} times")
                    
                    break
                    
            except Exception:
                continue
        else:
            print("❌ No suitable text column found")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    """Run all analysis questions"""
    
    print("🎫 ENGLISH SUPPORT TICKETS DATA ANALYSIS")
    print("=" * 60)
    
    # Check if database exists
    try:
        conn = sqlite3.connect('english_support_tickets.db')
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tickets")
        total_records = cursor.fetchone()[0]
        print(f"📊 Database loaded: {total_records:,} English support tickets")
        conn.close()
    except Exception as e:
        print(f"❌ Cannot access database: {e}")
        return
    
    # Run all questions
    question_1_top_categories()
    question_2_priority_distribution()
    question_3_average_text_length()
    question_4_status_analysis()
    question_5_most_common_words()
    
    print("\n" + "="*60)
    print("🎉 DATA ANALYSIS COMPLETE!")
    print("="*60)
    print("These insights can help improve IT support operations:")
    print("- Focus resources on most common categories")
    print("- Balance priority distributions")
    print("- Optimize ticket resolution processes")
    print("- Improve ticket descriptions based on length analysis")

if __name__ == "__main__":
    main()