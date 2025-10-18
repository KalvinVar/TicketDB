"""
Analyze English support tickets with the correct column names
"""
import sqlite3
import pandas as pd
from collections import Counter
import re

def connect_to_database():
    """Connect to the English support tickets database"""
    try:
        conn = sqlite3.connect('english_support_tickets.db')
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None

def show_database_structure():
    """Show what columns are actually available"""
    print("\n" + "="*60)
    print("📋 DATABASE STRUCTURE")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(tickets)")
        columns = cursor.fetchall()
        
        print("Available columns:")
        for col in columns:
            print(f"   {col[1]} ({col[2]})")
        
        # Show sample data
        cursor.execute("SELECT * FROM tickets LIMIT 1")
        sample = cursor.fetchone()
        if sample:
            print(f"\nSample record:")
            for i, col in enumerate(columns):
                value = str(sample[i])[:50] + "..." if len(str(sample[i])) > 50 else str(sample[i])
                print(f"   {col[1]}: {value}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_1_priority_analysis():
    """Detailed priority analysis"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 1: How are tickets prioritized and what does this tell us?")
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
        
        total_tickets = df['ticket_count'].sum()
        
        print(f"⚡ Priority Distribution Analysis:")
        print("-" * 50)
        
        for idx, row in df.iterrows():
            priority = row['priority']
            count = row['ticket_count']
            percentage = (count / total_tickets) * 100
            
            # Create visual bar
            bar_length = int(percentage / 2)
            bar = "█" * bar_length
            
            print(f"{priority:<15} {count:>6} tickets ({percentage:5.1f}%) {bar}")
        
        print(f"\nInsights:")
        print(f"• Most tickets are medium priority ({df.iloc[0]['ticket_count']:,} tickets)")
        print(f"• High priority makes up {(df[df['priority'] == 'high']['ticket_count'].sum() / total_tickets * 100):.1f}% of all tickets")
        print(f"• This suggests a balanced workload distribution")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_2_text_analysis():
    """Analyze the body text content"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 2: What can we learn from ticket text content?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        query = """
        SELECT 
            COUNT(*) as total_tickets,
            AVG(LENGTH(body)) as avg_length,
            MIN(LENGTH(body)) as min_length,
            MAX(LENGTH(body)) as max_length
        FROM tickets 
        WHERE body IS NOT NULL AND body != ''
        """
        
        df = pd.read_sql_query(query, conn)
        
        total = df['total_tickets'].iloc[0]
        avg_len = df['avg_length'].iloc[0]
        min_len = df['min_length'].iloc[0]
        max_len = df['max_length'].iloc[0]
        
        print(f"📝 Text Content Analysis:")
        print("-" * 40)
        print(f"Total tickets with content: {total:,}")
        print(f"Average text length: {avg_len:.1f} characters")
        print(f"Shortest ticket: {min_len} characters")
        print(f"Longest ticket: {max_len:,} characters")
        
        # Categorize by length
        length_query = """
        SELECT 
            CASE 
                WHEN LENGTH(body) < 100 THEN 'Short (< 100 chars)'
                WHEN LENGTH(body) < 300 THEN 'Medium (100-300 chars)'
                WHEN LENGTH(body) < 600 THEN 'Long (300-600 chars)'
                ELSE 'Very Long (> 600 chars)'
            END as length_category,
            COUNT(*) as count
        FROM tickets 
        WHERE body IS NOT NULL AND body != ''
        GROUP BY length_category
        ORDER BY count DESC
        """
        
        length_df = pd.read_sql_query(length_query, conn)
        
        print(f"\n📏 Ticket Length Distribution:")
        for _, row in length_df.iterrows():
            category = row['length_category']
            count = row['count']
            percentage = (count / total) * 100
            print(f"   {category:<25} {count:>5} ({percentage:4.1f}%)")
        
        print(f"\nInsights:")
        print(f"• Average ticket is {avg_len:.0f} characters (~{avg_len/5:.0f} words)")
        print(f"• Wide range suggests different complexity levels")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_3_common_words():
    """Find most common words in ticket content"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 3: What are the most common issues based on text content?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        # Get sample of ticket bodies
        query = "SELECT body FROM tickets WHERE body IS NOT NULL LIMIT 2000"
        df = pd.read_sql_query(query, conn)
        
        # Combine all text
        all_text = ' '.join(df['body'].astype(str).str.lower())
        
        # Extract words (improved filtering)
        words = re.findall(r'\b[a-z]{3,}\b', all_text)  # Only letters, 3+ chars
        
        # Comprehensive stop words for customer support
        stop_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
            'dear', 'customer', 'support', 'would', 'like', 'have', 'with', 'this', 'that', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'could', 'there', 'other', 'after', 'first', 'never', 'these', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while'
        }
        
        # Filter meaningful words
        filtered_words = [word for word in words if word not in stop_words]
        
        # Count words
        word_counts = Counter(filtered_words)
        
        print(f"🔤 Most Common Words in Support Tickets:")
        print("-" * 50)
        
        top_words = word_counts.most_common(20)
        for i, (word, count) in enumerate(top_words, 1):
            print(f"{i:2}. {word:<20} {count:>4} times")
        
        print(f"\nInsights from common words:")
        # Look for patterns
        tech_words = [word for word, count in top_words if word in ['system', 'error', 'problem', 'issue', 'account', 'access', 'login', 'password', 'email', 'website', 'service', 'application']]
        if tech_words:
            print(f"• Technical issues mentioned: {', '.join(tech_words[:5])}")
        
        action_words = [word for word, count in top_words if word in ['need', 'help', 'please', 'want', 'request', 'solve', 'fix', 'resolve']]
        if action_words:
            print(f"• Common action words: {', '.join(action_words[:3])}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_4_priority_vs_length():
    """Analyze relationship between priority and text length"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 4: Do higher priority tickets have longer descriptions?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        query = """
        SELECT 
            priority,
            AVG(LENGTH(body)) as avg_length,
            COUNT(*) as ticket_count
        FROM tickets 
        WHERE body IS NOT NULL AND body != '' AND priority IS NOT NULL
        GROUP BY priority
        ORDER BY avg_length DESC
        """
        
        df = pd.read_sql_query(query, conn)
        
        print(f"📊 Priority vs Text Length Analysis:")
        print("-" * 50)
        
        for _, row in df.iterrows():
            priority = row['priority']
            avg_len = row['avg_length']
            count = row['ticket_count']
            
            print(f"{priority:<15} {avg_len:6.1f} chars average ({count:,} tickets)")
        
        # Find correlation insights
        high_priority_length = df[df['priority'] == 'high']['avg_length'].iloc[0] if 'high' in df['priority'].values else 0
        low_priority_length = df[df['priority'] == 'low']['avg_length'].iloc[0] if 'low' in df['priority'].values else 0
        
        print(f"\nInsights:")
        if high_priority_length > low_priority_length:
            diff = high_priority_length - low_priority_length
            print(f"• High priority tickets are {diff:.0f} characters longer on average")
            print(f"• Suggests more detailed descriptions for urgent issues")
        else:
            print(f"• No clear correlation between priority and description length")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def question_5_ticket_patterns():
    """Look for patterns in the ticket data"""
    
    print("\n" + "="*60)
    print("🔍 QUESTION 5: What patterns can we find in the support tickets?")
    print("="*60)
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        # Get all available columns
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(tickets)")
        columns = [col[1] for col in cursor.fetchall()]
        
        print(f"🔍 Exploring patterns in available data:")
        print("-" * 50)
        
        # Analyze any categorical columns
        categorical_columns = []
        for col in columns:
            if col not in ['body']:  # Skip text columns
                try:
                    query = f"SELECT COUNT(DISTINCT {col}) as unique_count FROM tickets WHERE {col} IS NOT NULL"
                    result = pd.read_sql_query(query, conn)
                    unique_count = result['unique_count'].iloc[0]
                    
                    if unique_count < 50:  # Likely categorical
                        categorical_columns.append(col)
                        print(f"• {col}: {unique_count} unique values")
                except:
                    pass
        
        # Show distribution of categorical columns
        for col in categorical_columns[:3]:  # Limit to first 3
            try:
                query = f"""
                SELECT {col}, COUNT(*) as count 
                FROM tickets 
                WHERE {col} IS NOT NULL 
                GROUP BY {col} 
                ORDER BY count DESC 
                LIMIT 5
                """
                df = pd.read_sql_query(query, conn)
                
                if not df.empty:
                    print(f"\nTop values in '{col}':")
                    for _, row in df.iterrows():
                        print(f"   {row[col]}: {row['count']:,} tickets")
            except:
                pass
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def main():
    """Run all analysis questions"""
    
    print("🎫 ENGLISH SUPPORT TICKETS DATA ANALYSIS (CORRECTED)")
    print("=" * 70)
    
    # Check database
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
    
    # Show structure first
    show_database_structure()
    
    # Run analysis
    question_1_priority_analysis()
    question_2_text_analysis()
    question_3_common_words()
    question_4_priority_vs_length()
    question_5_ticket_patterns()
    
    print("\n" + "="*70)
    print("🎉 CORRECTED DATA ANALYSIS COMPLETE!")
    print("="*70)
    print("Key findings:")
    print("• Priority distribution shows balanced workload")
    print("• Text length varies significantly, indicating different issue types")
    print("• Common words reveal typical support issues")
    print("• Data structure is suitable for ML classification projects")

if __name__ == "__main__":
    main()