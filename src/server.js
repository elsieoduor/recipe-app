import express from 'express';
import { ENV } from './config/env.js';
import {db} from './config/db.js';
import { favoritesTable } from './db/schema.js';
import { and, eq } from 'drizzle-orm';
import job from './config/cron.js';
import cors from 'cors';

const app = express()
const PORT = ENV.PORT || 5001
if(ENV.NODE_ENV==='production')job.start()
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8081',       // Local development
      'http://localhost:19006',     // Expo web
      'exp://192.168.*.*:19000',    // Expo mobile (LAN)
    ];
    
    if (allowedOrigins.some(allowedOrigin => origin.startsWith(allowedOrigin))) {
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

app.use(express.json())

app.get("/api/favorites/:userId", async (req, res) => {
    try {
       const {userId} = req.params;
       const userFavorites= await db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId))
       
       res.json(userFavorites)
    } catch (error) {
       console.log("Error getting favorites", error);
       res.status(500).json({ error: "Something went wrong" }); 
    }
})

app.post("/api/favorites", async (req, res) => {
  try {
    const { userId, recipeId, title, image, cookTime, servings } = req.body;

    if (!userId || !recipeId || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newFavorite = await db.insert(favoritesTable)
      .values({userId, recipeId,title,image,cookTime,servings,})
      .returning();

    res.status(201).json(newFavorite[0]);
  } catch (error) {
    console.log("Error adding favorite", error);
    res.status(500).json({ error: "Something went wrong" });
  }
}); 

app.delete("/api/favorites/:userId/:recipeId", async (req, res) => {
    try {
       const{userId, recipeId}=req.params
       await db.delete(favoritesTable).where(
        and(
            eq(favoritesTable.userId, userId), 
            eq(favoritesTable.recipeId, parseInt(recipeId))
        )
       )
       res.status(200).json({ message: "Favorite removed successfully" });
    } catch (error) {
       console.log("Error removing favorite", error);
       res.status(500).json({ error: "Something went wrong" }); 
    }
})

app .listen(PORT, ()=>{
    console.log("Server is running on port", PORT);
})