# Frontend Authorization Setup Guide

## Overview

This project now includes a complete JWT-based authorization system integrated with the backend NestJS AuthModule.

## Features

- **User Registration**: Create new user accounts with username, password, and profile information
- **User Login**: Authenticate with username and password
- **Token Management**: Automatic JWT token handling with refresh token support
- **Protected Routes**: Routes that require authentication (marked with `requiresAuth: true`)
- **User Profile**: Display logged-in user information in the menu
- **Logout**: Clear authentication and return to home page

## Architecture

### Frontend Components

#### 1. **Auth Store** (`src/stores/auth.ts`)

Pinia store for managing authentication state

- `user`: Current logged-in user data
- `accessToken`: JWT access token
- `refreshToken`: JWT refresh token
- `isAuthenticated`: Computed property for auth status
- `isAdmin`, `isOrganizer`: Computed properties for user roles

#### 2. **Auth Service** (`src/composables/useAuthService.ts`)

Composable for handling auth API calls

```ts
const authService = useAuthService()
await authService.login({ username, password })
await authService.register({ username, password, name, surname, ... })
await authService.logout()
await authService.refresh(refreshToken)
await authService.profile()
```

#### 3. **Auth Initialization** (`src/composables/useAuthInit.ts`)

Loads persisted auth state on app startup

```ts
const { initAuth, isInitialized } = useAuthInit();
await initAuth();
```

#### 4. **API Interceptors** (`src/api/interceptors.ts`)

- Adds JWT token to request headers
- Automatically refreshes tokens on 401 responses
- Queues requests during token refresh
- Logs out user if refresh fails

#### 5. **Login Widget** (`src/widgets/LoginWidget/LoginWidget.vue`)

User-facing login/register form with:

- Tab-based interface (Login/Register)
- Form validation
- Loading state during submission
- Auto-close on success

#### 6. **User Menu** (`src/widgets/UserMenu/UserMenu.vue`)

Displays logged-in user info with:

- User name and username
- User role (Admin/Organizer/User)
- Logout button

## Usage

### For Users

1. **Login**
   - Click on "Login for organizers" button in top navigation
   - Switch to Login tab
   - Enter username and password
   - Click "Login"

2. **Register**
   - Click on "Login for organizers" button in top navigation
   - Switch to Register tab
   - Fill in all required fields:
     - Username (required)
     - Password (min 6 characters, required)
     - First Name (required)
     - Last Name (required)
     - Patronymic (optional)
     - Email (optional)
   - Click "Register"

3. **Logout**
   - Click on your name in the top navigation (visible when logged in)
   - You'll see a popover with your username and role
   - Click "Logout" button

### For Developers

#### Adding Authentication to a Route

In `src/router/index.ts`:

```ts
{
  path: '/protected-route',
  name: 'protectedRoute',
  component: () => import('@/pages/ProtectedPage.vue'),
  meta: { requiresAuth: true }
}
```

#### Using Auth in Components

```ts
import { useAuthStore } from "@/stores/auth";
import { storeToRefs } from "pinia";

const authStore = useAuthStore();
const { user, isAuthenticated, isAdmin } = storeToRefs(authStore);

// Check if authenticated
if (authStore.isAuthenticated) {
  // Do something
}

// Check user role
if (user.value?.is_admin) {
  // Show admin features
}
```

#### Making Protected API Calls

All API calls automatically include the JWT token in the Authorization header. No additional setup needed:

```ts
import http from "@/api/http";

const response = await http.get("/protected-endpoint");
```

#### Calling Auth Service Methods

```ts
import { useAuthService } from "@/composables/useAuthService";

const authService = useAuthService();

try {
  await authService.login({ username, password });
} catch (error) {
  // Error is already displayed via interceptors
  console.error("Login failed:", error);
}
```

## Token Flow

```
1. User submits login/register form
   ↓
2. LoginWidget calls authService.login() or authService.register()
   ↓
3. API request sent with credentials
   ↓
4. Backend returns access_token and refresh_token
   ↓
5. Tokens saved to localStorage and auth store
   ↓
6. User is marked as authenticated
   ↓
7. Subsequent requests include token in Authorization header
   ↓
8. If token expires (401 response):
   a. Interceptor automatically calls refresh endpoint
   b. New tokens received and stored
   c. Failed request is retried with new token
   d. If refresh fails, user is logged out
```

## Environment Variables

The API base URL is configured in `.env`:

```
VITE_API_BASE_URL=http://localhost:3000/api/hmbtr/v1
```

## Backend Integration

The frontend integrates with the backend's AuthModule which provides:

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user (clears refresh token)
- `POST /auth/profile` - Get current user profile

All endpoints except register and login require authentication.

## Internationalization (i18n)

New translation keys for user menu:

- `userMenuAdmin`: "Administrator"
- `userMenuOrganizer`: "Organizer"
- `userMenuUser`: "User"
- `userMenuLogout`: "Logout"

See `src/i18n/locales/` for full translations.

## Security Notes

1. **Token Storage**: Tokens are stored in localStorage (consider using httpOnly cookies for enhanced security in production)
2. **CORS**: Backend has CORS enabled for frontend communication
3. **Token Refresh**: Automatic refresh happens transparently to the user
4. **Password Requirements**: Backend enforces minimum 6-character passwords

## Troubleshooting

### User remains logged out after page refresh

- Check browser console for errors
- Verify `localStorage` is accessible
- Check if VITE_API_BASE_URL is correct in `.env`

### 401 errors on protected routes

- Ensure token exists in localStorage
- Check if token is expired (should auto-refresh)
- Verify backend is returning valid JWT tokens

### Login/Register form doesn't submit

- Check browser console for validation errors
- Ensure all required fields are filled
- Verify API endpoint is accessible

## Files Modified/Created

- ✅ `src/stores/auth.ts` - Auth state management
- ✅ `src/composables/useAuthService.ts` - Auth API service
- ✅ `src/composables/useAuthInit.ts` - Auth initialization
- ✅ `src/api/interceptors.ts` - JWT and token refresh handling
- ✅ `src/widgets/LoginWidget/LoginWidget.vue` - Login form implementation
- ✅ `src/widgets/UserMenu/UserMenu.vue` - User menu component
- ✅ `src/widgets/MainMenu/MainMenu.vue` - Updated to show user menu
- ✅ `src/router/index.ts` - Added auth guards and protected routes
- ✅ `src/i18n/locales/ru.json` - Russian translations
- ✅ `src/i18n/locales/en.json` - English translations
