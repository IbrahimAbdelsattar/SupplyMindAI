# Supabase Authentication & Storage Setup Guide

## Overview

SupplyMind AI uses Supabase for **three critical services**:

| Service | Purpose | Benefits |
|---------|---------|----------|
| **Authentication** | User signup, signin, session management | Scalable, secure, no password hashing needed |
| **File Storage** | Documents, reports, data imports, avatars | Cloud-based, CDN-enabled, easy access control |
| **Vector Storage** | RAG embeddings, knowledge base | pgvector support, semantic search, AI-ready |

---

## Step 1: Create Supabase Project

### 1. Sign Up / Log In
- Go to [supabase.com](https://supabase.com)
- Create account or sign in
- Create new project in your organization

### 2. Project Configuration
```
Project Name: SupplyMind
Database Password: [Strong password - 20+ chars]
Region: [Choose closest to your users]
```

### 3. Get API Keys
Once project is created:

1. Go to **Settings** → **API**
2. Copy the values below to your `.env` file:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (KEEP SECRET!)

### 4. Enable pgvector Extension (for RAG)
1. Go to **SQL Editor**
2. New query → paste:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Execute

---

## Step 2: Configure Authentication

### 1. Enable Email Provider
1. Go to **Authentication** → **Providers**
2. Enable **Email**
3. Configure settings:
   - **Email confirmations**: Set to "explicit" (user must confirm email)
   - **Disable Sign Up**: false (allow new users)
   - **Confirm Email**: true

### 2. Configure Password Requirements
1. Go to **Authentication** → **Policies**
2. Set password requirements:
   - Minimum length: 8 characters (recommended)
   - Complexity checks: enabled

### 3. Configure Session Settings
1. Go to **Authentication** → **Settings**
2. Configure expiration times:
   - Access token: 1 hour (default)
   - Refresh token: 7 days (default)

### 4. Configure Email Templates (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize:
   - Confirmation email
   - Password reset email
   - Magic link email

### 5. Enable RLS (Row Level Security)
1. Go to **SQL Editor**
2. Execute the migration:
   ```bash
   psql <connection_string> < supabase/migrations/20260530_auth_storage_setup.sql
   ```

---

## Step 3: Set Up Storage Buckets

### 1. Create Storage Buckets
1. Go to **Storage** → **New bucket**
2. Create these buckets:

#### Documents Bucket
- **Name**: `documents`
- **Public**: Yes
- **File size limit**: 20 MB
- **Allowed MIME types**: 
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `text/plain`
  - `application/json`

#### Data Imports Bucket
- **Name**: `data-imports`
- **Public**: Yes
- **File size limit**: 50 MB
- **Allowed MIME types**:
  - `text/csv`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

#### Reports Bucket
- **Name**: `reports`
- **Public**: Yes
- **File size limit**: 20 MB
- **Allowed MIME types**:
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

#### Forecasts Bucket
- **Name**: `forecasts`
- **Public**: Yes
- **File size limit**: 10 MB
- **Allowed MIME types**:
  - `text/csv`
  - `application/json`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

#### Avatars Bucket
- **Name**: `avatars`
- **Public**: Yes
- **File size limit**: 5 MB
- **Allowed MIME types**:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`

### 2. Set Up RLS Policies
Execute the migration to create Row Level Security policies:

```bash
# Login to your database
psql "postgresql://postgres:password@host/dbname"

# Run the migration
\i supabase/migrations/20260530_auth_storage_setup.sql
```

---

## Step 4: Update Environment Configuration

### 1. Update `.env` file
```bash
# Copy production template
cp .env.production .env.prod

# Edit with your Supabase credentials
nano .env.prod
```

### 2. Set Required Variables
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 3. Verify Configuration
```bash
# Start backend
python -m uvicorn backend.main:app --reload

# Test health
curl http://localhost:8000/api/v1/health

# Should show: "supabase_connected": true
```

---

## Step 5: Frontend Integration

### Update Frontend Environment
```typescript
// src/config/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Frontend `.env`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Example: User Signup
```typescript
// pages/auth/Signup.tsx
import { supabase } from "@/config/supabase";

async function handleSignup(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("Signup error:", error.message);
    return;
  }

  console.log("Check your email to confirm signup");
}
```

### Example: User Signin
```typescript
async function handleSignin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Signin error:", error.message);
    return;
  }

  // Store session
  console.log("Signed in! Session:", data.session);
}
```

### Example: File Upload
```typescript
async function uploadDocument(file: File, userId: string) {
  const { data, error } = await supabase.storage
    .from("documents")
    .upload(`${userId}/${file.name}`, file);

  if (error) {
    console.error("Upload error:", error);
    return;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("documents")
    .getPublicUrl(`${userId}/${file.name}`);

  console.log("File uploaded:", publicUrlData.publicUrl);
}
```

---

## API Endpoints

### Authentication Endpoints

#### Sign Up
```bash
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "company": "ACME Corp"
}

Response:
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "analyst"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "message": "Signup successful. Check email to confirm."
}
```

#### Sign In
```bash
POST /api/v1/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "user": { ... },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

#### Get Current User
```bash
GET /api/v1/auth/me
Authorization: Bearer eyJ...

Response:
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "analyst"
  }
}
```

#### Update Profile
```bash
PUT /api/v1/auth/me/metadata
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Jane Doe",
  "company": "New Company",
  "preferences": { "theme": "dark" }
}
```

#### Reset Password
```bash
POST /api/v1/auth/password/reset
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: Email with reset link sent
```

#### Sign Out
```bash
POST /api/v1/auth/signout
Authorization: Bearer eyJ...

