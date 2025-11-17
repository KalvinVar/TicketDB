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

## ML Features (Nov 14, 2025)

### Machine Learning Stack
- **Models**: Random Forest classifiers (scikit-learn) for type/priority prediction
- **Sentiment**: HuggingFace DistilBERT (distilbert-base-uncased-finetuned-sst-2-english)
- **Service**: Flask microservice on port 5001 with CORS enabled
- **Integration**: Express proxy endpoints at `/api/ml/*` with authentication
- **Training Data**: `english_support_tickets.csv` (11,923 tickets)

### Model Performance
- **Type Classification**: 80.38% accuracy (300 estimators, 5000 TF-IDF features, trigrams)
- **Priority Prediction**: 57.11% accuracy (same configuration)
- **Sentiment Analysis**: Pre-trained model with emotion mapping (angry/frustrated/concerned/neutral/satisfied)

### ML Service Startup (CRITICAL)
```powershell
# Terminal 1: ML Service (MUST be running first)
cd C:\Users\Kalvin\OneDrive\ITDB
.\venv\Scripts\Activate.ps1
cd ml_models
python ml_service.py  # Port 5001

# Terminal 2: Express Server
cd ticket-app\server
npm run dev  # Port 3001

# Terminal 3: React Client  
cd ticket-app\client
npm run dev  # Port 5173
```

**Why this matters**: Express `/api/ml/*` endpoints proxy to Flask service. If Flask is down, you get 503 errors. Always check Flask is running with `netstat -ano | findstr :5001`.

### ML API Response Structure (CRITICAL)
```typescript
// /api/ml/predict-full returns nested structure:
{
  category: {
    type: "incident",              // Direct string
    confidence: 0.85,              // Direct number
    priority: {                    // NESTED object!
      prediction: "high",          // The actual priority value
      confidence: 0.72             // The priority confidence
    }
  },
  sentiment: {
    sentiment: "NEGATIVE",
    score: 0.92,
    emotion: "angry",
    urgency_flag: true
  }
}

// UI must access: mlPredictions.category.priority.prediction (not .priority directly)
```

**Type Normalization**: Flask returns lowercase types (`incident`, `request`, `problem`, `question`) to match API validation requirements. CSV data is capitalized but mapped during prediction.

### ML UI Integration Pattern
**User Ticket Creation** (`CreateTicket.tsx`):
- Toggle button for ML suggestions (🤖 ML ON/OFF)
- 800ms debounce on text input using `useRef<NodeJS.Timeout>` (prevents API spam)
- Real-time predictions shown in suggestion cards with confidence %
- Apply buttons to auto-fill type/priority fields
- Sentiment display with emoji indicators and urgency flags

**Employee Ticket Creation** (`TicketList.tsx`):
- Same ML features in modal create form
- Uses `mlDebounceTimer = useRef<NodeJS.Timeout | null>(null)` for debouncing
- Defensive `typeof` checks for nested priority object
- Character counters (title: 5-500, description: 10-5000)
- Disabled submit button when validation fails
- Red border + inline error messages for invalid inputs

### Common ML Issues & Solutions
1. **429 Too Many Requests**: Removed `apiLimiter` from `mlRoutes.ts` - ML endpoints use only `authenticate` middleware
2. **React "Objects not valid as React child"**: Priority is nested object `{prediction, confidence}` - must access `.prediction`
3. **ML service not reloading**: Use `Stop-Process -Name python -Force` to kill all Python processes before restarting
4. **Type capitalization errors**: Flask maps CSV capitalized types (`Incident` → `incident`, `Change` → `question`)
5. **Employee ID undefined**: Use `req.employee.id` not `req.user.employeeId` for employee-created tickets

### ML Files Reference
- `ml_models/train_classifier.py` (314 lines) - Enhanced Random Forest training with balanced classes
- `ml_models/sentiment_analyzer.py` (149 lines) - DistilBERT wrapper with emotion mapping
- `ml_models/ml_service.py` (305 lines) - Flask API with type normalization at lines 112-140 (category), 215-245 (full)
- `ticket-app/server/src/controllers/mlController.ts` (165 lines) - Express proxy with axios error handling
- `ticket-app/server/src/routes/mlRoutes.ts` - ML routes (NO rate limiting!)
- `ticket-app/client/src/pages/CreateTicket.tsx` (620 lines) - User ML UI
- `ticket-app/client/src/components/TicketList.tsx` (1539 lines) - Employee ML UI with validation

### ML Training & Retraining
```powershell
cd ml_models
python train_classifier.py  # Updates models in ml_models/models/ directory
# Restart ml_service.py to reload models
```

Models stored: `vectorizer.pkl`, `type_classifier.pkl`, `priority_classifier.pkl`, `metadata.json`

## Form Validation Pattern (Nov 14, 2025)

### Character Counter & Validation UI
```typescript
// Real-time validation feedback pattern
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <label>Title *</label>
  <span style={{ color: title.length < 5 ? '#ef4444' : '#10b981' }}>
    {title.length}/500 (min: 5)
  </span>
</div>
<input 
  style={{ borderColor: title.length > 0 && title.length < 5 ? '#ef4444' : '#d1d5db' }}
  placeholder="Brief description (minimum 5 characters)"
/>
{title.length > 0 && title.length < 5 && (
  <div style={styles.validationError}>⚠️ Title must be at least 5 characters</div>
)}
```

**Validation Requirements** (from `validateTicketCreation` middleware):
- Title: 5-500 characters (trimmed)
- Description: 10-5000 characters (trimmed)
- Type: one of `['request', 'problem', 'incident', 'question']`
- Priority: one of `['low', 'medium', 'high']`

**Submit Button State**:
```typescript
<button 
  disabled={title.length < 5 || description.length < 10}
  style={{ opacity: isInvalid ? 0.5 : 1, cursor: isInvalid ? 'not-allowed' : 'pointer' }}
>
  Create Ticket
</button>
```

## Recent Session Work

### Nov 1, 2025 - Audit Logging System
- Implemented comprehensive audit logging with role-based access
- Created `view_audit_logs` permission (ID: 16) with admin-only assignment
- Built professional audit logs UI with modal detail view (AuditLogs.tsx)
- Added refresh permissions feature (no logout required)
- Fixed timezone display (UTC → local), navigation bugs, permission schema issues

### Nov 14, 2025 - ML Integration & Validation
- Trained Random Forest models (80.38% type accuracy, 57.11% priority)
- Built Flask ML microservice with 5 endpoints on port 5001
- Created Express ML proxy with authentication (`mlController.ts`, `mlRoutes.ts`)
- Integrated ML suggestions in user ticket creation with toggle UI
- Extended ML features to employee ticket creation modal
- Fixed debounce issues using `useRef` for timer persistence
- Fixed React rendering errors with nested priority object structure
- Fixed employee ID extraction (`req.employee.id` vs `req.user.employeeId`)
- Added character counters, real-time validation, and disabled submit states
- Removed rate limiting from ML endpoints (was causing 429 errors)

## Testing Strategy
- **Python**: pytest in `tests/` directory
- **Backend**: No framework configured (consider Jest/Vitest)
- **Frontend**: No framework configured (consider Vitest + React Testing Library)
- **ML Models**: Train on full dataset, validate with cross-validation in `train_classifier.py`
