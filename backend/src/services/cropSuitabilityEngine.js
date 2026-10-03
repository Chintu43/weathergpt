import { INDIAN_CROPS_DATABASE } from '../data/cropDatabase.js';

/**
 * Classifies farmer's question intent and target crop
 */
export function classifyQuestionIntent(questionText = '') {
  const q = questionText.toLowerCase().trim();

  // Extract crop mention if present
  let crop = null;
  if (/cotton/i.test(q)) crop = 'cotton';
  else if (/rice|paddy/i.test(q)) crop = 'rice';
  else if (/groundnut|peanut/i.test(q)) crop = 'groundnut';
  else if (/pigeon pea|arhar|tur/i.test(q)) crop = 'pigeon pea';
  else if (/green gram|moong/i.test(q)) crop = 'green gram';
  else if (/black gram|urad/i.test(q)) crop = 'black gram';
  else if (/maize|corn/i.test(q)) crop = 'maize';
  else if (/wheat/i.test(q)) crop = 'wheat';
  else if (/sugarcane/i.test(q)) crop = 'sugarcane';
  else if (/chili|chilli/i.test(q)) crop = 'chili';
  else if (/tomato/i.test(q)) crop = 'tomato';
  else if (/mustard/i.test(q)) crop = 'mustard';
  else if (/soybean/i.test(q)) crop = 'soybean';
  else if (/bajra|pearl millet/i.test(q)) crop = 'bajra';

  // Determine intent & action
  let intent = 'general_farming';
  let action = 'monitor';

  if (/which crop|suitable crop|crop is suitable|what crop|what crops|best crop|suitable for this season|crops can i grow|what can i grow/i.test(q)) {
    intent = 'crop_selection';
    action = 'select_crop';
  } else if (/sow|plant|sowing|planting|grow/i.test(q)) {
    intent = 'crop_sowing';
    action = 'sow';
  } else if (/irrigate|irrigation|water my field|water the crop|watering/i.test(q)) {
    intent = 'irrigation';
    action = 'irrigate';
  } else if (/fertilizer|fertilise|urea|dap|npk|manure/i.test(q)) {
    intent = 'fertilizer';
    action = 'fertilize';
  } else if (/spray|pesticide|insecticide|fungicide/i.test(q)) {
    intent = 'pesticide_spray';
    action = 'spray';
  } else if (/disease|pest|blight|fungus|wilt|rot/i.test(q)) {
    intent = 'disease_risk';
    action = 'protect';
  } else if (/rain|rainfall|monsoon|heavy rain/i.test(q)) {
    intent = 'rainfall_impact';
    action = 'monitor';
  } else if (/harvest|harvesting|cutting/i.test(q)) {
    intent = 'harvest';
    action = 'harvest';
  } else if (/protect|protection|shield/i.test(q)) {
    intent = 'crop_protection';
    action = 'protect';
  } else if (/yield|production|improve|boost/i.test(q)) {
    intent = 'yield_improvement';
    action = 'monitor';
  } else if (/weather|temperature|wind|forecast/i.test(q)) {
    intent = 'weather_question';
    action = 'monitor';
  }

  // If specific crop is mentioned with sowing question, enforce crop_sowing intent
  if (crop && (intent === 'crop_selection' && /can i sow|can i grow|is .* suitable/i.test(q))) {
    intent = 'crop_sowing';
    action = 'sow';
  }

  const timeReference = /today|now/i.test(q) ? 'now' : (/tomorrow/i.test(q) ? 'tomorrow' : 'current_season');

  return {
    intent,
    crop,
    action,
    timeReference
  };
}

/**
 * Crop suitability analysis supporting two modes:
 * MODE A: Specific crop analysis (when a specific crop is targeted)
 * MODE B: Crop selection ranking (when user asks for general crop selection)
 */
