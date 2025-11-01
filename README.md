# TicketDB - Support Ticket Management System

A full-stack ticket management system with comprehensive security features, audit logging, and role-based access control.

## Full Session Summary (November 1, 2025)

### 1. Security Audit Logging System (Complete Implementation)
**What We Built:**
- **Database Schema**: Created `audit_logs` table with 10 fields:
  - Core: `id`, `employee_id`, `action_type`, `action_description`
  - Target tracking: `target_type`, `target_id`
  - Security data: `ip_address`, `user_agent`, `request_data`
  - Timestamp: `created_at`
  - Indexes: Created 3 indexes for performance (employee_id, action_type, created_at)
  
- **Backend Middleware** (`audit.ts`):
  - `logAudit()`: Inserts audit entries into database
  - `auditLog()`: Middleware that automatically logs sensitive actions after successful responses
  - Request data sanitization (redacts passwords)
  - Captures IP addresses and user agents from requests
  - `getAuditLogs()`: Retrieves logs with role-based filtering

- **Audit Integration**: Added audit logging to critical routes:
  - Employee creation, updates, deactivation/activation
  - Permission changes (grant/revoke)
  - Password changes
  - Login/logout events
  - Ticket assignments

### 2. Audit Logs UI (Professional Interface)
**What We Built:**
- **Main Features**:
  - Full-page audit log viewer at `/employee/audit-logs`
  - Statistics dashboard showing total logs and action type breakdown
  - Real-time filtering by action type and employee name
  - Search functionality across all fields
  - Pagination (50 logs per page)
  - Responsive card-based layout with color-coded action types
  
- **Modal Detail View** (Replaced basic alert):
  - Three sections: Action Info, Performing Employee, Target Employee
  - Shows full action details with formatted timestamps
  - Displays IP address, user agent, and request data
  - JSON request data displayed in code block with syntax highlighting
  - Close button and background click to dismiss

- **UI/UX Enhancements**:
  - Color coding: Red (employee_update), Blue (permission_change), Purple (employee_create), etc.
  - Hover effects on cards
  - Loading states with spinners
  - Error handling with user-friendly messages
  - Empty state when no logs found
  - Back to Dashboard button with correct navigation

### 3. Role-Based Audit Log Access Control
**What We Built:**
- **New Permission**: `view_audit_logs` (ID: 16)
  - Resource: `audit_logs`
  - Action: `read`
  - Admin-only assignable (locked with 🔒 in UI)
  
- **Database-Level Filtering** (Security by Design):
  - **Admins**: See ALL audit logs (no filter)
  - **Managers**: See own logs + department logs
    - SQL: `WHERE employee_id = current OR department_id = current_dept`
  - **Agents**: See own logs + other agent logs
    - SQL: `WHERE employee_id = current OR role = 'agent'`
  - **Other Roles**: See only their own logs
    - SQL: `WHERE employee_id = current`
  
- **Permission Checks**:
  - Requires `view_audit_logs` OR `admin_access` permission
  - Frontend: Redirects to dashboard if unauthorized
  - Backend: Returns 403 if permission check fails

### 4. Refresh Permissions Feature
**What We Built:**
- **Backend Endpoint**: `POST /auth/employee/refresh`
  - Fetches fresh employee data from database
  - Re-queries permissions table for latest permission assignments
  - Converts permission IDs to names
  - Generates new JWT token with 8-hour expiry
  - Returns updated token and employee object
  
- **Frontend Implementation**:
  - Added "🔄 Refresh Permissions" button on Employee Dashboard
  - `refreshEmployeePermissions()` method in AuthContext
  - Updates localStorage and axios headers automatically
  - Shows loading state during refresh
  - Success/error message bar
  - Auto-reloads UI after 1 second on success
  
- **User Experience**:
  - No logout required to see new permissions
  - Instant UI update reflecting new access
  - Useful for admins testing permission changes

### 5. Audit Log Enhancements
**What We Fixed/Improved:**
- **Timezone Display Bug**:
  - Problem: SQLite stores UTC, JavaScript parsed as local time
  - Solution: Append 'Z' to dateString before parsing: `new Date(dateString + 'Z')`
  - Result: Correct local time display in all components
  
