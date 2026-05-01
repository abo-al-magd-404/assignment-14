# Social Media Project (Part Three)

**Assignment 14**  
Group: Node_C45_Mon&Thurs_9:00pm (Online)  
Author: Mohamed Mahmoud Abo Al Magd

---

## Overview

This repository implements a production-grade backend for a modern social media platform (Part Three), focusing on extensible authentication, user profile management, and integrated cloud asset handling.

## Core Features

- **Authentication**
  - Traditional email/password registration & login
  - Google OAuth (Gmail) sign-up and login
  - Email confirmation & re-sending confirmation flow
- **User Profile Management**
  - JWT-based session management (secure token rotation, logout)
  - Profile viewing & protected updates with role-based authorization
  - Upload profile image & cover images via cloud storage
- **Cloud Storage Integration**
  - File upload/download with streaming, S3-compatible presigned URLs
  - Secure, efficient asset delivery for profile/media images
- **Soft Delete & Restore**
  - Users can be soft-deleted and restored; enforced via repository pattern and middleware
- **Robust Middleware**
  - Centralized Express error handling
  - CORS configuration
  - Central validation (using zod and express middleware)
- **Ready for Production**
  - TypeScript, strict config, environment separation
  - Code organized by modules
  - Multi-environment `.env` support

## Project Structure

- `src/main.ts` – Bootstraps the application.
- `src/app.bootstrap.ts` – Configures and launches the Express app, DB, Redis, routers, middleware, and streaming endpoints.
- `src/modules/`
  - `auth/` – Authentication logic (`auth.controller.ts`, `auth.service.ts`, Gmail integration)
  - `user/` – User profile API (`user.controller.ts`, upload, token rotation)
- `src/common/` – Shared code (responses, enums, utilities)
- `src/middleware/` – Authentication, authorization, error handler, validation
- `src/config/`, `src/DB/` – Configuration and database connection

## Tech Stack

- **Runtime:** Node.js (CommonJS, ES2023)
- **Language:** TypeScript (strict, isolated modules)
- **Frameworks/Libraries:** Express, Mongoose, Redis, Cloudinary/AWS S3 SDK, Zod, Multer, JSON Web Tokens, Nodemailer
- **Dev Tools:** cross-env, concurrently, @types/*

## API Endpoints – Highlights

- `POST  /auth/signup` & `/auth/login` – Register & login
- `PATCH /auth/confirm-email` – Confirm email address
- `POST  /auth/signup/gmail` & `/auth/login/gmail` – Google sign-in
- `PATCH /user/profile-image` – Signed URL for uploading profile image
- `GET   /user` – Authenticated profile fetch
- `POST  /user/rotate-token` – Refresh JWT credentials
- `GET   /uploads/*path` & `/presigned/*path` – File download/stream, presigned URL generation

## Setup & Run

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Environment config:**  
   Copy `.env.example` to `.env.development` or `.env.production` and set your secrets for MongoDB, Redis, Cloud Storage, etc.
3. **Build & start (dev):**
   ```sh
   npm run start:dev
   ```
4. **Production:**
   ```sh
   npm run start:prod
   ```

## Architecture Notes

- **Modular**: All business logic is organized in feature-based modules (auth, user).
- **Tested Middleware**: The `app.bootstrap.ts` tests user repository CRUD & middleware in the boot process.
- **Secure by Default**: Uses strict TypeScript, token validation, RBAC, rate limiting (with Redis potential), and detailed validation.

---

## Author & Assignment

- **Assignment Name:** Social Media Project (Part Three) | ASSIGNMENT 14
- **Name:** Mohamed Mahmoud Abo Al Magd
- **Group:** Node_C45_Mon&Thurs_9:00pm (Online)

---

> For complete API routes and schema details, see the source files inside `/src/modules/auth` and `/src/modules/user`.
