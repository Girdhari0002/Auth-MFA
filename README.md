# SecureID Authentication Platform

SecureID is a full-stack authentication project with a responsive frontend and a MongoDB-backed Express backend.

It supports:

- Email and password registration
- Real email OTP verification
- Real SMS OTP verification through Twilio
- Authenticator App setup with QR code
- Authenticator TOTP verification
- Registration completion only after all verification steps pass
- Login with email OTP, SMS OTP, or Authenticator App
- Google OAuth login
- MongoDB user, OTP challenge, pending-registration, and session storage
- JWT protected API access
- Responsive desktop and mobile UI

## Project structure

```text
SecureID/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── config.example.js
│   ├── vercel.json
│   └── src/
│       ├── main.js
│       ├── config.js
│       ├── api/
│       │   └── client.js
│       └── state/
│           └── store.js
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── database.js
│       │   └── env.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── googleController.js
│       │   └── registrationController.js
│       ├── models/
│       │   ├── OtpChallenge.js
│       │   ├── PendingRegistration.js
│       │   └── User.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── googleRoutes.js
│       │   └── registrationRoutes.js
│       └── services/
│           ├── deliveryService.js
│           ├── otpService.js
│           └── registrationService.js
│
├── .gitignore
├── backend/.gitignore
└── frontend/.gitignore
```

## Registration flow

```text
Registration form
    ↓
Pending registration saved in MongoDB
    ↓
Real email OTP
    ↓
Email verified
    ↓
Real SMS OTP
    ↓
Mobile verified
    ↓
Authenticator QR setup
    ↓
6-digit authenticator code
    ↓
User account created in MongoDB
    ↓
Registration success
```

The final `User` document is not created until email OTP, mobile OTP, and authenticator code verification all succeed.

## Login flow

```text
Email and password
    ↓
Choose a verification method
    ├── Email OTP
    ├── SMS OTP
    └── Authenticator App
    ↓
Authenticated session
```

Google login uses OAuth 2.0 and creates or links a verified Google account in MongoDB.

## Requirements

- Node.js 18 or newer
- npm
- MongoDB or MongoDB Atlas
- SMTP email account/provider
- Twilio account for SMS OTP
- Google Cloud OAuth credentials for Google login

## Backend setup

```powershell
cd C:\Users\girdh\Assigment1OCTB\backend
npm install
Copy-Item .env.example .env
```

Open `backend/.env` and configure all values.

### Environment variables

```env
PORT=3000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/SECUREID
FRONTEND_URL=http://localhost:3000

JWT_SECRET=replace-with-a-long-random-secret
SESSION_SECRET=replace-with-a-long-random-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
MAIL_FROM=SecureID <your-email@gmail.com>

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

For Gmail, use a Google App Password instead of the normal Gmail password.

## Run locally

### Option 1: Backend serves the frontend

```powershell
cd C:\Users\girdh\Assigment1OCTB\backend
npm run dev
```

Open:

```text
http://localhost:3000
```

### Option 2: Run frontend separately

Terminal 1:

```powershell
cd C:\Users\girdh\Assigment1OCTB\backend
npm run dev
```

Terminal 2:

```powershell
cd C:\Users\girdh\Assigment1OCTB\frontend
npx serve .
```

When the frontend runs on another port, configure the backend URL in `frontend/src/config.js`:

```js
window.__SECUREID_CONFIG__ = {
  apiBaseUrl: "http://localhost:3000",
};
```

## API endpoints

### Registration

```text
POST /api/register
POST /api/verify-email-otp
POST /api/verify-sms-otp
POST /api/setup-mfa
POST /api/verify-mfa
```

### Login and sessions

```text
POST /api/login
POST /api/login/challenge
POST /api/verify-login-otp
GET  /api/me
POST /api/logout
```

### Google OAuth

```text
GET /api/auth/google
GET /api/auth/google/callback
```

### JWT

```text
POST /api/token
GET  /api/protected
```

## Google OAuth configuration

In Google Cloud Console, create an OAuth Web Application client.

Local authorized JavaScript origin:

```text
http://localhost:3000
```

Local authorized redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

For production, replace localhost with the deployed backend domain.

## GitHub deployment

Create an empty repository on GitHub, then run these commands from the project root:

```powershell
cd C:\Users\girdh\Assigment1OCTB
git init
git add .
git commit -m "Initial SecureID project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Do not commit:

- `backend/.env`
- MongoDB credentials
- SMTP passwords
- Twilio auth tokens
- Google OAuth secrets
- JWT or session secrets

The `.gitignore` files are already configured for these files.

## Deploy backend on Render/Railway/Fly.io

Deploy the backend to Render, Railway, Fly.io, or another Node.js hosting provider.

Use:

```text
Root directory: backend
Install command: npm install
Start command: npm start
```

Add all variables from `backend/.env.example` in the hosting provider dashboard.

Set production values:

```env
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
GOOGLE_CALLBACK_URL=https://your-backend-domain.com/api/auth/google/callback
```

Use HTTPS domains in production.

### Deploy backend on Vercel

The backend includes `backend/api/index.js` as the Vercel serverless entrypoint.

1. Create a separate Vercel project from the same GitHub repository.
2. Set the project root directory to `backend`.
3. Leave the build command and output directory empty/default.
4. Add all variables from `backend/.env.example`.
5. Deploy.

The backend does not need a `vercel.json`. Do not add legacy `builds` or `routes` blocks; Vercel detects `api/index.js` automatically.

## Deploy frontend to Vercel

1. Import the GitHub repository into Vercel.
2. Set the project root to `frontend`.
3. Use the `Other` framework preset.
4. Leave the build command empty.
5. Deploy the project.
6. Update `frontend/src/config.js` with the deployed backend URL.
7. Redeploy after changing the backend URL.

Example:

```js
window.__SECUREID_CONFIG__ = {
  apiBaseUrl: "https://your-backend-domain.com",
};
```

Update Google OAuth settings with the production backend callback URL.

## Production checklist

- Use MongoDB Atlas instead of a local MongoDB instance.
- Restrict MongoDB network access to trusted backend hosts.
- Use HTTPS everywhere.
- Use strong random JWT and session secrets.
- Use a persistent MongoDB session store.
- Configure SMTP and Twilio production credentials.
- Rotate any credential that was exposed during development.
- Configure the exact frontend URL in `FRONTEND_URL`.
- For Vercel preview deployments, configure their comma-separated URLs in `FRONTEND_URLS`.
- Configure the exact Google callback URL.
- Confirm CORS and cookies work across frontend and backend domains.

## Security notes

- Passwords are hashed with bcrypt.
- OTPs are stored as hashes.
- OTPs expire and have limited verification attempts.
- OTPs are single-use.
- Pending registrations expire automatically with MongoDB TTL indexes.
- Session cookies are HTTP-only.
- Authentication tokens are not stored in `localStorage`.
