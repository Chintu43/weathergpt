/**
 * Localized Display Name Dictionary for Indian States, UTs, Districts, and Major Destinations.
 * Ensures APIs receive canonical English names (e.g., "Telangana", "Hyderabad", "Manali")
 * while the UI renders localized labels (e.g., "తెలంగాణ", "హైదరాబాద్", "మనాలి").
 */

const LOCALIZED_NAMES = {
  // States & UTs
  'Andhra Pradesh': { te: 'ఆంధ్రప్రదేశ్', hi: 'आंध्र प्रदेश' },
  'Arunachal Pradesh': { te: 'అరుణాచల్ ప్రదేశ్', hi: 'अरुणाचल प्रदेश' },
  'Assam': { te: 'అస్సాం', hi: 'असम' },
  'Bihar': { te: 'బీహార్', hi: 'बिहार' },
  'Chhattisgarh': { te: 'ఛత్తీస్‌గఢ్', hi: 'छत्तीसगढ़' },
  'Goa': { te: 'గోవా', hi: 'गोवा' },
  'Gujarat': { te: 'గుజరాత్', hi: 'गुजरात' },
  'Haryana': { te: 'హర్యానా', hi: 'हरियाणा' },
  'Himachal Pradesh': { te: 'హిమాచల్ ప్రదేశ్', hi: 'हिमाचल प्रदेश' },
  'Jharkhand': { te: 'జార్ఖండ్', hi: 'झारखंड' },
  'Karnataka': { te: 'కర్ణాటక', hi: 'कर्नाटक' },
  'Kerala': { te: 'కేరళ', hi: 'केरल' },
  'Madhya Pradesh': { te: 'మధ్యప్రదేశ్', hi: 'मध्य प्रदेश' },
  'Maharashtra': { te: 'మహారాష్ట్ర', hi: 'महाराष्ट्र' },
  'Manipur': { te: 'మణిపూర్', hi: 'मणिपुर' },
  'Meghalaya': { te: 'మేఘాలయ', hi: 'मेघालय' },
  'Mizoram': { te: 'మిజోరం', hi: 'मिजोरम' },
  'Nagaland': { te: 'నాగాలాండ్', hi: 'नागालैंड' },
  'Odisha': { te: 'ఒడిషా', hi: 'ओडिशा' },
  'Punjab': { te: 'పంజాబ్', hi: 'पंजाब' },
  'Rajasthan': { te: 'రాజస్థాన్', hi: 'राजस्थान' },
  'Sikkim': { te: 'సిక్కిం', hi: 'सिक्किम' },
  'Tamil Nadu': { te: 'తమిళనాడు', hi: 'तमिलनाडु' },
  'Telangana': { te: 'తెలంగాణ', hi: 'तेलंगाना' },
  'Tripura': { te: 'త్రిపుర', hi: 'त्रिपुरा' },
  'Uttar Pradesh': { te: 'ఉత్తర ప్రదేశ్', hi: 'उत्तर प्रदेश' },
  'Uttarakhand': { te: 'ఉత్తరాఖండ్', hi: 'उत्तराखंड' },
  'West Bengal': { te: 'పశ్చిమ బెంగాల్', hi: 'पश्चिम बंगाल' },
  'Delhi': { te: 'ఢిల్లీ', hi: 'दिल्ली' },
  'Jammu & Kashmir': { te: 'జమ్మూ & కాశ్మీర్', hi: 'जम्मू और कश्मीर' },
  'Ladakh': { te: 'లడఖ్', hi: 'लद्दाख' },

  // Major Cities / Districts / Destinations
  'Hyderabad': { te: 'హైదరాబాద్', hi: 'हैदराबाद' },
  'Guntur': { te: 'గుంటూరు', hi: 'गुंटूर' },
  'Vijayawada': { te: 'విజయవాడ', hi: 'विजयवाड़ा' },
  'Visakhapatnam': { te: 'విశాఖపట్నం', hi: 'विशाखापटनम' },
  'Tirupati': { te: 'తిరుపతి', hi: 'तिरुपति' },
  'Kurnool': { te: 'కర్నూలు', hi: 'कर्नूल' },
  'Warangal': { te: 'వరంగల్', hi: 'वरंगल' },
  'Nizamabad': { te: 'నిజామాబాద్', hi: 'निजामाबाद' },
  'Karimnagar': { te: 'కరీంనగర్', hi: 'करीमनगर' },
  'Khammam': { te: 'ఖమ్మం', hi: 'खम्मम' },
  'Nalgonda': { te: 'నల్గొండ', hi: 'नलगोंडा' },

  'Mumbai': { te: 'ముంబై', hi: 'मुंबई' },
  'Pune': { te: 'పుణే', hi: 'पुणे' },
  'Bengaluru': { te: 'బెంగళూరు', hi: 'बेंगलुरु' },
  'Chennai': { te: 'చెన్నై', hi: 'चेन्नई' },
  'Kolkata': { te: 'కోల్‌కతా', hi: 'कोलकाता' },
  'Manali': { te: 'మనాలి', hi: 'मनाली' },
  'Manali, Himachal Pradesh, India': { te: 'మనాలి, హిమాచల్ ప్రదేశ్, భారతదేశం', hi: 'मनाली, हिमाचल प्रदेश, भारत' },
  'Goa, India': { te: 'గోవా, భారతదేశం', hi: 'गोवा, भारत' },
  'Jaipur': { te: 'జైపూర్', hi: 'जयपुर' },
  'Jaipur, Rajasthan, India': { te: 'జైపూర్, రాజస్థాన్, భారతదేశం', hi: 'जयपुर, राजस्थान, भारत' },
  'Ooty': { te: 'ఊటీ', hi: 'ऊटी' },
  'Ooty, Tamil Nadu, India': { te: 'ఊటీ, తమిళనాడు, భారతదేశం', hi: 'ऊटी, तमिलनाडु, भारत' },
  'Varanasi': { te: 'వారణాసి', hi: 'वाराणसी' },
  'Varanasi, Uttar Pradesh, India': { te: 'వారణాసి, ఉత్తర ప్రదేశ్, భారతదేశం', hi: 'वाराणसी, उत्तर प्रदेश, भारत' },
  'Shimla': { te: 'షిమ్లా', hi: 'शिमला' },
  'Darjeeling': { te: 'డార్జిలింగ్', hi: 'दार्जिलिंग' },
  'Kochi': { te: 'కొచ్చి', hi: 'कोच्चि' },
  'Munnar': { te: 'మున్నార్', hi: 'मुन्नार' },
  'Srinagar': { te: 'శ్రీనగర్', hi: 'श्रीनगर' }
};

export function getLocalizedLocationLabel(name, lang = 'en') {
  if (!name || typeof name !== 'string') return name;
  if (lang === 'en') return name;

  const trimmed = name.trim();
  if (LOCALIZED_NAMES[trimmed] && LOCALIZED_NAMES[trimmed][lang]) {
    return LOCALIZED_NAMES[trimmed][lang];
  }

  return name;
}
