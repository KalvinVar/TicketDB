# TicketDB Entity-Relationship Diagram

## 🎨 Interactive Mermaid Diagrams

**To view and edit these diagrams interactively:**
1. Go to https://mermaid.js.org/ or https://mermaid.live/
2. Copy any code block below
3. Paste it into the editor
4. The diagram will render instantly!

---

## 1️⃣ Basic Database Schema

Copy this code into Mermaid Live Editor:

```mermaid
---
title: TicketDB Database Schema
---
erDiagram
    TICKETS {
        int rowid PK "Auto-increment ID"
        string subject "Ticket title/subject line"
        text body "Detailed ticket description"
        string type "Ticket type (request/problem/incident/question)"
        string priority "Priority level (low/medium/high)"
        string queue "Support queue/department"
        string language "Ticket language (en only)"
        datetime created_at "Creation timestamp"
        datetime updated_at "Last update timestamp"
    }
```

---

## 2️⃣ Extended Schema with Relationships

Copy this code for a more detailed view:

```mermaid
---
title: TicketDB Extended Schema with Analytics
---
erDiagram
    TICKETS ||--o{ TICKET_ANALYTICS : "analyzed_by"
    TICKETS ||--o{ PRIORITY_STATS : "grouped_by"
    TICKETS ||--o{ QUEUE_STATS : "assigned_to"
    
    TICKETS {
        int rowid PK "Unique identifier"
        string subject "Ticket subject"
        text body "Full description"
        string type "Type: request/problem/incident/question"
        string priority "Priority: low/medium/high"
        string queue "Support queue"
        string language "Language code (en)"
        datetime created_at "Created timestamp"
        datetime updated_at "Updated timestamp"
    }
    
    TICKET_ANALYTICS {
        int ticket_id FK "Reference to ticket"
        int text_length "Body character count"
        string complexity "short/medium/long/very_long"
        array common_words "Extracted keywords"
        datetime analyzed_at "Analysis timestamp"
    }
    
    PRIORITY_STATS {
        string priority PK "Priority level"
        int ticket_count "Total tickets"
        float percentage "Percentage of total"
        float avg_length "Average body length"
    }
    
    QUEUE_STATS {
        string queue PK "Queue name"
        int ticket_count "Total tickets"
        string primary_type "Most common type"
        float avg_resolution_time "Average time"
    }
```

---

## 3️⃣ Application Architecture

Copy this for the full system architecture:

```mermaid
---
title: TicketDB Application Architecture
---
graph TB
    subgraph "Frontend Layer"
        A[React UI<br/>Port 5173]
        B[TicketList Component<br/>Filters, Search, Sort]
        C[TicketItem Component<br/>Card Display]
        D[API Service<br/>Axios Client]
        A --> B
        A --> C
        B --> D
        C --> D
    end
    
    subgraph "Backend Layer"
        E[Express Server<br/>Port 3001]
        F[Ticket Routes<br/>/api/tickets]
        G[Ticket Controller<br/>CRUD Operations]
        H[Database Config<br/>SQLite Connection]
        D --> E
        E --> F
        F --> G
        G --> H
    end
    
    subgraph "Data Layer"
        I[(SQLite Database<br/>english_support_tickets.db)]
        H --> I
    end
    
    subgraph "Python Analytics"
        J[filter_english_tickets.py<br/>Data Preparation]
        K[analyze_tickets.py<br/>Statistical Analysis]
        L[ml_model_test.py<br/>ML Classification]
        J --> I
        K --> I
        L --> I
    end
    
    subgraph "Automation"
        M[start-ticket-app.ps1<br/>One-Click Startup]
        M -.->|Starts| E
        M -.->|Starts| A
    end
    
    style I fill:#f9f,stroke:#333,stroke-width:4px
    style A fill:#bbf,stroke:#333,stroke-width:2px
    style E fill:#bfb,stroke:#333,stroke-width:2px
    style J fill:#fbb,stroke:#333,stroke-width:2px
```

---

## 4️⃣ Data Flow Sequence Diagram

Copy this for API request/response flow:

