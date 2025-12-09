# Copilot Instructions: Rahmah Exchange Frontend

## Project Overview

**Rahmah Exchange** is a Next.js 16 + React 19 application managing zakat grant applications with real-time messaging and document management. The system serves three user types: applicants (form submission + portal access), caseworkers (case management), and approvers (decision-making). Built with Mongoose, Vercel Blob storage, and Radix UI components.

## Architecture: Key Components & Data Flows

### 1. **Authentication & User Management**
- **Two-tier authentication:**
  - **Staff** (caseworkers/approvers): JWT in Authorization header via `authenticateRequest()` middleware
  - **Applicants**: Magic link JWT stored in `sessionStorage`, validated per API call via query param `?token=JWT`
- **Key files:** `lib/auth-middleware.ts`, `lib/jwt-utils.ts`, `lib/applicant-token-utils.ts`, `lib/models/User.ts`
- **User model includes:** `internalEmail` (auto-generated `firstname.lastname@rahmah.internal`), `role` (admin/caseworker/approver/applicant), auth token blacklisting via `BlacklistedToken` model
- **Pattern:** Always check token expiration and user existence; applicants cannot access other applicants' data

### 2. **Application Submission & Applicant Portal**
- **Flow:** Form at `/form` → POST `/api/zakat-applicants` → Generate 30-day JWT → Send email with magic link → Click link redirects to `/applicant-portal/login?token=JWT` → Portal page `/applicant-portal/[id]`
- **Magic link token:** JWT payload contains `{ applicantId, type: "applicant" }`, decoded using `APPLICANT_JWT_SECRET` env var
- **Portal features:** View application status, upload/delete documents, see audit trail
- **Key files:** `app/applicant-portal/login/page.tsx`, `app/applicant-portal/[id]/page.tsx`, `lib/applicant-token-utils.ts`
- **Important:** SessionStorage (not localStorage) clears on tab close for security; every API call must verify token matches applicantId

### 3. **Document Management & Audit Trail**
- **Upload:** POST `/api/zakat-applicants/[id]/documents?token=JWT` with multipart FormData, files stored in Vercel Blob, metadata saved to `ZakatApplicant.documents[]` array
- **Delete:** DELETE `/api/zakat-applicants/[id]/documents/[documentId]?token=JWT`, removes from Blob and database
- **Audit logging:** Every upload/delete creates `DocumentAudit` record with `applicantId`, `documentId`, `action` ("uploaded"/"deleted"), `uploadedBy` (email), `originalFilename`, `fileSize`, `mimeType`, `createdAt`
- **Constraints:** Max 10MB per file, only PDF/JPG/JPEG/PNG allowed
- **Key files:** `app/api/zakat-applicants/[id]/documents/route.ts`, `lib/models/DocumentAudit.ts`
- **Pattern:** All actions are immutable audit entries (no editing existing logs)

### 4. **Internal Messaging System**
- **Participants:** Applicants, caseworkers, approvers in `Conversation` per case
- **Models:** `Message` (sender, recipients, body, attachments, readBy, messageType), `Conversation` (participants with join dates, messageCount, lastMessage, isArchived)
- **Key endpoints:**
  - GET `/api/messages/conversations` - List user's conversations with unread counts
  - POST `/api/messages/conversations/create` - Create conversation for case
  - GET `/api/messages/conversations/[id]` - Get messages, auto-mark as read
  - POST `/api/messages/send` - Send message with file attachments (uploads to Vercel Blob)
- **Email notifications:** Sent to recipients on new message if `User.emailOnNewMessage` is true, uses template in `generateMessageEmailTemplate()`
- **Key files:** `app/api/messages/send/route.ts`, `lib/models/Message.ts`, `lib/models/Conversation.ts`, `lib/messaging-utils.ts`
- **Internal email pattern:** All communications use `internalEmail` format; validate with `isValidInternalEmail()` utility

### 5. **API Client & Error Handling**
- **Centralized client:** `lib/api-client.ts` exports `apiCall()`, `apiPost()`, `apiGet()`, `apiPut()`
- **Features:** Automatic retries (3x) on 5xx errors with exponential backoff, timeout handling (30s default), JSON validation, detailed error logging
- **Pattern:** Always use `apiCall()` wrapper instead of raw fetch; it returns `{ status, data, error }` structure
- **Example:** `const res = await apiPost('/api/zakat-applicants', formData); if (res.error) showError(res.error);`

