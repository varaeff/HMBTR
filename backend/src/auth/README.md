# JWT Authorization Module

## Features

- User registration with password hashing (bcrypt)
- User login with JWT token generation
- Access token and refresh token support
- Protected routes with JWT authentication
- Profile endpoint to get current user information
- Refresh token endpoint to get new access token

## Configuration

Add the following variables to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## API Endpoints

### 1. Register a new user

**POST** `/auth/register`

Request body:

```json
{
  "username": "john_doe",
  "password": "securePassword123",
  "name": "John",
  "surname": "Doe",
  "patronymic": "Alexander",
  "email": "john@example.com"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "name": "John",
    "surname": "Doe",
    "email": "john@example.com",
    "is_admin": false,
    "is_organizer": false
  }
}
```

### 2. Login

**POST** `/auth/login`

Request body:

```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

Response: Same as register endpoint

### 3. Get Profile

**POST** `/auth/profile`

Headers:

```
Authorization: Bearer {access_token}
```

Response:

```json
{
  "id": 1,
  "username": "john_doe",
  "name": "John",
  "surname": "Doe",
  "email": "john@example.com",
  "is_admin": false,
  "is_organizer": false
}
```

### 4. Refresh Token

**POST** `/auth/refresh`

Headers:

```
Authorization: Bearer {access_token}
```

Request body:

```json
{
  "refreshToken": "{refresh_token}"
}
```

Response: Same as login endpoint

### 5. Logout

**POST** `/auth/logout`

Headers:

```
Authorization: Bearer {access_token}
```

Response:

```json
{
  "message": "Logged out successfully"
}
```

## Using Protected Routes

To protect your routes with JWT authentication, use the `@UseGuards(JwtAuthGuard)` decorator:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('protected-route')
getProtected() {
  return 'This route is protected';
}
```

## Public Routes

To make a route accessible without authentication, use the `@Public()` decorator:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get('public-route')
getPublic() {
  return 'This route is public';
}
```

## Database Schema

The users table has the following structure:

```prisma
model users {
  id           Int      @id @default(autoincrement())
  username     String   @unique @db.VarChar(255)
  password     String   @db.VarChar(255)
  surname      String   @db.VarChar(255)
  name         String   @db.VarChar(255)
  patronymic   String?  @db.VarChar(255)
  email        String?  @unique @db.VarChar(255)
  is_admin     Boolean  @default(false)
  is_organizer Boolean  @default(false)
  refreshToken String?  @db.Text
  createdAt    DateTime @default(now())
}
```

## Module Files

- `src/auth/auth.module.ts` - Main auth module
- `src/auth/auth.service.ts` - Authentication service with login/register logic
- `src/auth/auth.controller.ts` - API endpoints
- `src/auth/strategies/jwt.strategy.ts` - JWT Passport strategy
- `src/auth/guards/jwt-auth.guard.ts` - JWT guard for route protection
- `src/auth/guards/jwt-auth-global.guard.ts` - Global JWT guard
- `src/auth/decorators/public.decorator.ts` - Public route decorator
- `src/auth/dto/` - Data transfer objects
