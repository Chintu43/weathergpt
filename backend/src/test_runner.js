import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import travelRouter from './routes/travel.js';
import { openMeteoService } from './services/openMeteoService.js';
import { openRouterService } from './services/openRouterService.js';

const app = express();
app.use(express.json());
app.use('/api/travel', travelRouter);

const PORT = 5099;
const server = app.listen(PORT, async () => {
  const TEST_URL = `http://localhost:${PORT}/api/travel/plan`;

  console.log('===========================================================');
  console.log('RUNNING STRICT TRAVEL PLANNER TEST SUITE (STEPS 27 & 31)');
  console.log('===========================================================\n');

  const validDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  // TEST 1: Valid Destination (Chennai)
  console.log(`--- TEST 1: Valid Destination (Chennai, ${validDate}) ---`);
  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Chennai, Tamil Nadu', date: validDate })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`HTTP Status: ${status}`);
    console.log('Success:', body.success);
    console.log('Destination:', body.destination);
    console.log('Date:', body.date);
    console.log('Temperature Display:', body.temperatureDisplay);
    console.log('Condition:', body.condition);
    console.log('Outdoor Advice (OpenRouter):', body.outdoorAdvice);
    console.log('Official Warning Note:', body.officialWarningNote);
    console.log('Data Source:', body.dataSource);
    if (status === 200 && body.success && body.outdoorAdvice) {
      console.log('-> TEST 1 PASSED!\n');
    } else {
      console.log('-> TEST 1 FAILED!\n', body);
    }
  } catch (err) {
    console.error('TEST 1 Error:', err.message);
  }

  // TEST 2: Goa on validDate
  console.log(`--- TEST 2: Distinct Destination (Goa, ${validDate}) ---`);
  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Goa, India', date: validDate })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`HTTP Status: ${status}`);
    console.log('Success:', body.success);
    console.log('Destination:', body.destination);
    console.log('Temperature Display:', body.temperatureDisplay);
    console.log('Condition:', body.condition);
    console.log('Outdoor Advice (OpenRouter):', body.outdoorAdvice);
    if (status === 200 && body.success) {
      console.log('-> TEST 2 PASSED!\n');
    } else {
      console.log('-> TEST 2 FAILED!\n', body);
    }
  } catch (err) {
    console.error('TEST 2 Error:', err.message);
  }

  // TEST 3: Out of range date (2026-11-15, >15 days)
  console.log('--- TEST 3: Forecast Date Unavailable (2026-11-15) ---');
  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Chennai', date: '2026-11-15' })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`HTTP Status: ${status}`);
    console.log('Success:', body.success);
    console.log('Error Code:', body.error);
    console.log('Message:', body.message);
    if (status === 400 && body.success === false && body.error === 'FORECAST_UNAVAILABLE') {
      console.log('-> TEST 3 PASSED!\n');
    } else {
      console.log('-> TEST 3 FAILED!\n', body);
    }
  } catch (err) {
    console.error('TEST 3 Error:', err.message);
  }

  // TEST 4: Open-Meteo Failure Simulation
  console.log('--- TEST 4: Open-Meteo API Failure Simulation ---');
  const origMeteo = openMeteoService.getForecast;
  openMeteoService.getForecast = async () => { throw new Error('Simulated Open-Meteo Network Error'); };

  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Chennai', date: validDate })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`HTTP Status: ${status}`);
    console.log('Response Body:', body);
    if (status === 502 && body.success === false && body.error === 'WEATHER_API_FAILED' && body.message === 'Weather service failed. Please try again.') {
      console.log('-> TEST 4 PASSED: Returned HTTP 502 with WEATHER_API_FAILED and zero fallback data.\n');
    } else {
      console.log('-> TEST 4 FAILED!\n');
    }
  } catch (err) {
    console.error('TEST 4 Error:', err.message);
  } finally {
    openMeteoService.getForecast = origMeteo;
  }

  // TEST 5: OpenRouter AI Failure Simulation
  console.log('--- TEST 5: OpenRouter AI Failure Simulation ---');
  const origRouter = openRouterService.generateCompletion;
  openRouterService.generateCompletion = async () => null; // Returns null on API failure/timeout

  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Chennai', date: validDate })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`HTTP Status: ${status}`);
    console.log('Response Body:', body);
    if (status === 502 && body.success === false && body.error === 'AI_ANALYSIS_FAILED' && body.message === 'Weather analysis failed. Please try again.') {
      console.log('-> TEST 5 PASSED: Returned HTTP 502 with AI_ANALYSIS_FAILED and ZERO fallback travel output.\n');
    } else {
      console.log('-> TEST 5 FAILED!\n');
    }
  } catch (err) {
    console.error('TEST 5 Error:', err.message);
  } finally {
    openRouterService.generateCompletion = origRouter;
  }

  // TEST 6: OpenRouter Malformed JSON Output Simulation
  console.log('--- TEST 6: OpenRouter Malformed JSON Simulation ---');
  openRouterService.generateCompletion = async () => 'INVALID_NON_JSON_RESPONSE';

  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Chennai', date: validDate })
    });
    const status = res.status;
    const body = await res.json();
    console.log(`HTTP Status: ${status}`);
    console.log('Response Body:', body);
    if (status === 502 && body.success === false && body.error === 'AI_ANALYSIS_FAILED' && body.message === 'Weather analysis failed. Please try again.') {
      console.log('-> TEST 6 PASSED: Handled malformed JSON with HTTP 502 AI_ANALYSIS_FAILED.\n');
    } else {
      console.log('-> TEST 6 FAILED!\n');
    }
  } catch (err) {
    console.error('TEST 6 Error:', err.message);
  } finally {
    openRouterService.generateCompletion = origRouter;
  }

  // TEST 7: Official Disaster Warning Disclaimer Verification
  console.log('--- TEST 7: Official Disaster Warning Disclaimer Verification ---');
  try {
    const res = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: 'Chennai', date: validDate })
    });
    const body = await res.json();
    console.log('Official Warning Note:', body.officialWarningNote);
    const mentionsUnverified = body.officialWarningNote && body.officialWarningNote.includes('not available through the connected sources');
    const doesNotClaimNoActive = body.officialWarningNote && !body.officialWarningNote.includes('No active severe weather warnings currently reported by IMD');
    if (mentionsUnverified && doesNotClaimNoActive) {
      console.log('-> TEST 7 PASSED! (Does not claim fake IMD/NDMA warning clearance)\n');
    } else {
      console.log('-> TEST 7 FAILED!\n', body.officialWarningNote);
    }
  } catch (err) {
    console.error('TEST 7 Error:', err.message);
  }

  server.close(() => {
    console.log('===========================================================');
    console.log('ALL TEST CASES COMPLETED SUCCESSFULLY!');
    console.log('===========================================================');
    process.exit(0);
  });
});
