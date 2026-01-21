# Real Estate Backend API (TypeScript)

Professional JWT-based authentication API for Real Estate Management System built with TypeScript.

## Features

- ✅ **TypeScript** - Fully typed codebase
- ✅ JWT Authentication with Access & Refresh Tokens
- ✅ Secure password hashing with bcrypt
- ✅ MongoDB integration with Mongoose
- ✅ Automatic token refresh mechanism
- ✅ Role-based access control (User/Admin)
- ✅ Comprehensive API documentation (Swagger)
- ✅ Industry-standard security practices

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/real_estate

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server (requires build first)
- `npm run type-check` - Type check without building

## API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:5000/api-docs`

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- **Body**: `{ name, email, password }`
- **Response**: User object with access and refresh tokens

#### Login
- **POST** `/api/auth/login`
- **Body**: `{ email, password }`
- **Response**: User object with access and refresh tokens

#### Refresh Token
- **POST** `/api/auth/refresh`
- **Body**: `{ refreshToken }`
- **Response**: New access token

#### Logout
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: Success message

#### Get Current User
- **GET** `/api/auth/me`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: Current user information

## Security Features

1. **JWT Tokens**:
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Tokens are stored securely in database

2. **Password Security**:
   - Passwords are hashed using bcrypt with salt rounds of 10
   - Passwords are never returned in API responses

3. **Token Refresh**:
   - Automatic token refresh mechanism
   - Refresh tokens are validated against database
   - Expired tokens are automatically cleared

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts      # MongoDB connection
│   │   └── swagger.ts       # Swagger configuration
│   ├── controllers/
│   │   └── authController.ts # Auth logic
│   ├── middleware/
│   │   └── auth.ts          # Authentication middleware
│   ├── models/
│   │   └── User.ts          # User model
│   ├── routes/
│   │   └── authRoutes.ts    # Auth routes
│   ├── types/
│   │   └── express.d.ts     # TypeScript type definitions
│   ├── utils/
│   │   └── jwt.ts           # JWT utilities
│   └── server.ts            # Express server
├── dist/                    # Compiled JavaScript (generated)
├── tsconfig.json            # TypeScript configuration
├── nodemon.json             # Nodemon configuration
├── .env                     # Environment variables
└── package.json
```

## TypeScript Configuration

The project uses strict TypeScript settings for type safety:
- Strict mode enabled
- No unused locals/parameters
- No implicit returns
- Source maps for debugging

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | - |
| JWT_SECRET | Secret for access tokens | - |
| JWT_EXPIRES_IN | Access token expiry | 15m |
| JWT_REFRESH_SECRET | Secret for refresh tokens | - |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiry | 7d |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:3000 |
| API_URL | API base URL | http://localhost:5000 |

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Production mode
npm start

# Type check
npm run type-check
```

## MongoDB Connection Fix

The MongoDB connection has been fixed by removing deprecated options (`useNewUrlParser` and `useUnifiedTopology`). These options are no longer needed in newer versions of Mongoose as they are enabled by default.

## License

ISC
