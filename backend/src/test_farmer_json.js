import {
  extractJsonCandidate,
  normalizeValueTokens,
  parseAndValidateFarmerAdvice
} from './utils/aiJsonParser.js';
import { classifyQuestionIntent } from './services/cropSuitabilityEngine.js';

console.log('====================================================');
console.log('RUNNING FARMER GPT JSON PARSER UNIT TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// TEST 1: Valid English JSON
const validEnglish = JSON.stringify({
  directAnswer: "Yes, you can sow cotton now provided soil moisture is adequate.",
  crop: "cotton",
  intent: "crop_sowing",
  weatherAssessment: "Warm conditions with moderate humidity.",
  timingAssessment: "Current window is suitable for cotton sowing.",
  risks: ["Dry spell risk", "Pest incidence"],
  practicalSteps: ["Check seed viability", "Ensure proper spacing"],
  missingInformation: ["Soil moisture level"],
  confidence: "medium",
  officialAdvisoryAvailable: false
});
const res1 = parseAndValidateFarmerAdvice(validEnglish, 'crop_sowing');
assert(res1.success === true && res1.data.crop === 'cotton', 'Test 1: Valid English JSON');

// TEST 2: Valid Telugu JSON with Telugu strings
const validTelugu = JSON.stringify({
  directAnswer: "ప్రస్తుతం పత్తి విత్తడానికి అనుకూలమైన సమయం.",
  crop: "cotton",
  intent: "crop_sowing",
  weatherAssessment: "వాతావరణం అనుకూలంగా ఉంది.",
  timingAssessment: "విత్తే కాలం సరైనది.",
  risks: ["వర్షపాతం లోటు"],
  practicalSteps: ["విత్తన శుద్ధి చేయండి"],
  missingInformation: ["నేల రకం"],
  confidence: "medium",
  officialAdvisoryAvailable: false
});
const res2 = parseAndValidateFarmerAdvice(validTelugu, 'crop_sowing');
assert(res2.success === true && res2.data.directAnswer.includes('పత్తి'), 'Test 2: Valid Telugu JSON');

// TEST 3: Valid Hindi JSON
const validHindi = JSON.stringify({
  directAnswer: "हाँ, आप अभी कपास की बुवाई कर सकते हैं।",
  crop: "cotton",
  intent: "crop_sowing",
  weatherAssessment: "मौसम उपयुक्त है।",
  timingAssessment: "बुवाई का सही समय है।",
  risks: ["कम बारिश का जोखिम"],
  practicalSteps: ["बीजोपचार करें"],
  missingInformation: ["मिट्टी की नमी"],
  confidence: "medium",
  officialAdvisoryAvailable: false
});
const res3 = parseAndValidateFarmerAdvice(validHindi, 'crop_sowing');
assert(res3.success === true && res3.data.directAnswer.includes('कपास'), 'Test 3: Valid Hindi JSON');

// TEST 4: Markdown code fences
const fencedText = `Here is the advisory:
\`\`\`json
${validTelugu}
\`\`\`
Hope this helps!`;
const res4 = parseAndValidateFarmerAdvice(fencedText, 'crop_sowing');
assert(res4.success === true && res4.data.directAnswer.includes('పత్తి'), 'Test 4: Markdown code fences stripped cleanly');

// TEST 5: Unquoted Telugu boolean value: "officialAdvisoryAvailable": లేదు
const unquotedTeluguBoolean = `{
  "directAnswer": "ప్రస్తుతం పత్తి విత్తడానికి అవకాశం లేదు.",
  "crop": "cotton",
  "intent": "crop_sowing",
  "weatherAssessment": "ఎండ తీవ్రత ఎక్కువగా ఉంది.",
  "timingAssessment": "సమయం అనుకూలం కాదు.",
  "risks": ["నీటి కొరత"],
  "practicalSteps": ["తేమ ఉండేలా చూడండి"],
  "missingInformation": ["నీటి లభ్యత"],
  "confidence": "medium",
  "officialAdvisoryAvailable": లేదు
}`;
const res5 = parseAndValidateFarmerAdvice(unquotedTeluguBoolean, 'crop_sowing');
assert(
  res5.success === true &&
  res5.data.officialAdvisoryAvailable === false &&
  res5.data.directAnswer === "ప్రస్తుతం పత్తి విత్తడానికి అవకాశం లేదు.",
  'Test 5: Unquoted Telugu boolean "లేదు" safely normalized without touching legitimate Telugu text'
);

// TEST 6: Unquoted Hindi boolean value: "officialAdvisoryAvailable": नहीं
const unquotedHindiBoolean = `{
  "directAnswer": "अभी बुवाई नहीं करनी चाहिए।",
  "crop": "cotton",
  "intent": "crop_sowing",
  "weatherAssessment": "गर्मी अधिक है।",
  "timingAssessment": "समय अनुकूल नहीं है।",
  "risks": ["पानी की कमी"],
  "practicalSteps": ["सिंचाई करें"],
  "missingInformation": ["मिट्टी जांच"],
  "confidence": "medium",
  "officialAdvisoryAvailable": नहीं
}`;
const res6 = parseAndValidateFarmerAdvice(unquotedHindiBoolean, 'crop_sowing');
assert(
  res6.success === true &&
  res6.data.officialAdvisoryAvailable === false &&
  res6.data.directAnswer.includes('बुवाई'),
  'Test 6: Unquoted Hindi boolean "नहीं" safely normalized without touching text inside strings'
);

// TEST 7: Irreparably malformed JSON
const brokenJson = `{ "directAnswer": "Broken text", "risks": [ broken syntax `;
const res7 = parseAndValidateFarmerAdvice(brokenJson, 'crop_sowing');
assert(res7.success === false && typeof res7.error === 'string', 'Test 7: Irreparably malformed JSON properly caught');

// TEST 8: Missing required field (directAnswer)
const missingRequired = `{
  "crop": "cotton",
  "intent": "crop_sowing",
  "risks": ["Risk 1"]
}`;
const res8 = parseAndValidateFarmerAdvice(missingRequired, 'crop_sowing');
assert(res8.success === false && res8.error.includes('directAnswer'), 'Test 8: Missing required field directAnswer rejected');

// TEST 9: Groundnut crop question classification & crop suitability
const groundnutQ = "Can I sow groundnut now?";
const classified = classifyQuestionIntent(groundnutQ);
assert(classified.crop === 'groundnut' && classified.intent === 'crop_sowing', 'Test 9: Groundnut classification preserved');

console.log(`\n====================================================`);
console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`====================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
