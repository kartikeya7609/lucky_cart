# 🍀 Lucky Cart - Premium MERN E-commerce Platform

Welcome to **Lucky Cart**, a modern, highly scalable, and fully responsive e-commerce platform built with the **MERN stack** (MongoDB, Express, React, Node.js). It offers robust features for Consumers, Sellers, and System Administrators, providing an end-to-end marketplace experience with cutting-edge UI/UX.

---

## 🌟 Key Features

### 🛒 Consumer (Buyer) Features
- **Sleek Marketplace**: Explore a dynamic, searchable, and paginated inventory with beautiful glassmorphism product cards, interactive hover states, and discount badges.
- **Cart & Wishlist System**: Add items to your cart, save items for later in your personalized wishlist, and easily manage quantities.
- **Order Management**: View historical orders, track delivery statuses, and submit detailed reviews (with star ratings) only for products you've successfully purchased.
- **Profile Dashboard**: Track your loyalty points, view analytics of your monthly spending, manage multiple delivery addresses, and edit personal information in real-time.
- **Email OTP Verification**: Secure registration flow validated through real-time OTP sent directly to your email (powered by EmailJS).
- **Price Drop Notifications**: Coming Soon - Advanced tracking for when wishlist items go on sale.

### 🏪 Seller Features
- **Advanced Inventory Management**: Dedicated Seller Panel to view all active listings with smart search and fast client-side pagination.
- **Product Creation & Editing**: Create rich product listings with Cloudinary-backed image uploads, price controls, and inventory stock tracking.
- **Bulk CSV Uploads**: Upload hundreds of products at once using robust CSV parsing with inline error validation.
- **Order Tracking**: Review items ordered by consumers and manage stock automatically upon purchase.

### 🛡️ Admin Features
- **Superadmin Console**: Exclusive dashboard for monitoring platform health.
- **Order Overrides**: Complete ability to cancel, modify, or forcefully update the status of any order across the platform.
- **Database Tools**: Reset platform databases, manage user roles, and export critical platform data.

### 📱 General Platform Highlights
- **Mobile-First Responsive Design**: Flawless navigation using an app-like Bottom Navigation Bar on mobile screens, and a sleek top navbar on desktops.
- **JWT Authentication**: Secure, stateful sessions using HttpOnly cookies with automatic token refreshing.
- **TailwindCSS Architecture**: Deep custom utility layer overriding standard presets for a consistent, dark-mode, neon-accented aesthetic.

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v16+)
- [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas) or local MongoDB instance
- [Cloudinary Account](https://cloudinary.com/) (For product images)
- [EmailJS Account](https://www.emailjs.com/) (For OTP verification)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd lucky_cart
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Configuration:
   Create a `.env` file in the `backend/` directory. Use the provided `.env.example` as a template:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.../lucky_cart
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configuration:
   Ensure that the `src/utils/api.js` points to your backend URL (`http://localhost:5000/api`).
   *(Note: Vite proxy is configured in `vite.config.js` to handle `/api` requests automatically).*
4. EmailJS Configuration:
   In `frontend/src/pages/Register.jsx`, update the `emailjs.send` and `emailjs.init` credentials with your own keys to enable OTP emails.
5. Start the frontend development server:
   ```bash
   npm run dev
   ```

### 4. Access the Platform
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite), React Router, Tailwind CSS, Lucide-React, EmailJS
- **Backend**: Node.js, Express.js, Mongoose
- **Database**: MongoDB (Atlas)
- **Image Hosting**: Cloudinary
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs

---

*Built with ❤️ for a modern e-commerce experience.*
# lucky_cart