## Project-Specific Conventions

### 1. **Database Connection & Models**
- **Always call `dbConnect()`** at start of API routes before database access: `await dbConnect()`
- **Models use Mongoose:** Each model in `lib/models/` exports as `export default model('ModelName', schema)`
- **Indexes:** Create indexes on frequently queried fields (caseId, applicantId, conversationId, createdAt for sorting)
- **Soft deletes:** Use `isDeleted: Boolean` flag instead of true deletion for audit trails; filter queries with `{ isDeleted: { $ne: true } }`

### 2. **File Storage Pattern**
- **Vercel Blob:** Use `uploadBuffer()` from `lib/storage.ts` for file uploads
- **Return value:** Blob object with `.pathname` (storage key) and `.url` (public access URL)
- **Example:** `const blob = await uploadBuffer(buffer, filename, origin); attachments.push({ filename: blob.pathname, url: blob.url })`
- **Deletion:** Call `deleteFile()` to remove from Blob before deleting database record

### 3. **Email Integration**
- **Setup:** Uses nodemailer with `EMAIL_USER` and `EMAIL_PASS` env vars (SMTP credentials)
- **Function:** `sendEmail({ to, subject, html })` from `lib/email.ts`
- **Templates:** Generate HTML with inline CSS (no CSS files); include domain link via `process.env.NEXT_PUBLIC_API_URL`
- **Error handling:** Wrap `sendEmail()` in try-catch; log but don't throw errors (non-blocking)

### 4. **Environment Variables**
- **Required:**
  - `APPLICANT_JWT_SECRET` - 30+ char secret for applicant magic links
  - `JWT_SECRET` - Secret for staff authentication tokens
  - `MONGODB_URI` - MongoDB connection string
  - `EMAIL_USER`, `EMAIL_PASS` - SMTP credentials
  - `VERCEL_BLOB_READ_WRITE_TOKEN` - Vercel Blob access
- **Optional:**
  - `NEXT_PUBLIC_API_URL` - Domain for email links (defaults to localhost:3000 in dev)

### 5. **UI Component Library**
- **Radix UI + Tailwind CSS:** All UI components in `components/ui/` (auto-generated from shadcn)
- **Form handling:** Use `react-hook-form` with `zod` validation (see `field.tsx` component)
- **Toasts:** Use `useToast()` hook from `use-toast.ts` for notifications
- **Pattern:** Import from `@/components/ui/*`, use Tailwind classes for styling

### 6. **Build & Development**
- **Package manager:** pnpm (see `pnpm-lock.yaml`)
- **Commands:** 
  - `npm run dev` - Start dev server (port 3000)
  - `npm run build` - Build for production
  - `npm run lint` - Run ESLint
  - `npm start` - Start production server
- **TypeScript:** Errors ignored during build (see `next.config.mjs`); fix real issues in code

### 7. **Common API Response Patterns**
- **Success:** `{ message: "...", data: {...} }` with 200/201 status
- **Error:** `{ error: "message" }` or `{ message: "error message" }` with 400/401/403/404/500 status
- **Auth errors:** Return 401 with `{ error: "Invalid or expired token" }` or `{ message: error }`
- **Format:** Prefer consistent error structure; client uses `apiCall()` which normalizes to `{ status, data, error }`

## Critical Developer Workflows

### 1. **Testing the Applicant Portal Flow**
```bash
# 1. Start dev server
npm run dev

# 2. Submit form at http://localhost:3000/form
# Check server logs for email (dev mode prints to console)
# Look for "Generated magic link:" line with token

# 3. Extract token from logs and construct URL:
# http://localhost:3000/applicant-portal/login?token=<JWT_TOKEN>

# 4. Or manually generate token in Node:
# const jwt = require('jsonwebtoken')
# jwt.sign({ applicantId: 'YOUR_ID', type: 'applicant' }, process.env.APPLICANT_JWT_SECRET, { expiresIn: '30d' })
```

