# 16: Password Management & Invitation Flow Improvements

## Overview

This document outlines password management and member administration features for the Events CRM:
1. **Password Change** - Allow users to change their password from profile settings
2. **Auto-Accept Invitations** - Allow users to sign in immediately without clicking the invitation link
3. **Owner Password Reset** - Allow workspace owners/admins to reset member passwords
4. **Multiple Owners** - Allow promoting members to owner role with full permissions

## Status: Implemented

---

## Part 1: Password Change Feature

### Problem

Users invited with auto-generated passwords cannot change them to something memorable.

### Solution

Added password change functionality to the profile settings page at `/[locale]/[slug]/settings/profile`.

### Files Created

| File | Purpose |
|------|---------|
| `components/forms/change-password-form.tsx` | Password change form with validation |

### Files Modified

| File | Change |
|------|--------|
| `lib/schemas.ts` | Added `changePasswordSchema` |
| `components/profile/profile-card.tsx` | Added password section with dialog |

### Implementation Details

#### Schema (`lib/schemas.ts`)

```typescript
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
```

#### Form Component (`components/forms/change-password-form.tsx`)

Features:
- Current password, new password, confirm password fields
- Password visibility toggles for each field
- Uses `authClient.changePassword()` directly from Better Auth
- Success/error toast notifications
- Form reset on success

#### Profile Card Integration

Added "Password" section with "Change Password" button that opens a dialog:

```tsx
<Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
  <DialogTrigger asChild>
    <Button variant="outline">
      <Icons.lock />
      Change Password
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Change Password</DialogTitle>
      <DialogDescription>
        Enter your current password and choose a new one.
      </DialogDescription>
    </DialogHeader>
    <ChangePasswordForm onSuccess={() => setIsPasswordDialogOpen(false)} />
  </DialogContent>
</Dialog>
```

### Session Handling

- Other sessions remain active when password changes
- Uses `revokeOtherSessions: false` in `authClient.changePassword()`

---

## Part 2: Auto-Accept Invitations

### Problem

When users were invited:
1. User account created with generated password
2. Invitation record created (pending status)
3. **NO workspace membership** created yet

If user signed in directly with credentials (without clicking invitation link):
1. Sign-in succeeded
2. Redirected to `/callback`
3. No workspaces found → redirected to `/access-denied`

Additionally, if user later clicked the magic link from the invitation email after already being accepted, they would see "Invitation Expired" error.

### Solution

1. **Auto-accept invitations on callback** - When user signs in, automatically accept pending invitations
2. **Handle already-accepted invitations** - Redirect to dashboard instead of showing expired error

### Files Modified

| File | Change |
|------|--------|
| `server/queries/callback.ts` | Added `getPendingInvitationsForUser()` function |
| `app/[locale]/(web)/callback/page.tsx` | Auto-accept pending invitations before workspace check |
| `server/queries/invitations.ts` | Added `already_accepted` status type and check |
| `app/[locale]/(web)/invite/[token]/page.tsx` | Handle `already_accepted` → redirect to dashboard |

### Implementation Details

#### Callback Query (`server/queries/callback.ts`)

Added function to get pending invitations:

```typescript
export async function getPendingInvitationsForUser(email: string) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      workspaceId: invitations.workspaceId,
      role: invitations.role,
      token: invitations.token,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.status, "pending"),
        eq(invitations.expired, false)
      )
    )
}
```

#### Callback Page (`app/[locale]/(web)/callback/page.tsx`)

Auto-accepts pending invitations before checking workspaces:

```typescript
export default async function CallbackPage() {
  const { user } = await getCurrentUser()

  if (!user) {
    return redirectToRoute("sign-in")
  }

  // Auto-accept any pending invitations for this user
  const pendingInvitations = await getPendingInvitationsForUser(user.email)

  for (const invitation of pendingInvitations) {
    await acceptInvitation({
      invitationId: invitation.id,
      userId: user.id,
      workspaceId: invitation.workspaceId,
      role: invitation.role as RoleTypesType,
    })
  }

  // Get all user data (now includes auto-accepted workspaces)
  const { ownedWorkspaces, memberWorkspaces } = await getCallbackPageQuery(user.id)

  // ... redirect logic
}
```

#### Invitations Query (`server/queries/invitations.ts`)

Added `already_accepted` status to handle clicking invitation link after acceptance:

```typescript
type InvitePageResult =
  | { status: "not_found" }
  | { status: "expired"; invitation: InvitationType; workspace: WorkspaceType }
  | { status: "already_accepted"; workspace: WorkspaceType }  // NEW
  | { /* ... other statuses */ }

export async function getInvitePageQuery({ token }): Promise<InvitePageResult> {
  // ... fetch invitation

  // Check if already accepted - redirect to dashboard instead of showing expired
  if (invitation.status === "accepted") {
    return { status: "already_accepted", workspace }
  }

  // ... rest of logic
}
```

#### Invite Page (`app/[locale]/(web)/invite/[token]/page.tsx`)

Handle `already_accepted` status:

```typescript
switch (result.status) {
  case "already_accepted":
    return redirectToRoute("dashboard", { slug: result.workspace.slug })
  // ... other cases
}
```

### User Flows

#### Flow 1: User signs in directly with credentials

1. Admin invites user → account + invitation created
2. User signs in at `/sign-in` with credentials
3. Redirected to `/callback`
4. **Callback auto-accepts pending invitations**
5. User redirected to workspace dashboard

#### Flow 2: User clicks magic link after already being accepted

1. User already signed in and invitation was auto-accepted
2. User clicks magic link from email
3. `/invite/[token]` sees `status: "accepted"`
4. Returns `already_accepted` status
5. **User redirected to workspace dashboard** (no error!)

