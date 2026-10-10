import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import farmerRouter from './routes/farmer.js';
import { openRouterService } from './services/openRouterService.js';
import { openMeteoService } from './services/openMeteoService.js';

const app = express();
app.use(express.json());
app.use('/api/farmer', farmerRouter);

const PORT = 5098;
const server = app.listen(PORT, async () => {
  const TEST_URL = `http://localhost:${PORT}/api/farmer/advice`;

  console.log('====================================================');
  console.log('RUNNING FARMER GPT LIVE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
    }
  }

  // Pre-fetch real mock weather for tests so tests don't hit external weather rate limits
  const mockWeather = {
    success: true,
    location: 'Guntur, Andhra Pradesh',
    temperature: 31,
    condition: 'Partly Cloudy',
    humidityValue: 65,
    windSpeedValue: 12,
    precipitationValue: 0,
    precipitation: '0.0 mm',
    forecast: {
      todayRain: 0,
      todayMax: 34,
      todayMin: 24,
      rainChance: 15
    }
  };

  const origWeather = openMeteoService.getCurrentWeather;
  openMeteoService.getCurrentWeather = async () => mockWeather;

  try {
    // TEST 1: Live Telugu FarmerGPT Request
    console.log('--- TEST 1: Live Telugu Request ---');
    const resTe = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Andhra Pradesh',
        district: 'Guntur',
        question: 'Can I sow cotton now?',
        language: 'te',
        latitude: 16.3067,
        longitude: 80.4365,
        weatherData: mockWeather
      })
    });
    const dataTe = await resTe.json();
    console.log('Telugu Status:', resTe.status);
    console.log('Direct Answer (te):', dataTe.advice?.directAnswer?.slice(0, 80));
    assert(
      resTe.status === 200 &&
      dataTe.success === true &&
      dataTe.advice &&
      typeof dataTe.advice.directAnswer === 'string' &&
      dataTe.advice.directAnswer.length > 0,
      'Test 1: Live Telugu FarmerGPT response parsed and valid'
    );

    // TEST 2: Live Groundnut Query
    console.log('\n--- TEST 2: Groundnut Query ---');
    const resGroundnut = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Andhra Pradesh',
        district: 'Ananthapuramu',
        question: 'Can I sow groundnut now?',
        language: 'en',
        latitude: 14.6819,
        longitude: 77.6006,
        weatherData: mockWeather
      })
    });
    const dataGroundnut = await resGroundnut.json();
    console.log('Groundnut Status:', resGroundnut.status);
    console.log('Crop:', dataGroundnut.crop);
    console.log('Direct Answer:', dataGroundnut.advice?.directAnswer?.slice(0, 80));
    assert(
      resGroundnut.status === 200 &&
      dataGroundnut.crop === 'groundnut' &&
      dataGroundnut.advice?.directAnswer,
      'Test 2: Groundnut analysis produces valid crop-specific advisory'
    );

    // TEST 3: Simulated Retry Success
    // Model returns unquoted malformed JSON on attempt 1, then corrects on retry
    console.log('\n--- TEST 3: Controlled Retry Success ---');
    const origGenerate = openRouterService.generateCompletion;
    let callCount = 0;
    openRouterService.generateCompletion = async (args) => {
      callCount++;
      if (callCount === 1) {
        // Attempt 1: Return malformed JSON that cannot be parsed by simple parser
        return `Broken JSON: { "directAnswer": "Incomplete answer", broken syntax`;
      }
      // Attempt 2 (retry): Return valid JSON
      return JSON.stringify({
        directAnswer: "Corrected valid answer after retry",
        crop: "cotton",
        intent: "crop_sowing",
        weatherAssessment: "Weather is fair",
        timingAssessment: "Timing is suitable",
        risks: ["Risk A"],
        practicalSteps: ["Step 1"],
        missingInformation: [],
        confidence: "medium",
        officialAdvisoryAvailable: false
      });
    };

    const resRetry = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Andhra Pradesh',
        district: 'Guntur',
        question: 'Can I sow cotton now?',
        language: 'en',
        latitude: 16.3067,
        longitude: 80.4365,
        weatherData: mockWeather
      })
    });
    const dataRetry = await resRetry.json();
    console.log('Retry Status:', resRetry.status);
    console.log('Calls made to OpenRouter:', callCount);
    console.log('Direct Answer:', dataRetry.advice?.directAnswer);
    assert(
      resRetry.status === 200 &&
      callCount === 2 &&
      dataRetry.advice?.directAnswer === "Corrected valid answer after retry",
      'Test 3: Controlled retry triggered on malformed JSON and succeeded on attempt 2'
    );

    // TEST 4: Simulated Retry Failure
    // Model fails both attempt 1 and retry
    console.log('\n--- TEST 4: Controlled Retry Failure (Structured 502) ---');
    callCount = 0;
    openRouterService.generateCompletion = async (args) => {
      callCount++;
      return `Still broken { malformed JSON`;
    };

    const resFail = await fetch(TEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state: 'Andhra Pradesh',
        district: 'Guntur',
        question: 'Can I sow cotton now?',
        language: 'en',
        latitude: 16.3067,
        longitude: 80.4365,
        weatherData: mockWeather
      })
    });
    const dataFail = await resFail.json();
    console.log('Failure Status:', resFail.status);
    console.log('Error Code:', dataFail.error);
    console.log('Error Message:', dataFail.message);
    console.log('Calls made to OpenRouter:', callCount);
    assert(
      resFail.status === 502 &&
      dataFail.success === false &&
      dataFail.error === 'AI_ANALYSIS_FAILED' &&
      callCount === 2,
      'Test 4: Controlled retry failure returns structured HTTP 502 error without crashing'
    );

    openRouterService.generateCompletion = origGenerate;
  } catch (err) {
    console.error('Integration test error:', err);
  } finally {
    openMeteoService.getCurrentWeather = origWeather;
    server.close();
    console.log(`\n====================================================`);
    console.log(`INTEGRATION SUMMARY: ${passed}/${total} TESTS PASSED`);
    console.log(`====================================================\n`);
    if (passed !== total) process.exit(1);
    else process.exit(0);
  }
});