export function analyzeCropSuitability({ state, district, weather, forecast, seasonInfo, questionAnalysis }) {
  const { intent, crop: targetCrop } = questionAnalysis;
  const currentTemp = weather.temperature;
  const currentRain = weather.precipitationValue || 0;
  const forecastRain = weather.forecast?.todayRain || 0;
  const currentSeason = seasonInfo.season;

  // Find targeted crop in DB if mentioned
  const dbCrop = targetCrop
    ? INDIAN_CROPS_DATABASE.find(
        (c) => c.name.toLowerCase().includes(targetCrop.toLowerCase()) || c.id.toLowerCase().includes(targetCrop.toLowerCase())
      )
    : null;

  // MODE A: Specific Crop Analysis
  if (targetCrop && intent !== 'crop_selection') {
    const cropData = dbCrop || {
      name: targetCrop,
      category: 'Target Crop',
      waterRequirement: 'Moderate',
      seasons: ['Kharif'],
      temperature: { min: 20, max: 35 },
      productionConsiderations: ['Ensure well-drained soil', 'Monitor weather forecast before sowing']
    };

    const isSeasonMatch = cropData.seasons.includes(currentSeason);
    const isTempMatch = currentTemp >= (cropData.temperature?.min || 18) && currentTemp <= (cropData.temperature?.max || 38);

    return {
      mode: 'SPECIFIC_CROP',
      crop: cropData.name,
      isSeasonMatch,
      isTempMatch,
      waterRequirement: cropData.waterRequirement,
      weatherSensitivity: cropData.weatherSensitivity || 'Sensitive to extreme weather',
      productionConsiderations: cropData.productionConsiderations || [],
      sowingWindowSummary: `Normal sowing season: ${cropData.seasons.join('/')}. Current month: ${seasonInfo.month} (${currentSeason} season)`
    };
  }

  // MODE B: Crop Selection Ranking (Multiple Crops)
  const evaluatedCrops = INDIAN_CROPS_DATABASE.map((crop) => {
    let score = 0;
    const reasons = [];

    // 1. Season Match
    if (crop.seasons.includes(currentSeason)) {
      score += 35;
      reasons.push(`Compatible with current ${currentSeason} season`);
    } else {
      reasons.push(`Primarily grown in ${crop.seasons.join('/')} season`);
    }

    // 2. State suitability
    const isStateMatch = crop.suitableStates.some((st) => st.toLowerCase().includes(state.toLowerCase()));
    if (isStateMatch) {
      score += 30;
      reasons.push(`Widely cultivated in ${state}`);
    } else {
      reasons.push(`General regional compatibility for warm agro-climatic zones`);
    }

    // 3. Temperature Match
    if (currentTemp >= crop.temperature.min && currentTemp <= crop.temperature.max) {
      score += 25;
      reasons.push(`Observed temperature (${currentTemp}°C) is within optimal ${crop.temperature.min}–${crop.temperature.max}°C range`);
    } else {
      reasons.push(`Observed temperature (${currentTemp}°C) is outside optimal ${crop.temperature.min}–${crop.temperature.max}°C range`);
    }

    // 4. Rainfall / Water requirement (No false relative humidity == soil moisture reasoning)
    const totalRain = currentRain + forecastRain;
    if (crop.waterRequirement === 'High' && totalRain > 5) {
      score += 10;
      reasons.push(`Recent/forecast rainfall supports high water requirement`);
    } else if (crop.waterRequirement === 'Low' || crop.waterRequirement === 'Drought-Tolerant') {
      score += 10;
      reasons.push(`Resilient under dry/low-rainfall conditions`);
    }

    let suitability = 'Less suitable';
    if (score >= 70) suitability = 'Highly suitable';
    else if (score >= 45) suitability = 'Potentially suitable';

    return {
      crop: crop.name,
      category: crop.category,
      suitability,
      score,
      waterRequirement: crop.waterRequirement,
      reasons
    };
  });

  evaluatedCrops.sort((a, b) => b.score - a.score);
  const topCandidates = evaluatedCrops.slice(0, 4);

  return {
    mode: 'CROP_SELECTION',
    topCandidates
  };
}