Response: 204 No Content
```

---

### Storage Endpoints

#### Upload Document
```bash
POST /api/v1/storage/documents/upload
Authorization: Bearer eyJ...
Content-Type: multipart/form-data

file: <binary data>

Response:
{
  "success": true,
  "message": "Document uploaded successfully",
  "file_name": "report.pdf",
  "file_size": 1024000,
  "public_url": "https://..."
}
```

#### Upload Data File
```bash
POST /api/v1/storage/data/upload
Authorization: Bearer eyJ...
Content-Type: multipart/form-data

file: <binary data (CSV or XLSX)>
```

#### List Files
```bash
GET /api/v1/storage/files?bucket=documents&folder=
Authorization: Bearer eyJ...

Response:
{
  "success": true,
  "bucket": "documents",
  "files": [
    {
      "name": "report.pdf",
      "size": 1024000,
      "content_type": "application/pdf",
      "created_at": "2026-05-30T..."
    }
  ],
  "count": 1
}
```

#### Delete File
```bash
DELETE /api/v1/storage/files/report.pdf?bucket=documents
Authorization: Bearer eyJ...

Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

#### Get File URL
```bash
POST /api/v1/storage/files/report.pdf/url?bucket=documents&expires_in=3600
Authorization: Bearer eyJ...

Response:
{
  "success": true,
  "url": "https://...",
  "expires_in": 3600
}
```

---

## Security Best Practices

### 1. API Keys
- **ANON_KEY**: Safe to expose (frontend)
- **SERVICE_ROLE_KEY**: SECRET! Only backend
- Never commit keys to git
- Rotate keys regularly
- Use environment variables

### 2. Authentication
- Enforce strong passwords (8+ chars)
- Enable email confirmation
- Implement rate limiting
- Monitor failed login attempts
- Use HTTPS only
- Set secure session timeouts

### 3. Storage
- Enable Row Level Security (RLS)
- User isolation: files stored in `{user_id}/{filename}`
- Validate file types on upload
- Implement file size limits
- Regular backup of storage
- Monitor storage quota

### 4. Row Level Security Policies
```sql
-- Example: Users can only access their own files
CREATE POLICY "users_can_access_own_files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Troubleshooting

### Issue: "Supabase not configured"
**Solution**: Verify environment variables are set
```bash
# Check backend
grep SUPABASE .env

# Restart backend
python -m uvicorn backend.main:app --reload
```

### Issue: "Invalid email or password"
**Possible causes**:
- Email not confirmed (check email)
- User doesn't exist (sign up first)
- Typo in email/password
- User account disabled

### Issue: "File upload failed"
**Possible causes**:
- File type not allowed
- File size exceeds limit
- Storage bucket doesn't exist
- RLS policy blocking upload

**Solution**:
```bash
# Check storage buckets
SELECT * FROM storage.buckets;

# Check RLS policies
SELECT * FROM pg_policies;

# Enable RLS for buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
```

### Issue: "Access token expired"
**Solution**: Use refresh token to get new access token
```bash
POST /api/v1/auth/refresh
{
  "refresh_token": "eyJ..."
}
```

---

## Advanced: Webhooks (Optional)

Enable webhooks for real-time events:

1. Go to **Authentication** → **Webhooks**
2. Add webhook for these events:
   - `user.created`
   - `user.updated`
   - `user.deleted`

Example webhook handler:
```python
@app.post("/webhooks/supabase")
async def supabase_webhook(request: Request):
    data = await request.json()
    
    event = data.get("type")  # user.created, user.updated, etc.
    user = data.get("data", {}).get("user", {})
    
    if event == "user.created":
        # Create app-specific user record
        pass
    elif event == "user.deleted":
        # Clean up user data
        pass
    
    return {"ok": True}
```

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth API](https://supabase.com/docs/guides/auth)
- [Supabase Storage API](https://supabase.com/docs/guides/storage)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## Support

For issues or questions:
1. Check [Supabase Docs](https://supabase.com/docs)
2. Review logs: `docker logs backend`
3. Check API health: `curl http://localhost:8000/api/v1/health`
4. Check storage health: `curl http://localhost:8000/api/v1/storage/health`
