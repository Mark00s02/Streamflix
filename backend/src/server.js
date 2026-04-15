import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/database.js';
import moviesRouter from './routes/movies.js';
import tvRouter from './routes/tv.js';
import usersRouter from './routes/users.js';
import watchlistRouter from './routes/watchlist.js';
import authMiddleware from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/tv', tvRouter);
app.use('/api/users', usersRouter);
app.use('/api/watchlist', authMiddleware, watchlistRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Streaming Platform Backend running on http://localhost:${PORT}`);
});
