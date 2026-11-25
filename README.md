# QueueMate — Smart Virtual Queue Management System

QueueMate lets customers join business queues virtually instead of standing in physical lines. Customers can browse businesses, generate digital tokens with QR codes, track their live queue position and estimated wait time, and receive alerts when their turn arrives. Service providers manage their businesses, call next customers, pause or resume queues, assign priority, and verify tickets via QR.

---

## Features

### Customer
- **Authentication:** JWT-based registration and login with role-based navigation.
- **Explore Businesses:** Search by name and filter by category (`Clinics`, `Salons`, `College Canteens`, `Photocopy Shops`, `Service Centres`).
- **Live Queue Details:** View currently serving token, waiting count, average service time, and estimated wait.
- **Digital Ticket & QR:** Generate a unique token (e.g., `A-001`) with a scannable QR code, live progress bar, and one-tap cancellation.
- **Real-Time Updates:** Automatic updates via Socket.IO when the queue advances or pauses, plus local turn notifications.
- **Queue History:** View past completed, skipped, and cancelled visits.

### Service Provider
- **Provider Dashboard:** Live view of currently serving token, waiting list, completed count today, and smart average service time.
- **Queue Controls:** Call Next, Complete, Skip, Pause/Resume queue, and toggle Priority on waiting tickets.
- **Business Management:** Create and edit business details, service duration, token prefix, and open/closed status.
- **QR Check-In:** Scan customer ticket QR codes using the device camera to verify status.

---

## Technology Stack

- **Mobile:** React Native, Expo (SDK 58), React Navigation, Socket.IO Client, `react-native-qrcode-svg`, `expo-camera`, `expo-notifications`
- **Backend:** Node.js, Express.js, Socket.IO, JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Database:** MongoDB Atlas, Mongoose

---

## Project Structure

```text
queuemate/
├── mobile/
│   ├── src/
│   │   ├── api/            # REST client & Socket.IO singleton
│   │   ├── components/     # Reusable UI primitives
│   │   ├── context/        # AuthContext (JWT + AsyncStorage)
│   │   ├── navigation/     # Role-based Stack & Tab navigators
│   │   ├── screens/        # Customer, Provider, and Auth screens
│   │   └── styles/         # Theme colors, spacing, shared styles
│   ├── App.js
│   ├── eas.json
│   └── package.json
├── server/
│   ├── config/             # MongoDB connection
│   ├── middleware/         # JWT & role-based auth middleware
│   ├── models/             # User, Business, Ticket schemas
│   ├── routes/             # Auth, Businesses, Queue, Provider APIs
│   ├── seed.js             # Demo data seeder
│   ├── server.js           # Express + Socket.IO entry point
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Installation & Setup

### 1. Backend (`queuemate/server`)

```bash
cd queuemate/server
npm install
cp .env.example .env
```

Update `.env` with your credentials:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/queuemate
JWT_SECRET=your_random_secret
```

Seed demo data (optional) and start the server:

```bash
node seed.js
node server.js
```

### 2. Mobile (`queuemate/mobile`)

```bash
cd queuemate/mobile
npm install
npx expo start
```

For physical devices on the same network, set `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000` before starting Expo.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register customer or provider |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current user |
| `GET` | `/api/businesses` | List/search/filter businesses |
| `POST` | `/api/businesses` | Create business (provider) |
| `PUT` | `/api/businesses/:id` | Update business (owner) |
| `POST` | `/api/queue/:businessId/join` | Join queue & get token |
| `GET` | `/api/queue/my-ticket` | Get active tickets with live position |
| `GET` | `/api/queue/history` | Get past tickets |
| `PUT` | `/api/queue/ticket/:id/cancel` | Cancel own ticket |
| `GET` | `/api/provider/queue/:businessId` | Provider dashboard data |
| `POST` | `/api/provider/queue/:businessId/next` | Call next customer |
| `PUT` | `/api/provider/ticket/:id/complete` | Complete called ticket |
| `PUT` | `/api/provider/ticket/:id/skip` | Skip waiting/called ticket |
| `PUT` | `/api/provider/ticket/:id/priority` | Toggle ticket priority |
| `PUT` | `/api/provider/queue/:businessId/pause` | Pause queue |
| `PUT` | `/api/provider/queue/:businessId/resume` | Resume queue |
| `POST` | `/api/provider/ticket/verify-qr` | Verify customer QR ticket |

---

## Demo Accounts

After running `node seed.js`:

- **Provider:** `provider@queuemate.demo` / `password123`
- **Customer:** `customer@queuemate.demo` / `password123`

---

## Deployment

- **Backend (Render):** Set root directory to `queuemate/server`, build command `npm install`, start command `node server.js`, and add `MONGODB_URI` and `JWT_SECRET` environment variables.
- **Android APK (EAS):**
  ```bash
  cd queuemate/mobile
  eas build -p android --profile preview
  ```
