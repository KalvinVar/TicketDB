# AI Coding Agent Instructions for TicketDB Project

## Project Overview
This is a **hybrid data science + full-stack web application** project that combines Python-based ticket data analysis with a TypeScript/React ticket management system. The project has two distinct components that share a common SQLite database.

## Architecture & Critical Paths

### 1. Database-Centric Architecture
- **Active Database**: `data/english_support_tickets.db` (SQLite) - contains real English support ticket data
- **Database Location**: Root `ITDB/data/` directory, accessed by both Python scripts and Node.js server
- **Critical Path**: Server accesses DB via relative path `../../../../data/english_support_tickets.db` from `ticket-app/server/src/config/database.ts`
- **Schema**: Tickets table with fields: `rowid (as id), subject (as title), body (as description), type (as status), priority, queue, language`
- **Important**: Schema maps database columns to application fields in the SELECT query - NOT in the database structure itself

### 2. Dual-Stack Structure
```
ITDB/                                    # Root - Python data science workspace
├── data/english_support_tickets.db      # Production database with English tickets
├── *.py                                 # Python analysis scripts
├── requirements.txt                     # Python dependencies
├── venv/                                # Python virtual environment
├── start-ticket-app.ps1                 # ONE-CLICK STARTUP SCRIPT
└── ticket-app/                          # TypeScript full-stack app
    ├── server/                          # Express.js + SQLite
    │   └── src/
    │       ├── config/database.ts       # DB connection (uses relative path)
    │       └── controllers/ticketController.ts  # Maps DB columns to API response
    └── client/                          # React + Vite
        └── src/
            ├── components/TicketList.tsx      # 900+ lines - advanced UI
            └── services/api.ts                # Axios client with proper typing
```

## Critical Developer Workflows

### Quick Start (RECOMMENDED)
```powershell
# ONE COMMAND to start everything from ITDB root
.\start-ticket-app.ps1

# This script:
# - Checks Node.js installation
# - Installs dependencies if needed
# - Starts server in separate window (port 3001)
# - Starts client in separate window (port 5173)
# - Provides status messages and URLs
```

### Python Environment Setup (Run from ITDB root)
```powershell
# MUST be run from C:\Users\Kalvin\OneDrive\ITDB
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Manual Full-Stack App Development
```powershell
# Terminal 1 - Server (from ITDB/ticket-app/server)
cd ticket-app\server
npm install
npm run dev                      # Runs on http://localhost:3001

# Terminal 2 - Client (from ITDB/ticket-app/client)  
cd ticket-app\client
npm install
npm run dev                      # Runs on http://localhost:5173
```

### Critical Dependency Note
- **Server uses**: `tsx` or `ts-node` for TypeScript execution (tsx preferred for compatibility)
- **Known Issue**: ts-node version conflicts - use `npm install --save-dev tsx` and update package.json to use `tsx watch src/index.ts`

## Project-Specific Conventions

### Python Scripts
- **Style**: Follow PEP 8 guidelines
- **Database Access**: All Python scripts connect to `data/english_support_tickets.db`
- **Analysis Pattern**: Scripts like `analyze_tickets.py`, `filter_english_tickets.py` use pandas + matplotlib
- **Testing**: Use pytest framework, run from root with `pytest tests/`

### TypeScript Server (ticket-app/server)
- **Pattern**: Function-based exports for controllers (NOT class-based)
- **Database**: Direct SQLite3 callbacks (NOT Mongoose or ORMs)
- **Column Mapping**: SELECT query maps DB columns to API field names:
  ```typescript
  // In ticketController.ts
  SELECT rowid as id, subject as title, body as description, 
         type as status, priority, queue, language FROM tickets
  ```
- **Error Handling**: Always return after sending response to prevent double-send
  ```typescript
  if (err) {
    res.status(500).json({ error: err.message });
    return;  // CRITICAL: prevent further execution
  }
  ```
- **API Routes**: All prefixed with `/api` (e.g., `/api/tickets`)
- **CORS**: Enabled for all origins in development
- **No Result Limits**: Fetches ALL tickets from database (removed LIMIT clause)

### React Client (ticket-app/client)
- **Build Tool**: Vite (NOT Create React App)
- **API Base URL**: `http://localhost:3001/api` (in `services/api.ts`)
- **Component Pattern**: Functional components with hooks + inline styles (NO CSS files)
- **Type Definitions**: Shared types in `src/types/index.ts`
- **Advanced Features**:
  - Multi-select checkbox filters (Type, Priority, Queue)
  - Search with live filtering
  - Sorting (by ID, Priority, Title) with asc/desc toggle
  - Pagination (10/20/50/100 per page)
  - CSV export functionality
  - Modal for detailed ticket view
  - Inline styles with hover effects and animations

### TypeScript Error Handling Pattern
```typescript
// In api.ts - ALWAYS use this pattern for error handling
catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('Error fetching tickets: ' + errorMessage);
}
```

## Integration Points & Data Flow