- **Employee Name vs ID**:
  - Changed employee ID filter to employee name filter
  - Added employee name column to audit logs display
  - Shows full names instead of IDs in log cards
  
- **Target Employee Information**:
  - Added second LEFT JOIN in SQL: `LEFT JOIN employees te ON al.target_id = te.id`
  - Descriptions now show: "Employee admin@ticketdb.com updated permissions for employee John Doe (ID 3)"
  - Modal shows both performing employee and target employee details
  
- **Navigation Bug Fix**:
  - Problem: Back button used wrong path (`/employee-dashboard` vs `/employee/dashboard`)
  - Fixed in two places: AuditLogs.tsx and other components
  - Now correctly navigates without logging out

### 6. Migration & Database Schema
**What We Fixed:**
- **Permission Schema Issue**:
  - Created migration: `add_view_audit_logs_permission.ts`
  - Added `resource` and `action` columns to INSERT statement
  - Values: `resource='audit_logs'`, `action='read'`
  - Migration runs on server startup
  
- **Manual Database Update**:
  - Manually inserted permission with correct schema
  - Verified permission exists with ID: 16
  - Tested assignment to employees

### 7. Admin Controller Updates
**What We Added:**
- **Restricted Permissions List**:
  - Added `view_audit_logs` to restricted permissions array
  - Only admins can grant/revoke this permission
  - Managers and agents cannot assign audit log viewing permission
  
- **Permission Management UI**:
  - Shows 🔒 icon for admin-only permissions
  - Disabled checkbox for non-admins
  - Tooltip explaining restriction

### Problems We Encountered & Solved:
1. **Navigation Bug**: Back button logged users out
   - **Cause**: Wrong path `/employee-dashboard` instead of `/employee/dashboard`
   - **Fix**: Updated paths in AuditLogs.tsx and other components
   
2. **Timezone Display Issue**: Times showing incorrectly
   - **Cause**: SQLite stores UTC but JavaScript parsed as local time
   - **Fix**: Append 'Z' to date strings before parsing
   
3. **Permission Schema Mismatch**: INSERT failed with missing columns
   - **Cause**: Migration didn't include `resource` and `action` fields
   - **Fix**: Updated migration with proper schema
   
4. **Permission Not Displaying**: New permission didn't show until restart
   - **Cause**: LocalStorage caching old token with stale permissions
   - **Fix**: Implemented refresh permissions feature
   
5. **Target Employee Names Missing**: Only IDs shown in descriptions
   - **Cause**: No JOIN to fetch target employee details
   - **Fix**: Added second LEFT JOIN in SQL query
   
6. **Role-Based Access**: Needed granular control over who sees what logs
   - **Cause**: No filtering logic for different roles
   - **Fix**: Implemented database-level WHERE clauses based on role

### Files Created/Modified:
**Backend:**
- `server/src/middleware/audit.ts` - Complete audit system
- `server/src/controllers/authController.ts` - Added refreshEmployeeToken()
- `server/src/routes/authRoutes.ts` - Added /auth/employee/refresh route
- `server/src/routes/adminRoutes.ts` - Added audit middleware to sensitive routes
- `server/src/migrations/add_view_audit_logs_permission.ts` - New migration
- `server/src/controllers/adminController.ts` - Added view_audit_logs to restricted list
- `server/src/index.ts` - Import and run migration

**Frontend:**
- `client/src/pages/AuditLogs.tsx` - Complete UI with modal (869 lines)
- `client/src/pages/EmployeeDashboard.tsx` - Added refresh button
- `client/src/pages/ManageEmployees.tsx` - Added permission restrictions
- `client/src/contexts/AuthContext.tsx` - Added refreshEmployeePermissions()

**Database:**
- Created `audit_logs` table
- Added `view_audit_logs` permission (ID: 16)
- Added indexes for performance

### What Could Be Improved/Implemented:
- **Security Enhancements**:
  - Add 2FA/MFA for admin accounts
  - Implement session management (track active sessions, force logout)
  - Add IP whitelisting for admin actions
  - Implement password expiration policies
