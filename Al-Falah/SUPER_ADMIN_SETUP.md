# How to Add a Super Admin User

There are several ways to create or update a user to super_admin role:

## Method 1: Interactive Script (Recommended)

This script will guide you through creating a new super admin or updating an existing user:

```bash
npx tsx scripts/create-super-admin.ts
```

**What it does:**
- Prompts for email address
- If user exists: asks if you want to update them to super_admin
- If user doesn't exist: prompts for name and password to create new user
- Automatically sets role to "super_admin" and removes tenantId (super admin can access all tenants)

## Method 2: Quick Update Script

If you already have a user (like `staff@gmail.com`) and want to make them super_admin:

```bash
npx tsx scripts/update-user-to-super-admin.ts staff@gmail.com
```

Replace `staff@gmail.com` with the email of the user you want to update.

## Method 3: Manual MongoDB Update

If you have direct MongoDB access, you can update directly:

```javascript
// Connect to MongoDB
use your-database-name

// Update existing user by email
db.users.updateOne(
  { email: "staff@gmail.com" },
  { 
    $set: { 
      role: "super_admin",
      tenantId: null  // Super admin doesn't need tenantId
    } 
  }
)

// Or create new super admin
db.users.insertOne({
  name: "Super Admin",
  email: "superadmin@example.com",
  password: "$2a$10$hashedPasswordHere", // Use bcrypt to hash password
  role: "super_admin",
  tenantId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

## Method 4: Update via API (if you have admin access)

You can also update via the API if you have admin access:

```bash
# First, get your auth token by logging in
# Then update the user
curl -X PATCH http://localhost:3000/api/users/{userId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "super_admin", "tenantId": null}'
```

## What is Super Admin?

- **Role**: `super_admin`
- **Access**: Can access ALL tenants/masjids (no tenant restriction)
- **Permissions**: 
  - Can create/edit/delete tenants (masjids)
  - Can view all users across all tenants
  - Can manage the entire platform
  - Has access to `/staff/tenants` page (Manage Masjids)

## Important Notes

1. **Super Admin doesn't need tenantId**: Unlike regular users, super_admin can access all tenants, so their `tenantId` should be `null` or `undefined`.

2. **Security**: Super admin has full platform access. Only create super admin users for trusted administrators.

3. **After creating super admin**: 
   - Log in with the super admin credentials
   - You'll see "Manage Masjids" in the sidebar
   - You can now create and manage all masjids in the system

## Verify Super Admin

After creating/updating, verify by:
1. Logging in with the super admin credentials
2. Checking if "Manage Masjids" appears in the sidebar
3. Navigating to `/staff/tenants` - you should see all masjids

## Troubleshooting

**"Access Denied" on /staff/tenants page:**
- Make sure the user's role is exactly `"super_admin"` (case-sensitive)
- Check that `tenantId` is `null` or `undefined` (not set to a tenant ID)

**Can't see "Manage Masjids" in sidebar:**
- Verify the role in the database: `db.users.findOne({ email: "your@email.com" })`
- Make sure you've logged out and logged back in after updating the role

