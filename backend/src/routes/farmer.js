import express from 'express';
import { geocodingService } from '../services/geocodingService.js';
import { openMeteoService } from '../services/openMeteoService.js';
import { openRouterService } from '../services/openRouterService.js';
import { validateFarmerRequest } from '../middleware/validateRequest.js';
import { detectAgriculturalSeason } from '../utils/seasonDetector.js';
import { classifyQuestionIntent, analyzeCropSuitability } from '../services/cropSuitabilityEngine.js';
import { parseAndValidateFarmerAdvice } from '../utils/aiJsonParser.js';

const router = express.Router();

/**
 * POST /api/farmer/advice
 * FarmerGPT Question-Driven Pipeline:
 * Question Classification -> Geocoding -> Open-Meteo Weather -> Season Detection -> Crop Suitability Mode -> OpenRouter AI -> JSON Output
 */
router.post('/advice', validateFarmerRequest, async (req, res, next) => {
  try {
    const { state, district, question, language } = req.body;
    const langCode = ['te', 'hi'].includes(language) ? language : 'en';
    let lat = req.body.latitude ? parseFloat(req.body.latitude) : null;
    let lon = req.body.longitude ? parseFloat(req.body.longitude) : null;
    const currentDateStr = new Date().toISOString().split('T')[0];

    // 1. Question Intent Classification
    const questionAnalysis = classifyQuestionIntent(question);
    const { intent, crop, action, timeReference } = questionAnalysis;

    const langInstruction = langCode === 'te'
      ? `\n\nCRITICAL LANGUAGE & JSON SPECIFICATION:
- Output ONE valid JSON object only. Do NOT include markdown code fences, comments, or extra text.
- All JSON key names MUST remain strictly in English matching the schema above.
- All user-facing string VALUES inside the JSON object ("directAnswer", "weatherAssessment", "timingAssessment", items in "risks", "practicalSteps", "missingInformation"${intent === 'crop_selection' ? ', and "cropCandidates" reasons' : ''}) MUST be written entirely in fluent Telugu (తెలుగు).
- Every string MUST be enclosed in standard double quotes ("...").
- Boolean values MUST strictly be the English JSON literals true or false. NEVER translate boolean values into Telugu (NEVER output words like లేదు, కాదు, లేవు, అవును as boolean values).
- Missing, unknown, or unobserved values MUST strictly be null, never words like లేదు.
- Enum values for "confidence" ('high', 'medium', 'low'), "crop", and "intent" MUST remain in English.`
      : langCode === 'hi'
        ? `\n\nCRITICAL LANGUAGE & JSON SPECIFICATION:
- Output ONE valid JSON object only. Do NOT include markdown code fences, comments, or extra text.
- All JSON key names MUST remain strictly in English matching the schema above.
- All user-facing string VALUES inside the JSON object ("directAnswer", "weatherAssessment", "timingAssessment", items in "risks", "practicalSteps", "missingInformation"${intent === 'crop_selection' ? ', and "cropCandidates" reasons' : ''}) MUST be written entirely in fluent Hindi (हिंदी).
- Every string MUST be enclosed in standard double quotes ("...").
- Boolean values MUST strictly be the English JSON literals true or false. NEVER translate boolean values into Hindi (NEVER output words like नहीं, ना, हाँ as boolean values).
- Missing, unknown, or unobserved values MUST strictly be null, never words like नहीं.
- Enum values for "confidence" ('high', 'medium', 'low'), "crop", and "intent" MUST remain in English.`
        : `\n\nCRITICAL JSON SPECIFICATION:
- Output ONE valid JSON object only. Do NOT include markdown code fences, comments, or extra text.
- Every string MUST be enclosed in standard double quotes.
- Boolean values MUST strictly be true or false.
- Missing values MUST strictly be null.`;

    // Required Backend Logs (Requirement 17)
    console.log(`[FarmerGPT] Request received`);
    console.log(`[FarmerGPT] Question: ${question}`);
    console.log(`[FarmerGPT] Intent: ${intent}`);
    console.log(`[FarmerGPT] Crop: ${crop || 'none'}`);
    console.log(`[FarmerGPT] Action: ${action}`);
    console.log(`[FarmerGPT] Location: ${district}, ${state}`);

    // 2. Resolve coordinates if missing
    if (isNaN(lat) || isNaN(lon) || !lat || !lon) {
      const searchResults = await geocodingService.searchLocations(`${district}, ${state}, India`);
      const match = searchResults.find(
        (r) => r.country?.toLowerCase().includes('india') || r.name.toLowerCase().includes('india')
      ) || searchResults[0];

      if (!match) {
        return res.status(404).json({
          success: false,
          error: 'LOCATION_NOT_FOUND',
          message: `Could not find coordinates for "${district}, ${state}". Please verify the location.`
        });
      }
      lat = match.latitude;
      lon = match.longitude;
    }

    // 3. Fetch real weather from Open-Meteo (STRICT: fail hard if unavailable)
    console.log(`[FarmerGPT] Fetching Open-Meteo data...`);
    let weather;
    try {
      weather = await openMeteoService.getCurrentWeather(lat, lon, `${district}, ${state}`);
    } catch (weatherErr) {
      console.error(`[FarmerGPT] Weather API failed:`, weatherErr.message);
      return res.status(502).json({
        success: false,
        error: 'WEATHER_API_FAILED',
        message: 'Weather service failed. Please try again.'
      });
    }

    if (!weather || !weather.success) {
      console.error(`[FarmerGPT] Weather API failed: Response marked unsuccessful`);
      return res.status(502).json({
        success: false,
        error: 'WEATHER_API_FAILED',
        message: 'Weather service failed. Please try again.'
      });
    }
    console.log(`[FarmerGPT] Weather data received`);

    // 4. Season Detection using current date
    const seasonInfo = detectAgriculturalSeason(new Date());

    // 5. Run Crop Suitability Engine (Mode A: Specific crop or Mode B: Crop selection)
    if (intent === 'crop_selection') {
      console.log(`[FarmerGPT] Running crop selection analysis`);
    } else {
      console.log(`[FarmerGPT] Running specific crop analysis for ${crop || 'general query'}`);
    }

    const suitabilityResults = analyzeCropSuitability({
      state,
      district,
      weather,
      forecast: weather.forecast,
      seasonInfo,
      questionAnalysis
    });

    // 6. Build Structured Context & Prompt for OpenRouter AI (Requirements 8 & 9)
    const structuredContext = {
      location: {
        district,
        state,
        country: 'India'
      },
      currentDate: currentDateStr,
      question: question.trim(),
      intent,
      crop: crop || 'none',
      action,
      timeReference,
      season: {
        currentSeason: seasonInfo.season,
        month: seasonInfo.month,
        stage: seasonInfo.sowingStatus
      },
      weather: {
        temperature: weather.temperature,
        humidity: weather.humidityValue ?? 50,
        rain: weather.precipitationValue ?? 0,
        windSpeed: weather.windSpeedValue ?? 0,
        weatherDescription: weather.condition
      },
      forecast: {
        rain: weather.forecast?.todayRain ?? 0,
        rainProbability: weather.forecast?.rainChance ?? 0,
        todayMax: weather.forecast?.todayMax ?? null,
        todayMin: weather.forecast?.todayMin ?? null
      },
      agriculturalAnalysis: suitabilityResults
    };

    const systemPrompt = `You are FarmerGPT, an evidence-based agricultural advisory assistant for India.

Your primary responsibility is to answer the farmer's exact question.

The user's question has priority over generic crop suitability analysis.

If the user asks about a specific crop, analyze that crop only.

Do not generate a list of alternative crops unless the user explicitly asks for crop alternatives or crop selection.

Use only the supplied weather, forecast, location, date, agricultural context and other verified data.

Do not invent soil conditions, irrigation availability, government advisories, disease outbreaks, rainfall, crop prices, or official recommendations.

Relative humidity is not soil moisture.

Do not treat humidity as proof that soil has enough water.

Distinguish:
- observed/current weather
- forecast weather
- agricultural inference
- official advisory

If official district/block agricultural advisory data is unavailable, explicitly say so.

Never claim that IMD, KVK, CWC, Agriculture Department, or another authority issued advice unless that source is actually connected and the advisory is present in the supplied data.

For crop sowing questions:
1. Identify the crop.
2. Determine whether the timing is generally within or outside the crop's normal sowing window, only when reliable crop-calendar information is available.
3. Analyze current and upcoming weather.
4. Identify important risks.
5. State what additional information is missing.
6. Give a concise practical recommendation.
7. Do not overstate certainty.

Answer the user's question directly in the first paragraph.

Do not create unrelated crop rankings.

Do not produce generic farming advice unrelated to the question.

MUST RESPOND strictly with EXACTLY ONE valid JSON object matching this schema (NO markdown code fences, NO comments, NO text before or after):
{
  "directAnswer": "Direct, clear answer addressing the question in the first paragraph.",
  "crop": "${crop || 'none'}",
  "intent": "${intent}",
  "weatherAssessment": "Relevant weather assessment based strictly on temperature, rain, forecast, humidity, wind.",
  "timingAssessment": "Assessment of sowing timing, season compatibility, or operational window.",
  "risks": ["Risk bullet 1", "Risk bullet 2"],
  "practicalSteps": ["Actionable step 1", "Actionable step 2"],
  "missingInformation": ["Soil type details", "Irrigation availability details", "Exact field moisture status"],
  "confidence": "medium",
  "officialAdvisoryAvailable": false${intent === 'crop_selection' ? ',\n  "cropCandidates": [\n    { "name": "Crop Name", "suitability": "Highly suitable", "reason": "Reason details" }\n  ]' : ''}
}${langInstruction}`;

    const userPrompt = JSON.stringify(structuredContext, null, 2);

    // 7. Call OpenRouter AI — STRICT: no fallback, fail hard
    const startTimeAi = Date.now();
    console.log(`[FarmerGPT] Calling OpenRouter AI for agricultural advice (attempt 1)`);
    const rawAiOutput = await openRouterService.generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1200
    });
    const aiDuration = Date.now() - startTimeAi;
    console.log(`[FarmerGPT] OpenRouter attempt 1 completed in ${aiDuration}ms`);

    if (!rawAiOutput) {
      console.error(`[FarmerGPT] OpenRouter response was empty or null`);
      return res.status(502).json({
        success: false,
        error: 'AI_ANALYSIS_FAILED',
        message: 'Weather analysis failed. Please try again.'
      });
    }

    // 8. Robust JSON Parsing, Schema Validation & Controlled Single Retry
    let parseResult = parseAndValidateFarmerAdvice(rawAiOutput, intent);
    let retryCount = 0;

    if (!parseResult.success) {
      console.warn(`[FarmerGPT] AI JSON parsing failed on attempt 1 (${parseResult.error}). Triggering controlled retry...`);
      retryCount = 1;

      const targetLanguageName = langCode === 'te' ? 'Telugu (తెలుగు)' : langCode === 'hi' ? 'Hindi (हिंदी)' : 'English';
      const correctionSystemPrompt = `You are a strict JSON correction assistant for FarmerGPT.
Your task is to fix the previous output into EXACTLY ONE valid, well-formed JSON object matching the schema below.

STRICT JSON SYNTAX RULES:
1. Return EXACTLY ONE valid JSON object starting with '{' and ending with '}'.
2. Absolutely NO markdown code fences (do NOT use \`\`\`json or \`\`\`), no conversational text before or after.
3. Every string value MUST be enclosed in standard double quotes ("...").
4. Boolean values MUST strictly be the English literals true or false. NEVER translate booleans into words like లేదు, కాదు, हाँ, or नहीं.
5. Missing or unknown values MUST strictly be null, NEVER unquoted words.
6. All JSON key names MUST remain strictly in English matching the schema.
7. User-facing advice text must remain in ${targetLanguageName}.

REQUIRED SCHEMA:
{
  "directAnswer": "Direct, clear answer addressing the question in the first paragraph.",
  "crop": "${crop || 'none'}",
  "intent": "${intent}",
  "weatherAssessment": "Relevant weather assessment.",
  "timingAssessment": "Assessment of sowing timing.",
  "risks": ["Risk bullet 1", "Risk bullet 2"],
  "practicalSteps": ["Actionable step 1", "Actionable step 2"],
  "missingInformation": ["Missing information 1"],
  "confidence": "medium",
  "officialAdvisoryAvailable": false${intent === 'crop_selection' ? ',\n  "cropCandidates": [\n    { "name": "Crop Name", "suitability": "Highly suitable", "reason": "Reason details" }\n  ]' : ''}
}`;

      const correctionUserPrompt = `The previous response failed JSON parsing with error: "${parseResult.error}".
Here is the previous raw output:
${rawAiOutput}

Return ONLY the corrected, valid JSON object matching the required schema.`;

      const startTimeRetry = Date.now();
      console.log(`[FarmerGPT] Calling OpenRouter AI for JSON correction (attempt 2, retry 1)`);
      const retryAiOutput = await openRouterService.generateCompletion({
        systemPrompt: correctionSystemPrompt,
        userPrompt: correctionUserPrompt,
        temperature: 0.1,
        maxTokens: 1200
      });
      const retryDuration = Date.now() - startTimeRetry;
      console.log(`[FarmerGPT] OpenRouter attempt 2 completed in ${retryDuration}ms`);

      if (retryAiOutput) {
        parseResult = parseAndValidateFarmerAdvice(retryAiOutput, intent);
      } else {
        parseResult = { success: false, error: 'Empty response on retry' };
      }
    }

    if (!parseResult.success) {
      console.error(`[FarmerGPT] JSON parsing failed after retry: ${parseResult.error}`);
      return res.status(502).json({
        success: false,
        error: 'AI_ANALYSIS_FAILED',
        message: 'Weather analysis failed. Please try again.',
        details: `Malformed AI response after retry: ${parseResult.error}`
      });
    }

    console.log(`[FarmerGPT] AI JSON parsing and validation succeeded (retries: ${retryCount})`);
    const parsedAdvice = parseResult.data;

    console.log(`[FarmerGPT] OpenRouter analysis received`);
    console.log(`[FarmerGPT] FarmerGPT completed successfully`);

    // 9. Send successful structured response to frontend
    return res.json({
      success: true,
      district,
      state,
      locationLabel: `${district}, ${state}`,
      question: question.trim(),
      intent,
      crop: crop || null,
      action,
      currentDate: currentDateStr,
      season: seasonInfo.season,
      current: {
        temperature: `${weather.temperature}°C`,
        condition: weather.condition,
        rain: weather.precipitation || '0.0 mm',
        humidity: `${weather.humidityValue ?? 'N/A'}%`,
        wind: `${weather.windSpeedValue ?? 'N/A'} km/h`
      },
      forecast: {
        todayRain: weather.forecast?.todayRain != null ? `${Number(weather.forecast.todayRain).toFixed(1)} mm` : '0.0 mm',
        todayMax: weather.forecast?.todayMax != null ? `${Math.round(weather.forecast.todayMax)}°C` : 'N/A',
        rainChance: weather.forecast?.rainChance != null ? `${weather.forecast.rainChance}%` : '0%'
      },
      advice: parsedAdvice,
      unavailableNote: 'District-specific official agricultural advisory data (IMD/KVK) is not available through the connected sources. Weather-based guidance is provided above.',
      source: 'Open-Meteo observations & OpenRouter AI',
      updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } catch (err) {
    console.error(`[FarmerGPT] Unexpected error:`, err);
    return next(err);
  }
});

export default router;
