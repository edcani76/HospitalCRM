# 🏥 VitaCare - Hospital CRM

A modern, full-stack Hospital Customer Relationship Management system built with React, Express, MongoDB, and powered by Google Gemini AI.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=flat&logo=google&logoColor=white)

## ✨ Features

### 🔐 Multi-Role Authentication
- **Administrator** - Full system access and management
- **Doctor** - Patient care, appointments, prescriptions
- **Staff** - Front desk operations, scheduling
- **Lab Technician** - Lab reports and test management
- **Pharmacist** - Medication and prescription management

### 📊 Role-Based Dashboards
- Real-time statistics and analytics
- Appointment management
- Patient tracking
- Revenue insights

### 🤖 AI-Powered Assistant (Gemini)
- Floating chat assistant for health queries
- Symptom analysis for medical professionals
- Medication information and drug interaction checks
- Healthcare-focused responses with medical disclaimers

### 🏥 Core Modules
- **Patient Management** - Registration, records, medical history
- **Appointments** - Scheduling, calendar view, reminders
- **EMR** - Electronic Medical Records
- **Billing** - Invoice generation, payment tracking
- **Pharmacy** - Inventory, prescriptions, stock alerts
- **Lab Reports** - Test management, result tracking
- **Analytics** - Comprehensive reports and insights

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas, Prisma ORM |
| **AI** | Google Gemini 2.0 Flash |
| **State** | React Query, React Context |
| **UI** | Radix UI, Lucide Icons, Recharts |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ansh0928/Hospital-CRM.git
   cd Hospital-CRM
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/hospitalcrm"
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Prisma Studio: `npm run db:studio` → http://localhost:5555

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vitacare.com | admin123 |
| Doctor | doctor@vitacare.com | doctor123 |
| Staff | staff@vitacare.com | staff123 |
| Lab Tech | lab@vitacare.com | lab123 |
| Pharmacist | pharmacist@vitacare.com | pharma123 |

## 📁 Project Structure

```
Hospital-CRM/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── layout/      # MainLayout, SideNav, TopBar
│   │   ├── ui/          # Shadcn components
│   │   └── machines/    # Machine management components
│   ├── pages/           # Page components
│   │   └── dashboards/  # Role-specific dashboards
│   ├── contexts/        # React contexts (Auth)
│   ├── lib/             # Utilities and services
│   │   └── aiService.ts # Gemini AI integration
│   ├── data/            # Sample/mock data
│   ├── types/           # TypeScript definitions
│   ├── server.js        # Express backend
│   └── App.tsx          # Main app component
├── prisma/
│   └── schema.prisma    # Database schema
└── .env.example         # Environment template
```

## 🔌 API Endpoints

### Health & Utility
- `GET /` - API info
- `GET /api/health` - Health check

### Patients
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### AI (Gemini-powered)
- `POST /api/ai/chat` - General health chat
- `POST /api/ai/symptoms` - Symptom analysis
- `POST /api/ai/medication` - Drug information

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend |
| `npm run client` | Start frontend only |
| `npm run server` | Start backend only |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Generate Prisma Client |

## 🔒 Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MongoDB connection string |
| `PORT` | Backend server port (default: 3001) |
| `NODE_ENV` | Environment (development/production) |
| `CORS_ORIGIN` | Allowed frontend origin |
| `GEMINI_API_KEY` | Google Gemini API key |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Ansh0928">Anshumaan Saraf</a>
</p>
