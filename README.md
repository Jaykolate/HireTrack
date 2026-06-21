# HireTrack 📋

A placement-tracking web application that helps you organize and monitor your job applications in one place. Track companies, roles, statuses, and notes — all tied to your personal account.

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-v5-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)

## Features

- **Dashboard** — Overview with stat cards (Total, Applied, Interview, Offer, Rejected) and a searchable applications table
- **CRUD Operations** — Add, edit, and delete job applications with company name, role, status, date, and notes
- **User Authentication** — Sign up / sign in powered by [Clerk](https://clerk.com); each user sees only their own applications
- **Server-Side Validation** — Required fields, max length checks, valid status enum, and no future dates — with friendly error messages that preserve your input
- **Empty State** — Friendly prompt when you haven't added any applications yet
- **Responsive Design** — Clean, card-based UI that works on desktop and mobile

## Tech Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Runtime        | Node.js                                 |
| Framework      | Express 5                               |
| Database       | MySQL with `mysql2/promise` (connection pooling) |
| Templating     | EJS + `express-ejs-layouts`             |
| Authentication | Clerk (`@clerk/express` + Clerk JS SDK) |
| Styling        | Vanilla CSS (hand-written, no frameworks) |

## Prerequisites

- **Node.js** v18 or higher
- **MySQL** 8.0 or higher
- A **Clerk** account with a project created at [clerk.com](https://clerk.com)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/HireTrack.git
cd HireTrack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Log in to MySQL and run the schema file:

```bash
mysql -u root -p < schema.sql
```

This creates the `hiretrack` database and the `applications` table.

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hiretrack

# Server
PORT=3000

# Clerk (get these from your Clerk dashboard)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 5. Run the app

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
HireTrack/
├── config/
│   └── db.js                  # MySQL connection pool
├── controllers/
│   └── applicationController.js  # CRUD logic + validation
├── routes/
│   └── applicationRoutes.js   # Route definitions with auth guards
├── views/
│   ├── partials/
│   │   └── layout.ejs         # Shared layout (navbar + Clerk SDK)
│   ├── dashboard.ejs          # Main dashboard with stats + table
│   ├── add.ejs                # New application form
│   ├── edit.ejs               # Edit application form
│   ├── sign-in.ejs            # Clerk sign-in page
│   └── sign-up.ejs            # Clerk sign-up page
├── public/
│   └── css/
│       └── style.css          # All styles
├── server.js                  # Express app entry point
├── schema.sql                 # Database schema
├── migrate.js                 # One-time migration helper
├── package.json
└── .env                       # Environment variables (not committed)
```

## API Routes

| Method   | Route                | Auth     | Description              |
| -------- | -------------------- | -------- | ------------------------ |
| `GET`    | `/`                  | Public   | Dashboard                |
| `GET`    | `/sign-in`           | Public   | Clerk sign-in page       |
| `GET`    | `/sign-up`           | Public   | Clerk sign-up page       |
| `GET`    | `/applications/new`  | Required | New application form     |
| `POST`   | `/applications`      | Required | Create application       |
| `GET`    | `/applications/:id`  | Required | Edit application form    |
| `PUT`    | `/applications/:id`  | Required | Update application       |
| `DELETE` | `/applications/:id`  | Required | Delete application       |

## Database Schema

```sql
CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,        -- Clerk user ID
  company_name VARCHAR(100) NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  status ENUM('Applied', 'Interview', 'Offer', 'Rejected') DEFAULT 'Applied',
  applied_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);
```

## Validation Rules

| Field          | Rules                                                  |
| -------------- | ------------------------------------------------------ |
| `company_name` | Required, max 100 characters                           |
| `role_title`   | Required, max 100 characters                           |
| `status`       | Must be: Applied, Interview, Offer, or Rejected        |
| `applied_date` | Required, valid date, cannot be in the future           |
| `notes`        | Optional                                               |

## License

ISC
