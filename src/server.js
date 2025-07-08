import express from 'express';
import { ENV } from './config/env.js';
import { db } from './config/db.js';
import { favoritesTable } from './db/schema.js';
import { and, eq } from 'drizzle-orm';
import job from './config/cron.js';
import cors from 'cors';

const app = express();
const PORT = ENV.PORT || 5001;

// Start cron job in production
if (ENV.NODE_ENV === 'production') job.start();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8081',       // Local development
      'http://localhost:19006',      // Expo web
      /^exp:\/\/192\.168\.\d{1,3}\.\d{1,3}:19000$/, // Expo mobile (LAN) - using regex
    ];
    
    if (allowedOrigins.some(allowedOrigin => 
      typeof allowedOrigin === 'string' 
        ? origin.startsWith(allowedOrigin)
        : allowedOrigin.test(origin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true });
});

// Get user favorites
app.get("/api/favorites/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const userFavorites = await db.select()
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, userId));
       
    res.json(userFavorites);
  } catch (error) {
    console.error("Error getting favorites:", error);
    res.status(500).json({ error: "Something went wrong" }); 
  }
});

// Add new favorite
app.post("/api/favorites", async (req, res) => {
  try {
    const { userId, recipeId, title, image, cookTime, servings } = req.body;

    // Validate required fields
    if (!userId || !recipeId || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate types
    if (typeof userId !== 'string' || typeof recipeId !== 'number' || typeof title !== 'string') {
      return res.status(400).json({ error: "Invalid field types" });
    }

    const newFavorite = await db.insert(favoritesTable)
      .values({
        userId, 
        recipeId,
        title,
        image,
        cookTime,
        servings,
      })
      .returning();

    res.status(201).json(newFavorite[0]);
  } catch (error) {
    console.error("Error adding favorite:", error);
    
    // Handle duplicate entry case
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ error: "Recipe already in favorites" });
    }
    
    res.status(500).json({ error: "Something went wrong" });
  }
}); 

// Remove favorite
app.delete("/api/favorites/:userId/:recipeId", async (req, res) => {
  try {
    const { userId, recipeId } = req.params;
    
    // Validate parameters
    if (!userId || !recipeId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const recipeIdNum = parseInt(recipeId);
    if (isNaN(recipeIdNum)) {
      return res.status(400).json({ error: "Invalid recipe ID" });
    }

    const result = await db.delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, userId), 
          eq(favoritesTable.recipeId, recipeIdNum)
        )
      );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.status(200).json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Something went wrong" }); 
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});