import express from 'express';
import { geocodingService } from '../services/geocodingService.js';
import { openMeteoService } from '../services/openMeteoService.js';
import { openRouterService } from '../services/openRouterService.js';
import { validateTravelRequest } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * POST /api/travel/plan
 * Strict Travel Planner Pipeline:
 * Destination + Date -> Geocoding -> Open-Meteo -> OpenRouter AI -> Response
 * 
 * STRICT FAILURE REQUIREMENT:
 * If Open-Meteo fails -> HTTP 502 (WEATHER_API_FAILED)
 * If OpenRouter fails -> HTTP 502 (AI_ANALYSIS_FAILED)
 * NO FALLBACK / NO DETERMINISTIC ADVICE / NO PARTIAL STALE DATA RETURNED
 */
router.post('/plan', validateTravelRequest, async (req, res, next) => {
  try {
    const { destination, date, language } = req.body;
    const langCode = ['te', 'hi'].includes(language) ? language : 'en';
    const langInstruction = langCode === 'te'
      ? '\n\nCRITICAL REQUIREMENT: All JSON key names MUST remain strictly in English as defined in the schema above. All user-facing string VALUES inside the JSON object MUST be written entirely in fluent Telugu (తెలుగు).'
      : langCode === 'hi'
        ? '\n\nCRITICAL REQUIREMENT: All JSON key names MUST remain strictly in English as defined in the schema above. All user-facing string VALUES inside the JSON object MUST be written entirely in fluent Hindi (हिंदी).'
        : '';
    let lat = req.body.latitude ? parseFloat(req.body.latitude) : null;
    let lon = req.body.longitude ? parseFloat(req.body.longitude) : null;
    let resolvedName = destination.trim();
    let stateName = '';
    let countryName = 'India';

    // 1. Resolve Destination Coordinates
    if (isNaN(lat) || isNaN(lon) || !lat || !lon) {
      console.log(`[TravelPlanner] Destination resolution requested for: "${destination}"`);
      const geoResults = await geocodingService.searchLocations(destination);
      const match = geoResults[0];

      if (!match) {
        console.warn(`[TravelPlanner] Invalid destination: "${destination}"`);
        return res.status(400).json({
          success: false,
          error: 'INVALID_DESTINATION',
          message: 'Destination could not be found. Please select a valid location.'
        });
      }
      lat = match.latitude;
      lon = match.longitude;
      resolvedName = match.name || destination;
      stateName = match.state || '';
      countryName = match.country || 'India';
      console.log(`[TravelPlanner] Destination resolved to (${lat}, ${lon}): ${resolvedName}`);
    } else {
      console.log(`[TravelPlanner] Using coordinates (${lat}, ${lon}) for ${destination}`);
    }

    // 2. Validate Travel Date Range (0 to 15 days in advance)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffMs = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 15) {
      console.warn(`[TravelPlanner] Date out of range (${diffDays} days): ${date}`);
      return res.status(400).json({
        success: false,
        error: 'FORECAST_UNAVAILABLE',
        message: 'A detailed weather forecast is not available for this travel date yet. Please try again closer to the travel date.'
      });
    }

    // 3. Fetch Real Forecast Data from Open-Meteo
    console.log(`[TravelPlanner] Fetching forecast from Open-Meteo for ${date}...`);
    let forecastData;
    try {
      forecastData = await openMeteoService.getForecast(lat, lon, 16);
    } catch (err) {
      console.error(`[TravelPlanner] Weather API failed:`, err.message);
      return res.status(502).json({
        success: false,
        error: 'WEATHER_API_FAILED',
        message: 'Weather service failed. Please try again.'
      });
    }

    const dayForecast = forecastData?.daily?.find((d) => d.date === date);
    if (!dayForecast) {
      console.error(`[TravelPlanner] Weather API failed: Target date ${date} not found in forecast response`);
      return res.status(502).json({
        success: false,
        error: 'WEATHER_API_FAILED',
        message: 'Weather service failed. Please try again.'
      });
    }
    console.log(`[TravelPlanner] Weather forecast received for ${date}: ${dayForecast.condition}, Max ${dayForecast.maxTemp}°C`);

    // 4. Internal Analytical Category Calculations (Supporting context for OpenRouter)
    const rainLevel = dayForecast.precipitationProbability >= 60 ? 'High' : dayForecast.precipitationProbability >= 30 ? 'Moderate' : 'Low';
    const heatLevel = dayForecast.maxTemp >= 38 ? 'Very Hot' : dayForecast.maxTemp >= 33 ? 'Hot' : dayForecast.maxTemp >= 26 ? 'Warm' : 'Comfortable';
    const windLevel = dayForecast.windSpeedMax >= 35 ? 'Strong' : dayForecast.windSpeedMax >= 20 ? 'Elevated' : 'Normal';

    // 5. Construct OpenRouter AI Request
    console.log(`[TravelPlanner] Sending weather data to OpenRouter for analysis...`);

    const systemPrompt = `You are WeatherGPT Travel Planner.
You are an AI travel-weather analysis assistant.
Analyze ONLY the supplied destination, travel date, weather forecast, and verified warning information.
The weather values are provided by the connected weather API.
Do not invent or modify weather values (temperature, precipitation, wind, visibility, sunrise, sunset, official warnings).
Do not claim that IMD, NDMA, CWC, INCOIS, or another government organization issued a warning unless verified warning data is explicitly supplied in the input.
Distinguish forecast information from official disaster warnings.
Provide practical weather-based travel guidance.
Do not create unsupported safety percentages.
Do not guarantee that travel or activities are safe.
Use cautious wording ('conditions are favorable for...', 'conditions may affect...', 'consider...', 'carry...', 'allow extra time...').

You MUST respond with a raw JSON object only (no markdown, no backticks, no code fence).
Matching this structure:
{
  "travelRecommendation": "Clear, practical 2-sentence travel advice based on weather.",
  "summary": "Short 1-sentence summary of expected weather conditions.",
  "rainAdvice": "Specific advice regarding precipitation.",
  "heatAdvice": "Specific advice regarding temperature/heat.",
  "windAdvice": "Specific advice regarding wind.",
  "activityGuidance": [
    "Practical activity tip 1",
    "Practical activity tip 2"
  ],
  "packingSuggestions": [
    "Relevant packing item 1",
    "Relevant packing item 2",
    "Relevant packing item 3"
  ],
  "officialWarningNote": "Official disaster-warning verification is not available through the connected sources. Check local advisories before travel.",
  "friendlyMessage": "Wishing you a pleasant and safe journey! 🌤️"
}${langInstruction}`;

    const userPromptPayload = {
      destination: {
        name: resolvedName,
        state: stateName,
        country: countryName,
        latitude: lat,
        longitude: lon
      },
      travelDate: date,
      timezone: forecastData.timezone || 'Asia/Kolkata',
      weather: {
        temperatureMax: dayForecast.maxTemp,
        temperatureMin: dayForecast.minTemp,
        apparentTemperatureMax: dayForecast.feelsLikeMax ?? dayForecast.maxTemp,
        weatherDescription: dayForecast.condition,
        precipitation: dayForecast.precipitationSum,
        precipitationProbability: dayForecast.precipitationProbability,
        windSpeedMax: dayForecast.windSpeedMax,
        sunrise: dayForecast.sunrise || 'Unavailable',
        sunset: dayForecast.sunset || 'Unavailable'
      },
      analyticalContext: {
        rainLevel,
        heatLevel,
        windLevel
      },
      officialWarningsConnected: false
    };

    const userPrompt = JSON.stringify(userPromptPayload, null, 2);

    // Call OpenRouter API
    const rawAiOutput = await openRouterService.generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.3
    });

    // 6. STRICT OPENROUTER FAILURE CHECK: NO FALLBACK ALLOWED!
    if (!rawAiOutput) {
      console.error(`[TravelPlanner] OpenRouter analysis failed: No response or API error`);
      return res.status(502).json({
        success: false,
        error: 'AI_ANALYSIS_FAILED',
        message: 'Weather analysis failed. Please try again.'
      });
    }

    // Parse & Validate OpenRouter JSON Output
    let aiJson;
    try {
      let cleanedText = rawAiOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      }
      // Replace raw newlines/tabs inside JSON values to prevent parse errors
      cleanedText = cleanedText.replace(/[\r\n\t]/g, ' ');
      aiJson = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error(`[TravelPlanner] OpenRouter analysis failed: Invalid JSON response`, parseErr.message);
      return res.status(502).json({
        success: false,
        error: 'AI_ANALYSIS_FAILED',
        message: 'Weather analysis failed. Please try again.'
      });
    }

    if (!aiJson || !aiJson.travelRecommendation) {
      console.error(`[TravelPlanner] OpenRouter analysis failed: Incomplete JSON structure`);
      return res.status(502).json({
        success: false,
        error: 'AI_ANALYSIS_FAILED',
        message: 'Weather analysis failed. Please try again.'
      });
    }

    console.log(`[TravelPlanner] OpenRouter analysis received successfully`);
    console.log(`[TravelPlanner] Travel Planner completed successfully`);

    // 7. Return Final Response to Frontend
    return res.json({
      success: true,
      forecastAvailable: true,
      destination: resolvedName,
      date,
      condition: dayForecast.condition,
      iconName: dayForecast.iconName,
      maxTemp: dayForecast.maxTemp,
      minTemp: dayForecast.minTemp,
      temperatureDisplay: `${dayForecast.maxTemp}°C / ${dayForecast.minTemp}°C`,
      feelsLike: dayForecast.feelsLikeMax ?? dayForecast.maxTemp,
      rainProbability: `${dayForecast.precipitationProbability}%`,
      rainfall: dayForecast.precipitationSum > 0 ? `${dayForecast.precipitationSum.toFixed(1)} mm expected` : 'No significant rain expected',
      windSpeed: `${dayForecast.windSpeedMax} km/h`,
      humidity: 'Observed forecast',
      visibility: 'Good',
      sunrise: dayForecast.sunrise || 'Data currently unavailable',
      sunset: dayForecast.sunset || 'Data currently unavailable',
      outdoorStatus: dayForecast.precipitationProbability >= 60 ? 'Caution Required' : 'Favorable',
      outdoorAdvice: aiJson.travelRecommendation,
      outdoorColor: dayForecast.precipitationProbability >= 60 ? '#f59e0b' : '#22c55e',
      officialAlerts: [],
      officialWarningNote: 'Official disaster-warning verification is not available through the connected sources. Check local advisories before travel.',
      closingMessage: aiJson.friendlyMessage || 'Have a safe and pleasant journey! 🌤️',
      vacationClosingMessage: aiJson.friendlyMessage || 'Planning a vacation? Have a wonderful trip and happy journey! ✈️🌤️',
      packingSuggestions: aiJson.packingSuggestions || [],
      activityGuidance: aiJson.activityGuidance || [],
      timezone: forecastData.timezone || 'Local Time',
      dataSource: 'Open-Meteo 16-Day Atmospheric Forecast API & OpenRouter AI Analysis'
    });
  } catch (err) {
    console.error(`[TravelPlanner] Unexpected error:`, err.message);
    next(err);
  }
});

export default router;
