# User API Endpoints

## Base URL

`http://localhost:9999/users`

## Endpoints

### 1. Get All Users

**GET** `/users`

- **Description**: Retrieve all active users
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "phone_number": "0901234567",
      "agency_name": "ABC Company",
      "role": "mod|agency|user|customer",
      "status": "active|disabled",
      "parent_user_id": "uuid|null",
      "created_at": "2026-04-13T10:00:00Z",
      "updated_at": "2026-04-13T10:00:00Z"
    }
  ],
  "message": "Users retrieved successfully"
}
```

### 2. Get User by ID

**GET** `/users/:userId`

- **Description**: Retrieve a specific user by ID
- **Parameters**:
  - `userId` (path, required): UUID of the user
- **Response**: Same as single user object above

### 3. Create User

**POST** `/users`

- **Description**: Create a new user
- **Request Body**:

```json
{
  "phone_number": "0901234567",
  "agency_name": "ABC Company",
  "role": "user",
  "status": "active",
  "parent_user_id": "uuid|null"
}
```

- **Required**: `phone_number`
- **Optional**: `agency_name`, `role`, `status`, `parent_user_id`

### 4. Update User

**PUT** `/users/:userId`

- **Description**: Update user information
- **Parameters**:
  - `userId` (path, required): UUID of the user
- **Request Body** (all optional):

```json
{
  "agency_name": "New Agency Name",
  "role": "agency",
  "status": "disabled",
  "parent_user_id": "new-uuid"
}
```

- **Note**: Phone number cannot be changed

### 5. Delete User

**DELETE** `/users/:userId`

- **Description**: Soft delete a user (sets deleted_at timestamp)
- **Parameters**:
  - `userId` (path, required): UUID of the user
- **Response**: Returns the deleted user object with `deleted_at` field populated

## Roles

- `mod` - Moderator
- `agency` - Agency
- `user` - User
- `customer` - Customer

## Status

- `active` - User is active
- `disabled` - User is disabled

## Error Responses

### 404 Not Found

```json
{
  "success": false,
  "message": "User not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to [operation]",
  "error": "error message"
}
```

## Frontend Integration

The frontend User CRUD interface is fully integrated with these endpoints via the `userApi` module:

- File: `/src/features/user/api/userApi.ts`
- All CRUD operations are available through hooks in `/src/hooks/`
- API base URL configured in `.env`: `VITE_API_BASE_URL=http://localhost:9999`