### Server ↔ Database
- **Connection**: Persistent SQLite connection in `server/src/config/database.ts`
- **Pattern**: Callback-based (`db.all`, `db.get`, `db.run`)
- **Transaction Management**: None (auto-commit per query)
- **Data Transformation**: Column aliasing in SQL query (e.g., `subject as title`)

### Client ↔ Server
- **HTTP Client**: Axios (in `client/src/services/api.ts`)
- **Endpoints**:
  - `GET /api/tickets` - Fetch ALL tickets (no limit)
  - `GET /api/tickets/:id` - Fetch single ticket
  - `POST /api/tickets` - Create ticket
- **No Authentication**: Open API (development mode)
- **Type Safety**: Proper TypeScript interfaces with optional fields

### Python ↔ Database
- **Connection**: Script-level sqlite3 connections (opened/closed per script)
- **Pattern**: Pandas `read_sql_query` for analysis
- **Datasets**: Multiple CSV files in root for ML training/testing

## UI/UX Design Patterns

### Styling Approach
- **NO CSS files**: All styles are inline React style objects
- **Color Scheme**:
  - High priority: `#ef4444` (red)
  - Medium priority: `#f59e0b` (orange)
  - Low priority: `#10b981` (green)
  - Primary action: `#3b82f6` (blue)
  - Background: `#f9fafb` (light gray)
- **Component Structure**:
  - Stats dashboard → Filter bar → Toolbar → Ticket cards → Pagination
  - Collapsible filter panel with checkbox groups
  - Modal overlay for detail view

### State Management Pattern
```typescript
// TicketList.tsx uses multiple useState hooks:
const [tickets, setTickets] = useState<Ticket[]>([]);
const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
const [sortBy, setSortBy] = useState<'id' | 'priority' | 'title'>('id');
const [currentPage, setCurrentPage] = useState<number>(1);
// NO Redux, NO Context API - just useState + useEffect
```

## Common Pitfalls & Solutions

### Path Issues
- **Problem**: Scripts fail with "file not found" when run from wrong directory
- **Solution**: Python scripts MUST run from `ITDB` root; use `pwd` to verify location
- **Server DB Path**: Carefully count `../` levels in relative path (currently `../../../../data/english_support_tickets.db`)

### TypeScript Compatibility
- **Problem**: ts-node version conflicts cause cryptic errors
- **Solution**: Replace `ts-node` with `tsx` in `package.json`: `"dev": "tsx watch src/index.ts"`

### TypeScript Error Types
- **Problem**: `error.message` causes "of type unknown" error
- **Solution**: Use type guard: `error instanceof Error ? error.message : 'Unknown error'`

### Database Schema Mismatch
- **Problem**: Database has different column names than API expects
- **Solution**: Use column aliasing in SQL: `SELECT subject as title, body as description`

### Port Conflicts
- **Server**: 3001 (change with `PORT` env var)
- **Client**: 5173 (Vite default, configurable in `vite.config.ts`)

## Key Files to Reference

### For Database Schema Understanding
- `filter_english_tickets.py` - Creates english_support_tickets.db with correct schema
- `ticket-app/server/src/controllers/ticketController.ts` - Column mapping in SELECT query
- `ticket-app/server/src/types/index.ts` - TypeScript type definitions

### For API Contract Understanding
- `ticket-app/server/src/routes/ticketRoutes.ts` - All endpoint definitions
- `ticket-app/client/src/services/api.ts` - Client-side API wrapper with TypeScript

### For UI Patterns
- `ticket-app/client/src/components/TicketList.tsx` - 900+ lines of advanced React patterns
- `ticket-app/client/src/components/TicketItem.tsx` - Card component with inline styles

### For Quick Start
- `start-ticket-app.ps1` - Production-ready startup script

## Testing Strategy
- **Python**: pytest in `tests/` directory
- **Server**: No test framework configured (add Jest/Vitest if needed)
- **Client**: No test framework configured (add Vitest + React Testing Library if needed)

## Environment Variables
- **Server**: Uses `dotenv` but no `.env` file currently configured
- **Client**: Vite env vars pattern (prefix with `VITE_`)
- **Python**: Kaggle API credentials in `%USERPROFILE%\.kaggle\kaggle.json` (for dataset downloads)

## Special Notes for AI Agents
1. **Always check current directory** before suggesting commands - path matters critically
2. **Database location is non-negotiable** - it's `data/english_support_tickets.db` at root
3. **When editing controllers**, use function exports, not classes - the existing pattern is function-based
4. **TypeScript versions** are pinned to avoid compatibility issues - don't suggest random upgrades
5. **This is Windows environment** - use PowerShell syntax (`;` for command joining, `.\venv\Scripts\activate`)
6. **Use start-ticket-app.ps1** when suggesting how to run the project - it's the canonical way
7. **NO separate CSS files** - all styling is done inline with style objects in React components
8. **Column mapping happens in SQL** - not in separate transformation layers
4. **TypeScript versions** are pinned to avoid compatibility issues - don't suggest random upgrades
5. **This is Windows environment** - use PowerShell syntax (`;` for command joining, `.\venv\Scripts\activate`)
