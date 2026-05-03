<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MediPaws (VetCRM)

MediPaws is a modern, responsive veterinary clinic management system built to streamline the pet care experience. It provides a beautiful interface for pet owners to find veterinary specialists, explore clinic services, and securely book appointments.

## ✨ Features
 
- **Secure Authentication:** Integrated Google Sign-In via Firebase for seamless and secure user access.
- **Veterinary Profiles:** Browse, search, and filter a directory of specialized veterinarians (e.g., Cardiology, Surgery, Preventive Care).
- **Service Catalog:** Detailed overview of clinic departments including Diagnostic Medicine, Avian/Exotics, Therapy/Rehabilitation, and Emergency Care.
- **Appointment Booking:** Interactive calendar and time-slot selector to easily schedule and request pet visits.
- **Advanced CRM System:** Comprehensive management for Pet Owners, Patients, and Electronic Medical Records (EMR).
- **EMR Mode Detection:** Auto-detects Active Visit (in-progress) vs View Mode with real-time status.
- **Quick Start Visit:** One-click walk-in/emergency visits from Patient Profile or EMR page with doctor selector.
- **Service Management:** Full UI for adding/removing/editing services in appointments (Doctor/Grooming/Laboratory).
- **Intelligent Breadcrumbs:** Context-aware, recursive navigation system for deep record hierarchies.
- **Medical Billing:** Full-featured invoicing system with PDF generation and insurance tracking.
- **Admin & Specialized Dashboards:** Role-based dashboards for Doctors, Pharmacists, and Lab Technicians.
- **AI Integration:** Powered by Google Gemini for smart medical assistance and data insights.
- **Progress Tracking:** See [PROGRESS.md](PROGRESS.md) for current development status and roadmap.
- **Workflow Documentation:** See [WORKFLOW.md](WORKFLOW.md) for complete appointment lifecycle and service management.

## 🛠️ Technology Stack

This application is built with a modern web stack designed for performance, scalability, and an excellent developer experience:

- **Frontend Framework:** React 19 & Vite 6
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS v4
- **Icons & Animations:** Lucide React & Framer Motion
- **Backend & Database:** Firebase 12 (Firestore & Authentication)
- **AI Capabilities:** Google GenAI SDK (`@google/genai`)
- **Server:** Node.js / Express
- **Language:** TypeScript

## ⚙️ Environment Variables

To run this application locally, you must create a `.env` (or `.env.local`) file in the root directory and configure the following variables:

```env
# Required for Gemini AI API calls.
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# The URL where this applet is hosted (Used for self-referential links & OAuth).
# For local development, this can be set to http://localhost:3000
APP_URL="http://localhost:3000"
```

*Note: Firebase configuration is handled separately in `firebase-applet-config.json`.*

## 🚀 Run Locally

**Prerequisites:** Node.js (v18+ recommended)

1. Clone the repository and navigate to the project directory.
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Set your environment variables in `.env` as described above.
4. Ensure your Firebase configuration is up-to-date in `firebase-applet-config.json`.
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open your browser and navigate to `http://localhost:3000`.