#### Flow 3: User clicks magic link first (original flow)

1. User clicks magic link → `/invite/[token]`
2. Signs in with credentials
3. Invitation accepted, redirected to dashboard

---

## Related Files

### Invitation System
- `trpc/routers/invitations.ts` - Creates user account and invitation
- `components/forms/create-invite-form.tsx` - Shows generated credentials to admin
- `components/mail/invitation-mail.tsx` - Email template (link only, no password)
- `components/invitation/invitation-sign-in.tsx` - Sign-in form for invitees

### Authentication
- `lib/auth.ts` - Better Auth server configuration
- `lib/auth-client.ts` - Better Auth client setup
- `app/api/auth/[...all]/route.ts` - Auth API route handler

### Profile Settings
- `app/[locale]/(web)/(dashboard)/[slug]/settings/profile/page.tsx` - Profile page
- `components/profile/profile-card.tsx` - Main profile component

---

## Edge Cases

| Case | Handling |
|------|----------|
| User has no password (OAuth-only) | Use `authClient.setPassword()` instead |
| Incorrect current password | Show error from Better Auth |
| Expired invitation (7 days) | Not auto-accepted; shows expired message |
| Already accepted invitation | Redirect to dashboard (no error) |
| Multiple pending invitations | All accepted; user goes to first workspace |
| No invitations or workspaces | Falls through to `/access-denied` |

---

## Part 3: Owner Password Reset

### Problem

Workspace owners and admins need the ability to reset passwords for existing members who have forgotten their credentials or need a new password.

### Solution

Added a "Reset Password" action to the member dropdown menu that generates a new password and displays it in a credentials dialog (same pattern as the invitation flow).

### Files Modified

| File | Change |
|------|--------|
| `trpc/routers/members.ts` | Added `resetPassword` mutation and `generateRandomPassword()` function |
| `trpc/hooks/members-hooks.ts` | Added `useResetPasswordTRPC` hook |
| `components/members/member-actions.tsx` | Added credentials dialog and Reset Password menu item |
| `components/global/icons.tsx` | Added `key` icon (KeyRoundIcon) |

### Implementation Details

#### Reset Password Mutation (`trpc/routers/members.ts`)

```typescript
resetPassword: protectedProcedure
  .input(z.object({ userId: userIdSchema, slug: slugSchema }))
  .mutation(async ({ ctx, input }) => {
    // Validation:
    // - Cannot reset own password
    // - Must have MANAGE_MEMBERS permission
    // - Only owners can reset other owners' passwords

    const generatedPassword = generateRandomPassword()
    const hashedPassword = await hashPassword(generatedPassword)

    // Update or create credential account
    // Returns: { message, email, generatedPassword }
  })
```

#### Member Actions Component

Added credentials dialog with:
- Email field (read-only with copy button)
- Password field (read-only with copy button)
- "Copy All" button for both credentials
- "Done" button to close dialog

### Permission Rules

| Actor | Can Reset Password For |
|-------|------------------------|
| Owner | All members except self |
| Admin | Members and Managers (not Owners) |
| Manager | No password reset access |
| Member | No password reset access |

---

## Part 4: Multiple Owners

### Problem

Workspaces could only have a single owner. Organizations often need multiple people with full administrative access.

### Solution

Implemented a "Primary Owner + Additional Owners" model:
- The original workspace creator remains the **primary owner** (stored in `workspaces.ownerId`)
- Additional users can be promoted to the **owner role** with full permissions
- Primary owner retains exclusive workspace deletion rights

### Files Modified

| File | Change |
|------|--------|
| `trpc/routers/members.ts` | Updated `update` mutation to accept "owner" role with validation |
| `components/members/member-actions.tsx` | Added "Owner" option in Edit Role dropdown (visible to owners only) |
| `components/members/members-columns.tsx` | Distinguish primary owner from additional owners |

### Implementation Details

#### Role Update Mutation (`trpc/routers/members.ts`)

Updated to accept all four roles: `member`, `manager`, `admin`, `owner`

```typescript
update: protectedProcedure
  .input(z.object({
    role: z.enum(["member", "manager", "admin", "owner"]),
    // ...
  }))
  .mutation(async ({ ctx, input }) => {
    // New validations:
    // 1. Only owners can promote to owner
    // 2. Primary owner cannot be demoted
    // 3. Only owners can demote other owners
  })
```

#### Edit Role Dropdown

The "Owner" option is only visible when the current user is an owner:

```tsx
{isOwner && (
  <DropdownMenuItem
    disabled={isRoleOwner || isUpdatingMember || isPrimaryOwner}
    onClick={() => handleUpdateMember("owner")}
  >
    Owner
    {isRoleOwner && <Icons.check />}
  </DropdownMenuItem>
)}
```

### Permission Rules

| Action | Who Can Do It |
|--------|---------------|
| Promote to Owner | Current owners only |
| Demote an Owner | Current owners only |
| Demote Primary Owner | Not allowed (must transfer ownership) |
| Delete Workspace | Primary owner only |

### Owner Types

| Type | Description | Can Delete Workspace |
|------|-------------|---------------------|
| Primary Owner | Original workspace creator (`workspaces.ownerId`) | Yes |
| Additional Owner | User with "owner" role | No |

Both owner types have full `["*"]` permissions for all other actions.

---

## Notes

- Password change uses Better Auth client directly (no tRPC needed)
- Invitation auto-accept happens server-side in callback page
- Token expiration (7 days) is still respected
- Invitation tracking preserved (status changes from pending → accepted)
- Owner password reset shows same credentials dialog as invitation flow
- Multiple owners share full permissions except workspace deletion
