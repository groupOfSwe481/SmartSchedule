# SmartSchedule – Setup & Run Guide

This README was auto-generated from the uploaded archive.

## Repository Layout (selected)

```
SmartSchedule-1/.env
SmartSchedule-1/LoginReg.html
SmartSchedule-1/StudentHP.html
SmartSchedule-1/Students.html
SmartSchedule-1/assets/css/bootstrap.min.css
SmartSchedule-1/assets/css/dashboard.css
SmartSchedule-1/assets/css/style.css
SmartSchedule-1/assets/js/Sschedule.js
SmartSchedule-1/assets/js/bootstrap.bundle.min.js
SmartSchedule-1/assets/js/elective-form.js
SmartSchedule-1/assets/js/irregulars.js
SmartSchedule-1/assets/js/main.js
SmartSchedule-1/assets/js/notifications.js
SmartSchedule-1/assets/js/rules.js
SmartSchedule-1/backend/src/app.ts
SmartSchedule-1/backend/src/config/index.ts
SmartSchedule-1/backend/src/db/connection.ts
SmartSchedule-1/backend/src/db/database.ts
SmartSchedule-1/backend/src/db/models/Course.ts
SmartSchedule-1/backend/src/db/models/Deadlines.ts
SmartSchedule-1/backend/src/db/models/Level.ts
SmartSchedule-1/backend/src/db/models/Notification.ts
SmartSchedule-1/backend/src/db/models/Rule.ts
SmartSchedule-1/backend/src/db/models/Schedule.ts
SmartSchedule-1/backend/src/db/models/Section.ts
SmartSchedule-1/backend/src/db/models/Student.ts
SmartSchedule-1/backend/src/db/models/User.ts
SmartSchedule-1/backend/src/gemini/geminiClient.ts
SmartSchedule-1/backend/src/routes/Sschedule.ts
SmartSchedule-1/backend/src/routes/auth.ts
SmartSchedule-1/backend/src/routes/deadlineRoutes.ts
SmartSchedule-1/backend/src/routes/elective.routes.ts
SmartSchedule-1/backend/src/routes/irregularRoutes.ts
SmartSchedule-1/backend/src/routes/notificationRoutes.ts
SmartSchedule-1/backend/src/routes/ruleRoutes.ts
SmartSchedule-1/backend/src/routes/schedule.ts
SmartSchedule-1/backend/src/routes/studentRoutes.ts
SmartSchedule-1/backend/src/services/scheduleValidator.ts
SmartSchedule-1/backend/src/services/scheduler.ts
SmartSchedule-1/backend/tsconfig.json
SmartSchedule-1/css/dashboard.css
SmartSchedule-1/index.html
SmartSchedule-1/package-lock.json
SmartSchedule-1/package.json
SmartSchedule-1/rules.html
```

**Top-level entries:** SmartSchedule-1

## Tech Stack (auto-detected)

- Node.js/JavaScript project detected
- Likely Express/Node backend present

## Getting Started

### Prerequisites
- Node.js ≥ 18 and npm (or pnpm/yarn)

**Backend**:

```bash
cd SmartSchedule-1
npm install
```

### Run in Development

**Backend**:

```bash
cd SmartSchedule-1
npm run dev
```

### Common Ports Detected
4000

## Environment Variables

No .env.example found; variables inferred by static scan below.

**Variables referenced in code (scan):**
- GEMINI_API_KEY
- JWT_SECRET
- MONGODB_URI
- MONGO_URI
- PORT

Create a `.env` file in each service (root/backend/frontend as appropriate). Example:
```ini
# Server
PORT=4000
MONGODB_URI=mongodb://localhost:27017/SmartScheduleDB
JWT_SECRET=change_me
CORS_ORIGIN=http://localhost:3000

# Frontend
VITE_API_BASE=http://localhost:4000
NEXT_PUBLIC_API_BASE=http://localhost:4000
```
> Adjust names based on your actual code and any `.env.example` files.

## Build & Production

**Backend**:

```bash
cd SmartSchedule-1
npm run build
npm start
```

- Build script not detected for frontend.

## Demo Credentials (for local testing)

- **sch@gmail.com** / **1234**
- **444200112@student.ksu.edu.sa** / **1234**
If you have a seed script, run it (e.g., `npm run seed`) to create demo users.

## Useful Scripts (auto-detected)

### Root
- (none)
### Backend
- `dev` → nodemon --watch backend/src --exec tsx backend/src/app.ts
- `build` → tsc
- `start` → node dist/app.js
- `check` → tsc --noEmit
### Frontend
- (none)


