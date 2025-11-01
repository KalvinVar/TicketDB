# AI Coding Agent Instructions for TicketDB

## Project Architecture

**Hybrid System**: Python data analytics + TypeScript full-stack ticket management sharing SQLite database

### Core Stack
- **Backend**: Express.js + TypeScript, function-based controllers (NOT classes)
- **Frontend**: React 18 + Vite, inline styles only (NO CSS files), functional components + hooks
- **Database**: SQLite at `data/english_support_tickets.db` - direct connections with callbacks (NO ORM)
- **Auth**: JWT (8h employee, 7d user) + bcrypt, dual login system (users vs employees)
- **Python**: pandas + matplotlib for ticket analysis, pytest for testing

### Database Access Pattern (CRITICAL)
```typescript
// Server path from ticket-app/server/src/config/database.ts
const dbPath = '../../../../data/english_support_tickets.db';

// Column aliasing in queries (NOT in schema)
SELECT rowid as id, subject as title, body as description FROM tickets

// Callback pattern (NO promises/async-await for DB)
db.all(query, params, (err, rows) => {
  if (err) { res.status(500).json({ error: err.message }); return; }
  res.json(rows);
});
```

**Why this matters**: Path is relative and fragile. DB operations are callback-based. Always `return` after error responses to prevent double-send.

## Security & Permission System

### RBAC Implementation
- **Roles**: admin > manager > agent > viewer (stored in `employees.role`)
- **Permissions**: JSON array of permission IDs in `employees.permissions` column
- **16 Permissions**: Including `view_audit_logs` (admin-only), `view_all_tickets`, `manage_employees`, etc.

### Middleware Chain Pattern
```typescript
// From ticket-app/server/src/routes/adminRoutes.ts
router.post('/employees',
  authenticate,              // Verify JWT
  requireAdmin,              // Check role='admin'
  validateEmployeeCreation,  // express-validator rules
  auditLog('employee_create', req => `Created employee ${req.body.email}`),
  createEmployee             // Controller
);
```

### Audit Logging (Critical Feature)
- **Table**: `audit_logs` with IP, user agent, request_data (sanitized), target tracking
- **Middleware**: `auditLog(actionType, getDescription)` intercepts `res.json()` to log after success
- **Role-Based Viewing**: Admins see all, managers see department, agents see agents (SQL WHERE filtering)
- **UI**: `/employee/audit-logs` with modal detail view, 869 lines in `AuditLogs.tsx`

## Development Workflows

### Quick Start (Windows PowerShell)
```powershell
# ONE COMMAND from ITDB root
.\start-ticket-app.ps1

# Manual (2 terminals)
# Terminal 1: cd ticket-app\server ; npm run dev  # Port 3001
# Terminal 2: cd ticket-app\client ; npm run dev  # Port 5173
```

### Python Environment (MUST run from ITDB root)
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
pytest tests/  # Run tests
```

### Common Issues
1. **ts-node conflicts**: Use `tsx` instead - `"dev": "tsx watch src/index.ts"`
2. **Path errors**: Python scripts MUST run from ITDB root
3. **Port conflicts**: Server 3001, Client 5173 (check with `netstat -ano | findstr :3001`)
4. **TypeScript errors**: Use `error instanceof Error ? error.message : 'Unknown error'` pattern

## Project-Specific Conventions

### Backend (ticket-app/server/src)
**Function exports, NOT classes**:
```typescript
// ✅ Correct pattern
export const getTickets = (req: Request, res: Response) => { ... }