- **Audit Log Features**:
  - Export audit logs to CSV/PDF for compliance
  - Add date range filter
  - Real-time updates (WebSocket notifications)
  - Email alerts for critical actions (admin deactivation, mass permission changes)
  - Retention policy (archive old logs after X days)
- **Permission Management**:
  - Bulk permission assignment
  - Permission templates/roles presets
  - Permission inheritance (department-level permissions)
  - Audit trail for permission changes (who granted/revoked what)
- **UI/UX Improvements**:
  - Dark mode toggle
  - Customizable dashboard layouts
  - Advanced filtering with saved filter presets
  - Mobile-responsive design improvements
- **Performance**:
  - Add caching layer (Redis)
  - Implement virtual scrolling for large audit log lists
  - Database query optimization with proper indexes
  - Lazy loading for permission lists
- **Developer Experience**:
  - Add API documentation (Swagger/OpenAPI)
  - Create automated tests (Jest/Vitest for backend, React Testing Library for frontend)
  - Add CI/CD pipeline
  - Environment-specific configs (dev/staging/prod)

---

## Project Structure

```
ITDB/
├── data/                          # SQLite database
│   └── english_support_tickets.db
├── ticket-app/                    # Full-stack application
│   ├── server/                    # Express.js backend
│   │   └── src/
│   │       ├── controllers/       # Business logic
│   │       ├── middleware/        # Auth, validation, audit
│   │       ├── routes/            # API endpoints
│   │       └── migrations/        # Database migrations
│   └── client/                    # React frontend
│       └── src/
│           ├── components/        # Reusable components
│           ├── pages/             # Page components
│           ├── contexts/          # React contexts
│           └── services/          # API services
└── *.py                          # Python data analysis scripts
```

## Quick Start

### Option 1: One-Click Startup (Recommended)
```powershell
.\start-ticket-app.ps1
```

### Option 2: Manual Startup
```powershell
# Terminal 1 - Server
cd ticket-app\server
npm install
npm run dev

# Terminal 2 - Client
cd ticket-app\client
npm install
npm run dev
```

- **Server**: http://localhost:3001
- **Client**: http://localhost:5173

## Features

### Security
- JWT authentication with 8-hour expiry
- bcrypt password hashing
- Rate limiting (login, API, password changes)
- Input validation with express-validator
- Database re-verification middleware
- Comprehensive audit logging
- SQL injection prevention

### Role-Based Access Control
- **Roles**: Admin > Manager > Agent > Viewer
- **Permissions**: Granular permission system
- **Audit Logs**: Role-based log visibility
- **Self-Edit Prevention**: Users cannot modify their own permissions

### Audit System
- Tracks all sensitive actions
- Captures IP addresses and user agents
- Professional UI with filtering and search
- Role-based access (Admins see all, Managers see department, Agents see agents)
- Modal detail view with full action information

### Employee Management
- Create, edit, activate/deactivate employees
- Assign roles and permissions
- Department-based organization
- Permission refresh without logout

## Python Data Science Setup

To run the Python data analysis scripts:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

## Running Tests

```powershell
# Python tests
pytest tests/

# Server tests (if configured)
cd ticket-app\server
npm test

# Client tests (if configured)
cd ticket-app\client
npm test
```

## Environment Variables

Create `ticket-app/server/.env`:
```
JWT_SECRET=your-64-character-secret-here
BCRYPT_SALT_ROUNDS=10
PORT=3001
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
DB_PATH=../../../../data/english_support_tickets.db
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Axios
- **Backend**: Node.js, Express, TypeScript, SQLite
- **Security**: JWT, bcrypt, express-rate-limit, express-validator
- **Python**: pandas, matplotlib, sqlite3

## Documentation

- [Backend Implementation](docs/BACKEND_IMPLEMENTATION.md)
- [ER Diagram](docs/ER-Diagram.md)
- [Security Improvements](SECURITY_IMPROVEMENTS.md)

## License

This project is for educational purposes.

