# SwiftVet — Multi-Tenant Veterinary Management Platform

SwiftVet is a multi-tenant management platform built to connect veterinary clinics, multi-branch operations, and pet owners into a unified digital ecosystem.

---

## How SwiftVet Works

*   **Clinic Owners (Web):** Register their clinic brand on the web platform to establish their digital presence. Each clinic can create and operate **multiple branch locations**.
*   **Branch Operations (Web):** Each branch runs its own workspace with role-based access for Branch Admins, Veterinarians, Groomers, and Staff to manage daily schedules, FEFO inventory, and medical records.
*   **Pet Owners (Mobile):** Clients use the mobile app to manage pet profiles, book multi-service appointments, track product orders, and view medical histories.
*   **Super Admin (Web):** Platform administrators manage clinic subscriptions, oversee onboarding, and curate global service templates.

---

## System Structure

<pre>
swift-vet/
├── 📁 super-admin/    # Web console for subscription and platform management (React)
├── 📁 clinic/         # Web workspace for clinic owners, branch admin, veterinarian and staff (React)
├── 📁 mobile/         # Mobile application for pet owners (React Native / Expo)
└── 📁 backend-api/    # Database (PHP / MySQL)
</pre>

---

## Key Features

### Super Admin Platform
*   **Subscription Management:** Controls tiered subscription plans defining branch limits, feature access, and usage durations.
*   **Global Service Templates:** Reviews and approves clinic-submitted services into shared templates for easy adoption across all clinics.

### Clinic & Branch Management
* **Multi-Branch Network:** Clinic owners can create and configure multiple branch locations under one business account.
* **Role-Based Permissions:** Customizable permission toggles for staff members (Admins, Vets, Groomers, Staff).
* **Dynamic Staff Rostering:** Supports custom working days, shift ranges, and dynamic time blocks for each veterinarian, groomer, and staff member.
* **"Eagle-Eye" Master Calendar:** Gives branch managers a centralized visual grid displaying individual staff shift windows, active bookings, and availability ranges with full override, reassignment, and acceptance capabilities.
* **Automated Medical History:** Completed appointments automatically generate medical records saved directly to the patient's global file.

### Dynamic Inventory & POS Engine
* **FEFO (First-Expired, First-Out) Inventory:** Automatically prioritizes selling items nearing expiration to reduce stock loss.
* **Flexible Checkout:** Supports online orders, walk-in cash payments, and direct appointment add-ons.

### Smart Scheduling Engine
* **Time-Block Stacking:** Calculates total appointment duration when booking multiple services together (e.g., 30-min Grooming + 1-hr Checkup = 1.5-hr slot).
* **Shift-Aware Conflict Prevention:** Cross-references dynamic staff working hours, branch operational limits, and current bookings to eliminate double-booking or out-of-shift appointments.

### Pet Owner Mobile App
* **Pet Profiles & Memorial Status:** Tracks health records for multiple pets. Deceased pets are given a memorial status to lock them from future booking while archiving their medical history.
* **Digital Records & Billing:** Pet owners can track order statuses, view receipts, and download official medical records as PDFs or images.

---

## Tech Stack & Tools

*   **Web Frontends:** React (Vite), React Router DOM, TailwindCSS, Framer Motion, Recharts, FullCalendar, React Toastify, SweetAlert2
*   **Mobile Frontend:** React Native (Expo), Expo Router
*   **Backend & DB:** PHP, MySQL, Firebase JWT, PHPMailer, Dompdf
*   **Tools & Hosting:** NPM, Composer, Git, VS Code, Vercel, InfinityFree