// ❌ Avoid
export class TicketController { ... }
```

**Validation Pattern** (express-validator):
```typescript
// From middleware/validation.ts
export const validateTicketCreation = [
  body('title').trim().isLength({ min: 5, max: 500 }),
  body('description').trim().isLength({ min: 10, max: 5000 }),
  handleValidationErrors  // Always last
];
```

**Migration Pattern**:
```typescript
// Run on server startup from index.ts
import { addViewAuditLogsPermission } from './migrations/add_view_audit_logs_permission';
addViewAuditLogsPermission();  // Checks existence before inserting
```

### Frontend (ticket-app/client/src)
**Inline Styles Only**:
```typescript
const cardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  cursor: 'pointer',
  transition: 'box-shadow 0.2s'
};
```

**State Management**: Multiple `useState` hooks, NO Redux/Context for simple state
```typescript
const [tickets, setTickets] = useState<Ticket[]>([]);
const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
```

**Auth Context Pattern**:
```typescript
// From contexts/AuthContext.tsx
const { employee, hasPermission, refreshEmployeePermissions } = useAuth();
if (!hasPermission('view_audit_logs')) navigate('/employee/dashboard');
```

**API Client** (services/api.ts):
```typescript
// Axios with base URL http://localhost:3001/api
const response = await api.get('/tickets', {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Integration Points

### Server ↔ Database
- **Connection**: Persistent `sqlite3.Database` in `config/database.ts`
- **Transactions**: None - auto-commit per query
- **No Limits**: Fetch ALL records (removed LIMIT clauses)

### Client ↔ Server
- **CORS**: Enabled for all origins in dev
- **Endpoints**: `/api/tickets`, `/api/auth/employee/login`, `/api/employees`, `/api/audit-logs`
- **Auth**: Bearer token in Authorization header, verified by `authenticate` middleware

### Python ↔ Database
- **Pattern**: Script-level connections, `pandas.read_sql_query()` for analysis
- **Datasets**: CSV files in root for ML training

## Key Files Reference

### Essential Reading
- `ticket-app/server/src/middleware/auth.ts` - JWT verification, permission checks
- `ticket-app/server/src/middleware/audit.ts` - Audit logging system (logAudit, getAuditLogs)
- `ticket-app/server/src/controllers/authController.ts` - Login, registration, refreshEmployeeToken
- `ticket-app/client/src/contexts/AuthContext.tsx` - Global auth state, refreshEmployeePermissions
- `ticket-app/client/src/pages/AuditLogs.tsx` - 869 lines, advanced filtering/modal UI
- `docs/mermaid-er-diagram.txt` - Complete database schema visualization

### Database Schema Queries
```bash
# From ticket-app/server directory
node get_schema.js  # Prints all CREATE TABLE statements
```

## Windows Environment Notes
- **PowerShell syntax**: Use `;` for command chaining, `.\venv\Scripts\activate` for venv
- **Paths**: Backslashes in file paths, forward slashes in URLs
- **Start script**: `start-ticket-app.ps1` is canonical way to launch project

## Git & Version Control
- **Default Branch**: `main` (NOT master)
- **Push Commands**: Always use `git push origin main` or `git push -u origin main`
- **Branch Creation**: Use `git branch -M main` to rename master to main if needed
- **Sensitive Files**: `.env` files are gitignored - NEVER commit JWT secrets or passwords
- **Protected Files**: `data/` directory, `node_modules/`, `*.db` files are excluded via .gitignore

## What NOT to Do
1. ❌ Don't add CSS files - use inline styles
2. ❌ Don't use Mongoose/ORMs - direct SQLite callbacks
3. ❌ Don't use class-based controllers - function exports
4. ❌ Don't suggest TypeScript version upgrades - pinned for compatibility
5. ❌ Don't add LIMIT clauses to ticket queries - fetch all records
6. ❌ Don't forget `return` after error responses - prevents double-send
7. ❌ Don't run Python scripts from wrong directory - MUST be ITDB root
8. ❌ Don't modify database schema without creating migration file

## Recent Session Work (Nov 1, 2025)
- Implemented comprehensive audit logging system with role-based access
- Created `view_audit_logs` permission (ID: 16) with admin-only assignment
- Built professional audit logs UI with modal detail view (AuditLogs.tsx)
- Added refresh permissions feature (no logout required)
- Fixed timezone display (UTC → local), navigation bugs, permission schema issues
- See README.md "Full Session Summary" for complete details

## Testing Strategy
- **Python**: pytest in `tests/` directory
- **Backend**: No framework configured (consider Jest/Vitest)
- **Frontend**: No framework configured (consider Vitest + React Testing Library)
