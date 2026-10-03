import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import weatherRoutes from './routes/weather.js';
import forecastRoutes from './routes/forecast.js';
import locationRoutes from './routes/location.js';
import farmerRoutes from './routes/farmer.js';
import travelRoutes from './routes/travel.js';
import alertsRoutes from './routes/alerts.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS Origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

if (process.env.FRONTEND_URL) {
  const customOrigins = process.env.FRONTEND_URL
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  customOrigins.forEach(origin => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin);
    }
  });
}

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-email']
}));

app.use(express.json());

// 1. HEALTH ENDPOINT
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'WeatherGPT Backend',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 2. ROUTE REGISTRATIONS
app.use('/api/weather', weatherRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', userRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.originalUrl} not found.`
    }
  });
});

// Centralized Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  WeatherGPT Backend Service running on port ${PORT}`);
  console.log(`  Local Health URL: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});

export default app;
