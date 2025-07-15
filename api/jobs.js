// index.js (CommonJS version for local testing)
import dotenv from 'dotenv';
import express from 'express';

import cors from 'cors';
import { connectDB } from '../db/db.js';

import { jobRoutes } from '../routes/api.js';

const app = express();
app.use(express.json());

// Define your job routes
app.get('/jobs', jobRoutes.getJobs);
app.post('/jobs', jobRoutes.postJobs);

// Connect to MongoDB and start the server
connectDB().then(() => {
  app.listen(3000, () => {
    console.log('🚀 Local server running on http://localhost:3000');
  });
}).catch(err => {
  console.error('❌ DB connection failed:', err);
});
