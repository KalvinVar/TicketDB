"""
Test script to create sample users and employees for TicketDB
"""
import sqlite3
import bcrypt
import json

def connect_db():
    return sqlite3.connect('data/english_support_tickets.db')

def create_test_admin():
    """Create a test admin employee"""
    conn = connect_db()
    cursor = conn.cursor()
    
    # Hash password
    password = 'admin123'
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Admin permissions (all permissions)
    permissions = json.dumps([
        "view_all_tickets", "create_tickets", "edit_tickets", "close_tickets",
        "delete_tickets", "assign_tickets", "manage_users", "manage_employees",
        "manage_departments", "view_reports", "admin_access"
    ])
    
    try:
        cursor.execute("""
            INSERT INTO employees (email, password_hash, first_name, last_name, department_id, role, permissions, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, ('admin@ticketdb.com', password_hash, 'Admin', 'User', 1, 'admin', permissions))
        
        conn.commit()
        print("✅ Admin user created:")
        print("   Email: admin@ticketdb.com")
        print("   Password: admin123")
        print("   Role: admin")
        
    except sqlite3.IntegrityError:
        print("⚠️  Admin user already exists")
    finally:
        conn.close()

def create_test_agent():
    """Create a test support agent"""
    conn = connect_db()
    cursor = conn.cursor()
    
    password = 'agent123'
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Agent permissions
    permissions = json.dumps([
        "view_tickets", "create_tickets", "edit_tickets", "close_tickets"
    ])
    
    try:
        cursor.execute("""
            INSERT INTO employees (email, password_hash, first_name, last_name, department_id, role, permissions, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, ('agent@ticketdb.com', password_hash, 'Support', 'Agent', 1, 'agent', permissions))
        
        conn.commit()
        print("✅ Agent user created:")
        print("   Email: agent@ticketdb.com")
        print("   Password: agent123")
        print("   Role: agent")
        
    except sqlite3.IntegrityError:
        print("⚠️  Agent user already exists")
    finally:
        conn.close()

def create_test_customer():
    """Create a test customer user"""
    conn = connect_db()
    cursor = conn.cursor()
    
    password = 'customer123'
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        cursor.execute("""
            INSERT INTO users (email, password_hash, first_name, last_name, phone, company, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        """, ('customer@example.com', password_hash, 'John', 'Doe', '555-1234', 'Acme Corp'))
        
        conn.commit()
        print("✅ Customer user created:")
        print("   Email: customer@example.com")
        print("   Password: customer123")
        
    except sqlite3.IntegrityError:
        print("⚠️  Customer user already exists")
    finally:
        conn.close()

def show_summary():
    """Show summary of created accounts"""
    print("\n" + "="*60)
    print("🎉 Test Accounts Ready!")
    print("="*60)
    print("\n📧 Login Credentials:\n")
    print("1. ADMIN (Full Access)")
    print("   Email: admin@ticketdb.com")
    print("   Password: admin123")
    print("   URL: http://localhost:3001/api/auth/employee/login")
    print()
    print("2. SUPPORT AGENT")
    print("   Email: agent@ticketdb.com")
    print("   Password: agent123")
    print("   URL: http://localhost:3001/api/auth/employee/login")
    print()
    print("3. CUSTOMER")
    print("   Email: customer@example.com")
    print("   Password: customer123")
    print("   URL: http://localhost:3001/api/auth/user/login")
    print()
    print("="*60)
    print("\n📝 Test with cURL:\n")
    print('curl -X POST http://localhost:3001/api/auth/employee/login \\')
    print('  -H "Content-Type: application/json" \\')
    print('  -d \'{"email":"admin@ticketdb.com","password":"admin123"}\'')
    print()

if __name__ == "__main__":
    print("🔧 Creating test accounts...\n")
    create_test_admin()
    create_test_agent()
    create_test_customer()
    show_summary()
