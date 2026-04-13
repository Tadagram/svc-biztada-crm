# User API Hooks Architecture

## Overview

All user API operations are now properly organized using **React Query** for caching and state management. Each operation has its own dedicated hook file.

## Hook Structure

### 1. useGetUsers

**File**: `src/hooks/useGetUsers.ts`

- Fetches all users
- Uses React Query for caching (5 minutes stale time)
- Provides `useGetUsersData()` helper for quick data access

```typescript
const { data: users, isLoading, error, refetch } = useGetUsers();
// OR
const users = useGetUsersData(); // Just get the data
```

### 2. useCreateUser

**File**: `src/hooks/useCreateUser.ts`

- Creates a new user
- Auto-invalidates users list cache after success
- Returns mutation object with status and error handling

```typescript
const { mutateAsync, isPending, error } = useCreateUser();
await mutateAsync({ phone_number: '0901234567', role: 'user' });
```

### 3. useUpdateUser

**File**: `src/hooks/useUpdateUser.ts`

- Updates existing user
- Auto-invalidates users list cache after success
- Requires userId and partial user data

```typescript
const { mutateAsync, isPending, error } = useUpdateUser();
await mutateAsync({
  userId: 'uuid',
  data: { role: 'agency', status: 'active' },
});
```

### 4. useDeleteUser

**File**: `src/hooks/useDeleteUser.ts`

- Deletes a user (soft delete)
- Auto-invalidates users list cache after success
- Requires user confirmation

```typescript
const { mutateAsync, isPending, error } = useDeleteUser();
await mutateAsync('user-id');
```

## Simplified Components

### UserManager Hook

**File**: `src/hooks/useUserManager.ts`

Provides a simple unified interface for all user operations:

```typescript
const {
  users, // Current users data (from React Query)
  modal, // Modal state
  isLoading, // Overall loading state
  error, // Overall error state
  fetchUsers, // Refetch users
  createUser, // Create user
  updateUser, // Update user
  deleteUser, // Delete user
  openCreateModal,
  openEditModal,
  closeModal,
} = useUserManager();
```

## Caching Strategy

### Cache Configuration

- **Stale Time**: 5 minutes (queries refetch after 5 min of inactivity)
- **Garbage Collection Time**: 10 minutes (cached data removed after 10 min)
- **Retry**: 1 automatic retry on failure

### Cache Invalidation

- After successful `create`: Invalidates users list
- After successful `update`: Invalidates users list
- After successful `delete`: Invalidates users list
- Components automatically refetch fresh data

## API Layer

### userApi

**File**: `src/features/user/api/userApi.ts`

Simple API client with no caching (caching is handled by React Query):

```typescript
export const userApi = {
  getUsers: () => Promise<IUser[]>
  getUserById: (userId: string) => Promise<IUser>
  createUser: (data: ICreateUserRequest) => Promise<IUser>
  updateUser: (userId: string, data: Partial<ICreateUserRequest>) => Promise<IUser>
  deleteUser: (userId: string) => Promise<void>
}
```

## Zustand Store

### useUserStore

**File**: `src/hooks/useUserStore.ts`

Now only manages modal state (not user data):

```typescript
const {
  modal, // { isOpen, mode, selectedUser? }
  openCreateModal,
  openEditModal,
  closeModal,
} = useUserStore();
```

## Error Handling & Rate Limiting

### Axios Interceptor

**File**: `src/libs/axios.ts`

Automatically handles 429 (Too Many Requests) with exponential backoff:

- Retries up to 3 times
- Exponential delays: 1s → 2s → 4s

## Benefits of This Architecture

✅ **Single Responsibility**: Each hook has one job
✅ **Proper Caching**: React Query handles smart caching automatically
✅ **Cache Invalidation**: Mutations automatically update the cache
✅ **Error Handling**: Consistent error handling across all operations
✅ **Loading States**: Built-in loading and error states from React Query
✅ **No Manual Cache Management**: No need to manually clear cache
✅ **Type Safe**: Full TypeScript support
✅ **DevTools Support**: React Query DevTools available in development

## Usage Example

```typescript
import { useUserManager, useGetUsers } from '@/hooks';

function UsersPage() {
  const { users, isLoading, error, openCreateModal } = useUserManager();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={openCreateModal}>Create User</button>
      {users.map(user => (
        <div key={user.user_id}>{user.phone_number}</div>
      ))}
    </div>
  );
}
```
