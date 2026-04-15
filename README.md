# 🎬 Streaming Platform - Movie Viewing Website

A full-stack movie streaming platform with user authentication, movie browsing, search functionality, and personal watchlists. The app fetches free movies from The Movie Database (TMDb) API and stores user data in SQLite.

## Features

✨ **Core Features:**
- Browse popular movies with pagination
- Search for specific movies
- User registration and login with JWT authentication
- Personal watchlist management (add/remove movies)
- Persistent database storage with SQLite
- Responsive design for all devices
- Integration with TMDb API for free movie data

## Tech Stack

**Backend:**
- Node.js with Express.js
- SQLite3 database
- JWT for authentication
- Axios for API calls
- bcryptjs for password hashing
- CORS support

**Frontend:**
- React 18 with Vite
- React Router for navigation
- Axios for API requests
- CSS3 with gradient designs
- Responsive grid layouts

## Project Structure

```
Streaming Platform/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.js        # Database initialization and queries
│   │   ├── routes/
│   │   │   ├── movies.js          # Movie API endpoints
│   │   │   ├── users.js           # User auth endpoints
│   │   │   └── watchlist.js       # Watchlist endpoints
│   │   ├── middleware/
│   │   │   └── auth.js            # JWT authentication middleware
│   │   └── server.js              # Express server setup
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx         # Navigation header
│   │   │   ├── Login.jsx          # Login form
│   │   │   ├── Register.jsx       # Registration form
│   │   │   └── MovieCard.jsx      # Movie display component
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Popular movies page
│   │   │   ├── Search.jsx         # Movie search page
│   │   │   └── Watchlist.jsx      # User watchlist page
│   │   ├── styles/                # CSS modules
│   │   ├── api.js                 # API service
│   │   ├── App.jsx                # Main app component
│   │   └── main.jsx               # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md

```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Free TMDb API key (get it from https://www.themoviedb.org/settings/api)

### Backend Setup

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend folder:
```bash
cp .env.example .env
```

4. Edit `.env` and add your TMDb API key:
```
PORT=5000
TMDB_API_KEY=your_tmdb_api_key_here
JWT_SECRET=your_jwt_secret_key_here
DATABASE_PATH=./database.db
NODE_ENV=development
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Running the Application

1. Start the backend server (Terminal 1):
```bash
cd backend
npm run dev
```

2. Start the frontend server (Terminal 2):
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Movies
- `GET /api/movies/popular` - Get popular movies (paginated)
- `GET /api/movies/search?q=query` - Search for movies
- `GET /api/movies/:id` - Get movie details

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

### Watchlist (Requires Authentication)
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add movie to watchlist
- `DELETE /api/watchlist/:movieId` - Remove movie from watchlist

## Usage

### Create an Account
1. Click "Register" in the header
2. Enter username, email, and password
3. Submit the form

### Login
1. Click "Login" in the header
2. Enter your email and password
3. You'll be redirected to the home page

### Browse Movies
- The home page shows popular movies with pagination
- Click "Previous/Next" to browse different pages
- Hover over movies to see more details

### Search Movies
1. Click "Search" in the navigation
2. Enter movie title or keywords
3. Results will display instantly

### Manage Watchlist
1. Click "+ Add to Watchlist" on any movie card
2. Click "Watchlist" in the header to view your saved movies
3. Click "✕ Remove" to delete movies from your watchlist

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `TMDB_API_KEY` - Your TMDb API key
- `JWT_SECRET` - Secret key for JWT tokens
- `DATABASE_PATH` - Path to SQLite database
- `NODE_ENV` - Environment (development/production)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  created_at DATETIME
)
```

### Movies Table
```sql
CREATE TABLE movies (
  id INTEGER PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  title TEXT,
  overview TEXT,
  poster_path TEXT,
  release_date TEXT,
  rating REAL,
  created_at DATETIME
)
```

### Watchlist Table
```sql
CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY,
  user_id INTEGER (Foreign Key),
  movie_id INTEGER (Foreign Key),
  added_at DATETIME,
  UNIQUE(user_id, movie_id)
)
```

## Features Explained

### Movie Database Integration
- Movies are fetched from The Movie Database (TMDb) API
- Movie data is cached in SQLite for better performance
- Unlimited free movie browsing through TMDb's public data

### User Authentication
- Passwords are hashed using bcryptjs
- JWT tokens stored in browser localStorage
- Automatic token verification on protected routes

### Watchlist System
- Each user can save movies to their personal watchlist
- Watchlist is stored in SQLite database
- Real-time sync with backend

### Search & Filter
- Real-time search as you type
- Results from TMDb API
- Pagination for better performance

## Troubleshooting

### Problem: "TMDB API Key not found"
**Solution:** Make sure you've set the `TMDB_API_KEY` in your `.env` file

### Problem: "Cannot connect to backend"
**Solution:** Ensure backend is running on `http://localhost:5000`

### Problem: Database errors
**Solution:** Delete `database.db` and restart the server to reinitialize

### Problem: CORS errors
**Solution:** Check that backend CORS is properly configured in `server.js`

## Future Enhancements

- [ ] Movie ratings and reviews
- [ ] User profiles and activity history
- [ ] Advanced filtering (genre, year, rating)
- [ ] Recommendation system
- [ ] Social features (follow friends, share watchlists)
- [ ] Mobile app using React Native
- [ ] Streaming provider integration

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue on the project repository.

---

Happy Streaming! 🍿🎬
