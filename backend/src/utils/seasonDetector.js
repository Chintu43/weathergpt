/**
 * Dynamic Indian Agricultural Season Detection Utility
 * Determines Kharif, Rabi, or Zaid/Summer season based on current date & month.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function detectAgriculturalSeason(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const monthIndex = date.getMonth(); // 0 = Jan, 11 = Dec
  const monthName = MONTH_NAMES[monthIndex];

  let season = '';
  let seasonCode = '';
  let description = '';
  let sowingStatus = '';

  // Kharif: June to October (Monsoon crops)
  if (monthIndex >= 5 && monthIndex <= 9) {
    season = 'Kharif';
    seasonCode = 'KHARIF';
    description = 'Monsoon / Kharif cropping season';
    if (monthIndex === 5 || monthIndex === 6) {
      sowingStatus = 'Peak Sowing Period for Kharif crops';
    } else if (monthIndex === 7 || monthIndex === 8) {
      sowingStatus = 'Crop Growth & Vegetative Stage';
    } else {
      sowingStatus = 'Harvesting Stage for early Kharif crops';
    }
  }
  // Rabi: October to March (Winter / Post-Monsoon crops)
  else if (monthIndex >= 9 || monthIndex <= 2) {
    season = 'Rabi';
    seasonCode = 'RABI';
    description = 'Winter / Rabi cropping season';
    if (monthIndex === 9 || monthIndex === 10 || monthIndex === 11) {
      sowingStatus = 'Peak Sowing & Planting Period for Rabi crops';
    } else if (monthIndex === 0 || monthIndex === 1) {
      sowingStatus = 'Crop Growth & Grain Formation Stage';
    } else {
      sowingStatus = 'Harvesting Stage for Rabi crops';
    }
  }
  // Zaid / Summer: March to June (Summer crops)
  else {
    season = 'Zaid';
    seasonCode = 'ZAID';
    description = 'Summer / Zaid cropping season';
    sowingStatus = 'Sowing & Harvesting Period for short-duration Zaid crops';
  }

  return {
    month: monthName,
    monthIndex,
    season,
    seasonCode,
    description,
    sowingStatus,
    timestamp: date.toISOString()
  };
}
