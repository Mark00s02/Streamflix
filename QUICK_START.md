# ⚡ Quick Start Guide

Get the Streaming Platform running in 5 minutes!

## Step 1: Get TMDb API Key

1. Go to https://www.themoviedb.org/settings/api
2. Sign up (it's free!) or log in
3. Create a new API key for a developer account
4. Copy your API key

## Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env file and add your TMDb API Key
# Windows: notepad .env
# Mac/Linux: nano .env

# The .env should look like:
# PORT=5000
# TMDB_API_KEY=your_actual_api_key_here
# JWT_SECRET=random_secret_key_here
# DATABASE_PATH=./database.db
# NODE_ENV=development

# Start the server
npm run dev
```

Expected output:
```
✅ Connected to SQLite database
✅ Database tables initialized
🎬 Streaming Platform Backend running on http://localhost:5000
```

## Step 3: Setup Frontend (New Terminal)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Expected output:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Press h to show help
```

## Step 4: Open in Browser

Open your browser and go to: **http://localhost:3000**

## Step 5: Create Account & Start Using

1. Click "Register" button
2. Create an account with any username/email/password
3. Click login and enter your credentials
4. Browse popular movies
5. Search for movies
6. Add movies to your watchlist

## Commands Reference

### Backend Commands
```bash
npm run dev      # Start development server with auto-reload
npm start        # Start production server
npm install      # Install dependencies
```

### Frontend Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm install      # Install dependencies
```

## Stopping the Servers

- Press `Ctrl+C` in the terminal running the server
- Each server (backend and frontend) runs independently

## Common Issues

### Issue: "Cannot POST /api/users/login"
- Check backend is running on http://localhost:5000
- Check for errors in backend terminal

### Issue: "API key is invalid"
- Verify your TMDb API key in .env file
- Make sure there are no extra spaces or quotes

### Issue: "Port 5000 already in use"
- Change PORT in .env to 8000 or another available port

### Issue: "Module not found"
- Delete node_modules folder and run `npm install` again
- Clear npm cache: `npm cache clean --force`

## Features to Try

✅ **Browse** - Check out popular movies on the home page  
✅ **Search** - Find movies by title or keywords  
✅ **Register** - Create a new account  
✅ **Watchlist** - Save movies to watch later  
✅ **Pagination** - Browse through different pages of popular movies  

## Next Steps

- Customize the theme colors in CSS files
- Add more features (ratings, reviews, etc.)
- Deploy to production (Vercel for frontend, Heroku for backend)
- Share with friends!

## Need Help?

Check the main README.md for detailed documentation and API endpoints.

---

Enjoy your movie streaming platform! 🎬🍿
