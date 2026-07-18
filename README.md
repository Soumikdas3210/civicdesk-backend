# CivicDesk Backend

A civic grievance management system backend. Citizens report public-service
issues such as water, electricity, roads, and sanitation. Grievances route
by department and geographic ward to eligible officers, who resolve them
under service-level targets.

Built as the mid-term backend project for Advanced Web Technology (AIUB).
The frontend is a separate repository, built in the final term.

## Tech stack

- NestJS + TypeScript
- PostgreSQL + TypeORM
- JWT authentication, role-based access control (citizen, officer, admin)
- Swagger / OpenAPI

## Getting started

1. Clone the repository:
```bash
   git clone https://github.com/Soumikdas3210/civicdesk-backend
   cd civicdesk-backend
```

2. Install dependencies:
```bash
   npm i
```

3. Copy the environment template and fill in your own values:
```bash
   cp .env.example .env
```
   At minimum, set `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` to match
   your local setup.

4. Create the database:
```bash
   createdb civicdesk
```
   (Or create it manually in pgAdmin: right-click Databases -> Create ->
   Database -> name it `civicdesk`.)

5. Start the app in watch mode:
```bash
   npm run start:dev
```

6. Open `http://localhost:3000/api` for the Swagger docs.

## Important: `synchronize: true`

TypeORM's `synchronize` option is enabled only when `NODE_ENV=development`.
It auto-creates and auto-alters database tables and columns to match your
entity definitions on every restart. This is convenient for local
development but destructive: it can drop and recreate columns, and it
must never run against a production database. If `NODE_ENV` is anything
other than `development`, synchronize is off, and schema changes must go
through a proper migration instead.

## Project structure

All feature modules are flat siblings under `src/`: `auth`, `users`,
`departments`, `wards`, `categories`, `sla`, `grievances`, `messages`,
and `common`. No module nests inside another.

## Git workflow

- `main`: stable, tagged at each milestone (`v0.1`, `v0.2`, ...). Never
  committed to directly.
- `dev`: integration branch. Every feature merges here first via PR.
- `feature/m<N>-short-name`: one branch per feature, branched from `dev`,
  merged back via PR.

Branch protection on `main` and `dev` requires a pull request and a
passing CI check before merge.

## Status

Milestone 1 (Foundation) complete. See the Workflow document for the
full milestone plan.