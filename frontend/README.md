# QueueLess 🚀

QueueLess is a real-time queue and appointment management platform designed to help businesses manage customer queues efficiently while allowing customers to join and monitor queues remotely.

The platform provides separate experiences for customers and business owners with authentication, business management, service management, queue management, QR-based access, real-time updates, notifications, and analytics.

---

## ✨ Features

### 👤 Customer Features

- User registration and login
- JWT-based authentication
- Profile management
- Update profile information
- Change password
- Forgot password
- Browse available businesses
- Search businesses
- Filter businesses by category and city
- View business details
- View available services
- Join a service queue
- View current queue position
- Track queue status in real time
- Receive queue notifications
- View queue history
- Access businesses through QR code

### 🏢 Business Owner Features

- Business owner authentication
- Business profile management
- Update business information
- Open / close business
- Enable / disable queue
- Manage business services
- Add services
- Update services
- Delete services
- View active customer queues
- Call next customer
- Complete customer queue
- Skip customer queue
- Generate business QR code
- Real-time queue monitoring
- Notifications
- Analytics dashboard
- Account settings
- Profile management
- Change password

---

## 🛠️ Technology Stack

### Frontend

- React.js
- Vite
- JavaScript
- CSS
- Socket.IO Client
- QRCode React

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt
- Socket.IO
- REST APIs

### Development Tools

- Visual Studio Code
- Git
- GitHub
- Postman

---

## 🏗️ Project Structure

```text
QueueLess/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── .gitignore
└── README.md