```mermaid
---
title: TicketDB Data Flow
---
sequenceDiagram
    actor User
    participant Client as React Client<br/>(Port 5173)
    participant API as Express API<br/>(Port 3001)
    participant DB as SQLite Database
    participant Python as Python Scripts
    
    Note over Python,DB: Initial Data Setup
    Python->>DB: filter_english_tickets.py<br/>Load & filter dataset
    DB-->>Python: 1000+ tickets created
    
    Note over User,DB: User Interactions
    User->>Client: Open application
    Client->>API: GET /api/tickets
    API->>DB: SELECT rowid as id,<br/>subject as title,<br/>body as description...
    DB-->>API: Return all tickets
    API-->>Client: JSON response<br/>(mapped field names)
    Client-->>User: Display ticket list<br/>with filters
    
    User->>Client: Click ticket card
    Client->>API: GET /api/tickets/:id
    API->>DB: SELECT WHERE rowid = ?
    DB-->>API: Single ticket data
    API-->>Client: Ticket details
    Client-->>User: Show modal with<br/>full description
    
    User->>Client: Apply filters<br/>(Priority/Type/Queue)
    Note over Client: Client-side filtering<br/>No API call needed
    Client-->>User: Filtered results
    
    User->>Client: Export to CSV
    Note over Client: Client-side export<br/>No API call needed
    Client-->>User: Download CSV file
```

---

## 5️⃣ Data Processing Flow

Copy this for data filtering and statistics:

```mermaid
---
title: Ticket Classification and Statistics
---
graph TD
    A[Raw Ticket Data] --> B{Priority Filter}
    B -->|high| C[High Priority<br/>Tickets]
    B -->|medium| D[Medium Priority<br/>Tickets]
    B -->|low| E[Low Priority<br/>Tickets]
    
    A --> F{Type Filter}
    F -->|request| G[Service Requests]
    F -->|problem| H[Problems]
    F -->|incident| I[Incidents]
    F -->|question| J[Questions]
    
    A --> K{Text Analysis}
    K --> L[Calculate<br/>Text Length]
    K --> M[Extract<br/>Common Words]
    K --> N[Determine<br/>Complexity]
    
    C --> O[Stats Dashboard]
    D --> O
    E --> O
    G --> O
    H --> O
    I --> O
    J --> O
    L --> O
    M --> O
    N --> O
    
    O --> P[React UI Display]
    
    style A fill:#f96,stroke:#333,stroke-width:3px
    style C fill:#ef4444,color:#fff,stroke:#333,stroke-width:2px
    style D fill:#f59e0b,color:#fff,stroke:#333,stroke-width:2px
    style E fill:#10b981,color:#fff,stroke:#333,stroke-width:2px
    style P fill:#3b82f6,color:#fff,stroke:#333,stroke-width:3px
```

---

## 📋 Field Mappings Reference

The application uses different field names than the database columns. The mapping is done in SQL SELECT queries:

| Database Column | API Field Name | Type | Description |
|----------------|----------------|------|-------------|
| `rowid` | `id` | int | Unique identifier |
| `subject` | `title` | string | Ticket subject/title |
| `body` | `description` | text | Detailed description |
| `type` | `status` | string | Current ticket status/type |
| `priority` | `priority` | string | Priority level |
| `queue` | `queue` | string | Support queue |
| `language` | `language` | string | Language code |

## 📊 Data Constraints

### Priority Values
- `low` - Low priority issues
- `medium` - Medium priority issues  
- `high` - High priority issues

### Type/Status Values
- `request` - Service requests
- `problem` - Technical problems
- `incident` - Critical incidents
- `question` - General questions

### Language Values
- `en` - English (only language in filtered database)

---

## 🔧 Technical Notes

### Database Details
- **Path**: `ITDB/data/english_support_tickets.db`
- **Type**: SQLite 3
- **Records**: ~1,000+ English support tickets
- **Access**: Python scripts (direct) + Node.js server (relative path)

### Key Design Decisions
1. **Single Table Design** - All ticket data in one `tickets` table for simplicity
2. **Column Aliasing** - Database columns mapped to cleaner API names in SELECT queries
3. **No Foreign Keys** - Standalone ticket records without user/department tables
4. **Text Storage** - `body` field as TEXT type for full descriptions
5. **Pre-filtered Data** - Database contains only English tickets

### SQL Query Example
```sql
-- This is how the server maps database columns to API fields
SELECT 
    rowid as id,
    subject as title,
    body as description,
    type as status,
    priority,
    queue,
    language
FROM tickets;
```

---

## 🚀 Quick Links

- **Live Editor**: https://mermaid.live/
- **Documentation**: https://mermaid.js.org/
- **GitHub Repo**: https://github.com/KalvinVar/TicketDB

---

## 💡 Tips for Using Mermaid Live Editor

1. **Copy any code block** from sections 1-5 above
2. **Paste into https://mermaid.live/**
3. **Edit in real-time** - changes render instantly
4. **Export options**: PNG, SVG, or copy link to share
5. **Theme options**: Try different themes in the editor settings

Enjoy visualizing your TicketDB architecture! 🎉
