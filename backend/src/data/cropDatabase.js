/**
 * Structured Indian Crop Knowledge Base for FarmerGPT
 * Contains realistic agronomic requirements, seasonal suitability, and temperature/water parameters.
 */

export const INDIAN_CROPS_DATABASE = [
  {
    id: 'rice_paddy',
    name: 'Rice (Paddy)',
    category: 'Cereal',
    seasons: ['Kharif'],
    sowingMonths: ['June', 'July', 'August'],
    temperature: { min: 20, max: 37 },
    waterRequirement: 'High',
    lowWaterSuitable: false,
    suitableStates: [
      'Andhra Pradesh', 'Telangana', 'West Bengal', 'Punjab', 'Uttar Pradesh',
      'Tamil Nadu', 'Odisha', 'Bihar', 'Assam', 'Chhattisgarh', 'Karnataka', 'Kerala'
    ],
    weatherSensitivity: 'Requires abundant water during vegetative growth; sensitive to prolonged dry spells during tillering.',
    productionConsiderations: [
      'Ensure proper land leveling and field bunding for standing water management.',
      'Maintain 2–5 cm water depth during critical growth stages.',
      'Pause nitrogen fertilizer application during heavy rain forecast.'
    ]
  },
  {
    id: 'cotton',
    name: 'Cotton',
    category: 'Cash Crop',
    seasons: ['Kharif'],
    sowingMonths: ['May', 'June', 'July'],
    temperature: { min: 21, max: 38 },
    waterRequirement: 'Medium',
    lowWaterSuitable: false,
    suitableStates: [
      'Gujarat', 'Maharashtra', 'Telangana', 'Andhra Pradesh', 'Punjab',
      'Haryana', 'Rajasthan', 'Karnataka', 'Madhya Pradesh', 'Tamil Nadu'
    ],
    weatherSensitivity: 'Sensitive to waterlogging and heavy rainfall during boll formation and picking stage.',
    productionConsiderations: [
      'Maintain clean field drainage to prevent root rot during heavy rains.',
      'Monitor for sucking pests during warm, humid weather.',
      'Avoid spraying pesticides during strong winds or rain.'
    ]
  },
  {
    id: 'maize',
    name: 'Maize (Corn)',
    category: 'Cereal',
    seasons: ['Kharif', 'Rabi', 'Zaid'],
    sowingMonths: ['June', 'July', 'October', 'November', 'March'],
    temperature: { min: 18, max: 35 },
    waterRequirement: 'Medium',
    lowWaterSuitable: true,
    suitableStates: [
      'Karnataka', 'Madhya Pradesh', 'Maharashtra', 'Telangana', 'Andhra Pradesh',
      'Bihar', 'Rajasthan', 'Uttar Pradesh', 'Tamil Nadu', 'Gujarat'
    ],
    weatherSensitivity: 'Sensitive to waterlogging during early seedling stage; highly versatile across temperature ranges.',
    productionConsiderations: [
      'Ensure adequate field drainage as maize cannot tolerate standing water.',
      'Apply earthing up 30-35 days after sowing for crop support against wind.',
      'Apply balanced NPK nutrients based on local soil test.'
    ]
  },
  {
    id: 'groundnut',
    name: 'Groundnut (Peanut)',
    category: 'Oilseed',
    seasons: ['Kharif', 'Rabi', 'Zaid'],
    sowingMonths: ['June', 'July', 'November', 'December', 'March'],
    temperature: { min: 20, max: 35 },
    waterRequirement: 'Low',
    lowWaterSuitable: true,
    suitableStates: [
      'Gujarat', 'Rajasthan', 'Tamil Nadu', 'Andhra Pradesh', 'Karnataka',
      'Telangana', 'Maharashtra', 'Madhya Pradesh', 'Odisha'
    ],
    weatherSensitivity: 'Requires dry, well-drained soil during pod development; vulnerable to leaf spot during high humidity.',
    productionConsiderations: [
      'Suitable for light to medium well-drained soils.',
      'Avoid excess watering during pegging and pod ripening stage.',
      'Apply gypsum at flowering to boost pod filling.'
    ]
  },
  {
    id: 'soybean',
    name: 'Soybean',
    category: 'Oilseed',
    seasons: ['Kharif'],
    sowingMonths: ['June', 'July'],
    temperature: { min: 18, max: 34 },
    waterRequirement: 'Medium',
    lowWaterSuitable: true,
    suitableStates: [
      'Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Karnataka', 'Telangana',
      'Chhattisgarh', 'Andhra Pradesh'
    ],
    weatherSensitivity: 'Requires adequate soil moisture during germination and pod filling; susceptible to waterlogging.',
    productionConsiderations: [
      'Sow when topsoil moisture is optimal after first monsoon rains.',
      'Maintain proper seed treatment with Rhizobium culture.',
      'Ensure field drainage to prevent stem rot in heavy monsoons.'
    ]
  },
  {
    id: 'pigeon_pea',
    name: 'Pigeon Pea (Arhar / Tur)',
    category: 'Pulse',
    seasons: ['Kharif'],
    sowingMonths: ['June', 'July'],
    temperature: { min: 18, max: 38 },
    waterRequirement: 'Drought-Tolerant',
    lowWaterSuitable: true,
    suitableStates: [
      'Maharashtra', 'Madhya Pradesh', 'Karnataka', 'Telangana', 'Andhra Pradesh',
      'Uttar Pradesh', 'Gujarat', 'Jharkhand'
    ],
    weatherSensitivity: 'Extremely drought tolerant due to deep root system; sensitive to frost and waterlogging.',
    productionConsiderations: [
      'Ideal crop for rainfed dryland agriculture.',
      'Often intercropped with cotton, maize, or soybean.',
      'Ensure ridge sowing if field is prone to heavy rainfall.'
    ]
  },
  {
    id: 'green_gram',
    name: 'Green Gram (Moong)',
    category: 'Pulse',
    seasons: ['Kharif', 'Zaid'],
    sowingMonths: ['June', 'July', 'March', 'April'],
    temperature: { min: 20, max: 36 },
    waterRequirement: 'Low',
    lowWaterSuitable: true,
    suitableStates: [
      'Rajasthan', 'Madhya Pradesh', 'Maharashtra', 'Karnataka', 'Andhra Pradesh',
      'Telangana', 'Punjab', 'Haryana', 'Uttar Pradesh', 'Odisha'
    ],
    weatherSensitivity: 'Short maturity crop (60-70 days); sensitive to heavy rain during pod maturity.',
    productionConsiderations: [
      'Excellent short-duration summer crop following wheat harvest.',
      'Improves soil nitrogen fertility naturally.',
      'Requires dry weather during pod harvesting.'
    ]
  },
  {
    id: 'wheat',
    name: 'Wheat',
    category: 'Cereal',
    seasons: ['Rabi'],
    sowingMonths: ['October', 'November', 'December'],
    temperature: { min: 10, max: 26 },
    waterRequirement: 'Medium',
    lowWaterSuitable: false,
    suitableStates: [
      'Uttar Pradesh', 'Punjab', 'Haryana', 'Madhya Pradesh', 'Rajasthan',
      'Bihar', 'Gujarat', 'Maharashtra', 'Uttarakhand'
    ],
    weatherSensitivity: 'Cool winter climate required during vegetative growth; terminal heat waves damage grain filling.',
    productionConsiderations: [
      'Sow in optimal November window for cool temperature benefit.',
      'Schedule crown root initiation (CRI) irrigation 20-25 days after sowing.',
      'Protect crop against late-season heat stress.'
    ]
  },
  {
    id: 'chickpea',
    name: 'Chickpea (Gram / Chana)',
    category: 'Pulse',
    seasons: ['Rabi'],
    sowingMonths: ['October', 'November'],
    temperature: { min: 10, max: 28 },
    waterRequirement: 'Drought-Tolerant',
    lowWaterSuitable: true,
    suitableStates: [
      'Madhya Pradesh', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh', 'Karnataka',
      'Andhra Pradesh', 'Telangana', 'Gujarat'
    ],
    weatherSensitivity: 'Thrives in cool dry winters; highly sensitive to excess humidity, frost, and heavy rain.',
    productionConsiderations: [
      'Excellent Rabi pulse for residual soil moisture in rainfed areas.',
      'Perform nipping (top plucking) 35-40 days after sowing to boost branching.',
      'Avoid heavy irrigation which induces vegetative overgrowth.'
    ]
  },
  {
    id: 'mustard',
    name: 'Mustard / Rapeseed',
    category: 'Oilseed',
    seasons: ['Rabi'],
    sowingMonths: ['October', 'November'],
    temperature: { min: 10, max: 25 },
    waterRequirement: 'Low',
    lowWaterSuitable: true,
    suitableStates: [
      'Rajasthan', 'Madhya Pradesh', 'Haryana', 'Uttar Pradesh', 'West Bengal',
      'Gujarat', 'Assam', 'Punjab'
    ],
    weatherSensitivity: 'Thrives in dry, cool Rabi winter; vulnerable to aphid infestation during cloudy warm spells.',
    productionConsiderations: [
      'Requires 2-3 light irrigations at flowering and pod filling.',
      'Monitor for aphids during mild cloudy winter weather.',
      'Sow early in October to reduce pest risk.'
    ]
  },
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    category: 'Cash Crop',
    seasons: ['Kharif', 'Rabi'],
    sowingMonths: ['January', 'February', 'March', 'October'],
    temperature: { min: 20, max: 38 },
    waterRequirement: 'High',
    lowWaterSuitable: false,
    suitableStates: [
      'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Andhra Pradesh',
      'Telangana', 'Gujarat', 'Bihar', 'Punjab', 'Haryana'
    ],
    weatherSensitivity: 'Long-duration crop (10-12 months); requires high warmth and steady water during vegetative phase.',
    productionConsiderations: [
      'Adopt drip irrigation or trash mulching for water conservation.',
      'Earth up plants to prevent lodging during monsoon wind gusts.',
      'Ensure proper drainage during heavy rain spells.'
    ]
  },
  {
    id: 'pearl_millet',
    name: 'Pearl Millet (Bajra)',
    category: 'Cereal',
    seasons: ['Kharif', 'Zaid'],
    sowingMonths: ['June', 'July', 'March'],
    temperature: { min: 22, max: 40 },
    waterRequirement: 'Drought-Tolerant',
    lowWaterSuitable: true,
    suitableStates: [
      'Rajasthan', 'Uttar Pradesh', 'Gujarat', 'Haryana', 'Maharashtra',
      'Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh'
    ],
    weatherSensitivity: 'Remarkably drought-tolerant and heat-hardy; thrives in light sandy soils.',
    productionConsiderations: [
      'Ideal crop for dryland drought-prone regions.',
      'Requires minimal irrigation and withstands heat waves.',
      'Prevents soil erosion in arid conditions.'
    ]
  },
  {
    id: 'sorghum',
    name: 'Sorghum (Jowar)',
    category: 'Cereal',
    seasons: ['Kharif', 'Rabi'],
    sowingMonths: ['June', 'July', 'September', 'October'],
    temperature: { min: 20, max: 38 },
    waterRequirement: 'Drought-Tolerant',
    lowWaterSuitable: true,
    suitableStates: [
      'Maharashtra', 'Karnataka', 'Rajasthan', 'Tamil Nadu', 'Andhra Pradesh',
      'Telangana', 'Madhya Pradesh', 'Gujarat'
    ],
    weatherSensitivity: 'Strong deep-root system withstands water stress; sensitive to shoot fly in early stage.',
    productionConsiderations: [
      'Highly dependable food and fodder crop for dry regions.',
      'Rabi Jowar yields superior grain quality under dry winter conditions.',
      'Avoid sowing in flooded or waterlogged soils.'
    ]
  },
  {
    id: 'watermelon',
    name: 'Watermelon & Muskmelon',
    category: 'Vegetable',
    seasons: ['Zaid'],
    sowingMonths: ['February', 'March'],
    temperature: { min: 24, max: 38 },
    waterRequirement: 'Low',
    lowWaterSuitable: true,
    suitableStates: [
      'Uttar Pradesh', 'Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu',
      'Maharashtra', 'Punjab', 'Haryana', 'Gujarat'
    ],
    weatherSensitivity: 'Requires long warm sunny days and low atmospheric humidity for high sweetness.',
    productionConsiderations: [
      'Ideal short-duration Zaid summer crop for riverbed or sandy loam soils.',
      'Use light frequent irrigation; avoid wetting foliage.',
      'Stop watering 4-5 days before harvest to boost sweetness.'
    ]
  }
];