### 2. **Debugging Database Issues**
```bash
# View applicant record with documents:
# db.zakatapplicants.findOne({ email: "test@example.com" })

# View audit logs for specific applicant:
# db.documentaudits.find({ applicantId: ObjectId("...") }).sort({ createdAt: -1 })

# View messages in conversation:
# db.messages.find({ conversationId: "CASE-ID" }).sort({ createdAt: 1 })
```

### 3. **Adding New API Endpoints**
1. Create route file at `app/api/path/route.ts`
2. Import and call `dbConnect()` first
3. Use `authenticateRequest()` for staff endpoints or token validation for applicants
4. Return `NextResponse.json({ ... }, { status: X })` with appropriate status code
5. Always include error handling with try-catch at top level

### 4. **Adding New Database Models**
1. Create schema file at `lib/models/ModelName.ts`
2. Define Mongoose schema with proper types and validations
3. Add indexes on frequently queried fields
4. Export as `export default model('ModelName', schema, 'collection-name')`
5. Import with: `import ModelName from '@/lib/models/ModelName'`

## Key Files Reference

| Purpose | File(s) |
|---------|---------|
| **Auth & Tokens** | `lib/auth-middleware.ts`, `lib/jwt-utils.ts`, `lib/applicant-token-utils.ts` |
| **Applicant Portal** | `app/applicant-portal/login/page.tsx`, `app/applicant-portal/[id]/page.tsx` |
| **Document APIs** | `app/api/zakat-applicants/[id]/documents/route.ts` |
| **Messaging** | `app/api/messages/send/route.ts`, `lib/models/Message.ts`, `lib/models/Conversation.ts` |
| **API Client** | `lib/api-client.ts` (use instead of raw fetch) |
| **Database** | `lib/db.ts` (connection), `lib/models/*.ts` (schemas) |
| **Email** | `lib/email.ts` (sendEmail function), email templates in route handlers |
| **File Storage** | `lib/storage.ts` (uploadBuffer, deleteFile) |
| **Config** | `next.config.mjs`, `.env.local` (local dev), environment variables (production) |

## Integration Points & Cross-Component Patterns

### Application → Messaging
- When submitting application, create `Conversation` for applicant ↔ caseworker communication
- Case ID is shared identifier between `ZakatApplicant.caseId` and `Conversation.caseId`

### Document Upload → Audit Trail
- Every file upload to `/api/zakat-applicants/[id]/documents` must create `DocumentAudit` entry
- Audit entry captures exact filename, size, MIME type, actor email

### User Creation → Internal Email
- On `User` creation, generate `internalEmail` with `generateInternalEmail(firstName, lastName)`
- Validate uniqueness before saving; if conflict, append counter

### Message Send → Email Notification
- After `Message.save()`, iterate `recipientIds` to find users and send email
- Check `User.emailOnNewMessage` flag before sending; gracefully skip if false

## Common Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| **Applicant can't access portal** | Check `APPLICANT_JWT_SECRET` is set; verify token hasn't expired (30 days); ensure sessionStorage has both `applicantToken` and `applicantId` |
| **Document upload fails silently** | Check file size (<10MB) and type (PDF/JPG/PNG); verify Vercel Blob token is valid; check browser console for error details |
| **Email not sent** | In dev: check server logs for email content; in prod: verify EMAIL_USER/EMAIL_PASS env vars; test SMTP connection |
| **Message doesn't appear** | Verify sender is conversation participant; check `isDeleted` flag in query; ensure recipients array is populated |
| **Audit log missing entries** | Ensure `DocumentAudit.create()` is called after file operation; check if record was created with `applicantId` matching applicant |
| **API returning 401** | For staff: check Authorization header format "Bearer TOKEN"; for applicants: check `?token=JWT` query param and token validity |

## Documentation Location

- **Quick setup:** `QUICK_START.md`
- **Full feature docs:** `APPLICANT_PORTAL_FEATURE.md`, `MESSAGING_IMPLEMENTATION_SUMMARY.md`
- **Architecture flows:** `ARCHITECTURE_DIAGRAMS.md`
- **Implementation details:** `IMPLEMENTATION_SUMMARY.md`, `DEVELOPER_CHECKLIST.md`

---

**Last Updated:** November 14, 2025  
**Next Review:** When major architecture changes occur
