/**
 * Robust JSON extraction, parsing, and schema validation for AI model outputs.
 * Handles markdown code fences, unquoted boolean/null edge cases without blind string replacement,
 * and ensures reliable structured output for FarmerGPT.
 */

/**
 * Extracts JSON substring between the first '{' and the last '}'.
 * Safely removes markdown code fences if present.
 */
export function extractJsonCandidate(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Remove markdown code fences if present
  let cleaned = rawText
    .replace(/^```(?:json)?\s*/gim, '')
    .replace(/```\s*$/gim, '')
    .replace(/```/g, '')
    .trim();

  // 2. Find outermost JSON object braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return cleaned.substring(firstBrace, lastBrace + 1);
}

/**
 * Normalizes unquoted Indic boolean/null tokens specifically at JSON value positions.
 * NOTE: This is NOT a blind string replacement across text fields!
 * It matches ONLY after a property colon outside string quotes, directly followed by comma/closing bracket/space.
 *
 * Example:
 *   "officialAdvisoryAvailable": లేదు, -> "officialAdvisoryAvailable": false,
 * while leaving `"directAnswer": "వర్షం పడే అవకాశం లేదు"` completely untouched.
 */
export function normalizeValueTokens(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;

  return jsonStr
    // False values: లేదు (te), కాదు (te), లేవు (te), नहीं (hi), ना (hi)
    .replace(/(:\s*)(?:లేదు|కాదు|లేవు|నహీ|नहीं|ना)([\s,\}\]])/gi, '$1false$2')
    // True values: అవును (te), ఉంది (te), ఉన్నాయి (te), हाँ (hi), है (hi), सत्य (hi)
    .replace(/(:\s*)(?:అవును|ఉంది|ఉన్నాయి|हाँ|है|सత్య)([\s,\}\]])/gi, '$1true$2')
    // Null values: ఏదీ లేదు, ఏమీలేదు, कुछ नहीं
    .replace(/(:\s*)(?:ఏదీ\s*లేదు|ఏమీలేదు|కొన్ని\s*లేవు|कुछ\s*नहीं)([\s,\}\]])/gi, '$1null$2');
}

/**
 * Parses and validates FarmerGPT AI advice JSON.
 * @param {string} rawText - Raw completion output from OpenRouter
 * @param {string} intent - Question intent (e.g. 'crop_selection', 'crop_sowing')
 * @returns {{ success: boolean, data?: object, error?: string, rawExtracted?: string }}
 */
export function parseAndValidateFarmerAdvice(rawText, intent = 'general_farming') {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return { success: false, error: 'Empty AI response' };
  }

  const extracted = extractJsonCandidate(rawText);
  if (!extracted) {
    return { success: false, error: 'No JSON object found in AI response' };
  }

  let parsed = null;
  let parseError = null;

  // Pass 1: Strict direct JSON.parse
  try {
    parsed = JSON.parse(extracted);
  } catch (err1) {
    parseError = err1.message;

    // Pass 2: Try with value-token normalization and control character sanitization
    try {
      const sanitized = normalizeValueTokens(extracted).replace(/[\r\n\t]/g, ' ');
      parsed = JSON.parse(sanitized);
      parseError = null;
    } catch (err2) {
      parseError = err2.message;
    }
  }

  if (parseError || !parsed) {
    return {
      success: false,
      error: `JSON parse error: ${parseError || 'Unknown parsing failure'}`,
      rawExtracted: extracted
    };
  }

  // Schema Validation
  if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
    return { success: false, error: 'Parsed JSON is not an object' };
  }

  // Required field: directAnswer must be a non-empty string
  if (!parsed.directAnswer || typeof parsed.directAnswer !== 'string' || !parsed.directAnswer.trim()) {
    return { success: false, error: 'Missing or empty required field: directAnswer' };
  }

  // Ensure arrays for list fields
  const normalizeArray = (val) => {
    if (Array.isArray(val)) return val.map((item) => String(item).trim()).filter(Boolean);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  };

  parsed.directAnswer = String(parsed.directAnswer).trim();
  parsed.weatherAssessment = parsed.weatherAssessment ? String(parsed.weatherAssessment).trim() : '';
  parsed.timingAssessment = parsed.timingAssessment ? String(parsed.timingAssessment).trim() : '';
  parsed.risks = normalizeArray(parsed.risks);
  parsed.practicalSteps = normalizeArray(parsed.practicalSteps);
  parsed.missingInformation = normalizeArray(parsed.missingInformation);
  parsed.confidence = parsed.confidence ? String(parsed.confidence).trim() : 'medium';
  parsed.officialAdvisoryAvailable = Boolean(parsed.officialAdvisoryAvailable);

  if (intent === 'crop_selection' && Array.isArray(parsed.cropCandidates)) {
    parsed.cropCandidates = parsed.cropCandidates.filter(
      (c) => c && typeof c === 'object' && c.name
    );
  }

  return {
    success: true,
    data: parsed
  };
}
