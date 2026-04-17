# PKD Compass 🧭

**Polycystic Kidney Disease Patient Monitoring Platform**

A production-grade, privacy-focused Progressive Web App (PWA) for patients managing PKD. Track kidney function, medications (including Tolvaptan monitoring), blood pressure, and symptoms with a clinical-grade interface.

## 🚀 Quick Start (Local)

1.  **Install Dependencies**
    ```bash
    npm install
    ```
2.  **Configure Environment**
    Copy `.env.example` to `.env`. Ensure `DATABASE_URL="file:./dev.db"` for local SQLite.
    ```bash
    cp .env.example .env
    ```
3.  **Initialize Database**
    ```bash
    npx prisma db push
    ```
    *Note: If you encounter Prisma version issues, ensure your Node/NPM environment is clean.*
4.  **Run Development Server**
    ```bash
    npm run dev
    ```
5.  **Seed Data**
    Visit `http://localhost:3000/api/seed` in your browser to populate the dashboard with realistic demo patient data.

## 🌟 Key Features

- **Kidney Dashboard**: Clinical view of eGFR and uACR trends with G1-G5/A1-A3 staging.
- **Medication Adherence**: Track daily meds with specific logic for Tolvaptan (liver monitoring alerts).
- **Lab Trends**: Visualize electrolyte balance (Potassium, Sodium, Phosphorus) over time.
- **Clinical Reports**: Generate PDF summaries for doctor visits.
- **Alert Engine**: Smart notifications for rapid eGFR decline or abnormal values.
- **Privacy & Security**: Privacy-focused data structure with encryption and audit-log hooks.

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Vanilla CSS (Styled with modern CSS Variables).
- **Backend**: Next.js API Routes (Serverless-ready).
- **Database**: PostgreSQL (Production) / SQLite (Dev), managed via Prisma ORM.
- **Data Viz**: Recharts for trend analysis.
- **PDF**: Client-side generation with jsPDF.

## 📱 Mobile Access

### 1. Web Access (Simple)
To open the app in your phone's browser:
1. Run `npm run mobile` in the root folder.
2. Scan the QR code that appears.

### 2. Native App Experience (Expo Go)
To open the app as a native-like container without browser bars:
1. Ensure `npm run mobile` is running in one terminal.
2. Open a **new terminal**.
3. Run:
   ```bash
   cd mobile
   npm start
   ```
4. Scan the QR code from the **second terminal** with the **Expo Go** app on your phone.

### Install as PWA
If using Web Access, you can "install" the app:
- **iOS (Safari)**: Share -> "Add to Home Screen"
- **Android (Chrome)**: Three dots menu -> "Install app"

## ⚠️ Disclaimer

**For Educational Purposes Only.** This app does not provide medical advice, diagnosis, or treatment. Always consult your nephrologist for medical decisions.

## Deployment Note

This submission copy is intended for judging, review, and local evaluation. Internal deployment, infrastructure, and security-operations documentation from the private working repository is not included here.

## Licensing

This repository is public for judging, review, and demonstration only. It is not open source. All rights are reserved by Akhil Chakravarthy. See `LICENSE` and `NOTICE`.

