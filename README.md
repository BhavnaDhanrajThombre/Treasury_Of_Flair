##Treasury of Flair – Full Stack Art Marketplace

Treasury of Flair is a full-stack web application that provides an online platform for artists to showcase and sell their artworks and for users to purchase both artworks and art-related raw materials. The system includes user authentication, artwork management, order handling, and a raw-materials marketplace.

#Tech Stack
Frontend :HTML5, CSS3, Javascript (ES6+)
Backend :Node.js, Express.js
Database :SQL (for users, artworks, orders, materials, etc.)
Architecture :RESTful API, Three-tier architecture (Client → Server → Database)

#Features
User Management
User registration and login
Password hashing for security
User roles: Artist, Buyer

#Artwork Module
Artists upload artworks with images, titles, descriptions, pricing, and categories
Users browse artworks by category or search
Artwork search functionality
Order System
Buyers place orders for artworks
Order tracking and management
Artists view orders related to their artworks
Raw Materials Marketplace
Art supplies listed with descriptions and prices
Buyers can browse and purchase raw materials

#Profile Section
Artists: Manage uploaded artworks
Buyers: View purchase history

#API Overview (Sample Endpoints)
Authentication
POST /api/register
POST /api/login
DELETE /api/user/:id

Artworks
GET /api/artworks
GET /api/artworks/:id
POST /api/artworks/upload

Search
GET /api/search?query=

Orders
POST /api/order
GET /api/orders/user/:id

#Installation & Setup
1. Install Dependencies
npm install

2. Set Up Database

Import tables from database.txt
Configure DB credentials in server files

3. Start Backend Server
node server.js

4. Access Application
http://localhost:5000/

