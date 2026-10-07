import React, { useMemo, useState } from 'react';
import { Sprout, Send, AlertCircle, CheckCircle2, AlertTriangle, HelpCircle, ListChecks } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { INDIA_STATES_DISTRICTS } from '../data/indiaGeoData';
import { weatherService } from '../services/weatherService';
import { useTranslation } from '../i18n/LanguageContext';
import { getLocalizedLocationLabel } from '../utils/locationLocalization';
import { AiResponseErrorBoundary } from '../components/common/AiResponseErrorBoundary';

export function FarmerGptPage() {
  const statesList = useMemo(() => Object.keys(INDIA_STATES_DISTRICTS).sort(), []);
  const { t, language, translateWeatherCondition } = useTranslation();
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [farmerQuery, setFarmerQuery] = useState('');
  const [farmerAdvisory, setFarmerAdvisory] = useState(null);
  const [farmerLoading, setFarmerLoading] = useState(false);
  const [farmerError, setFarmerError] = useState('');

  const districtsList = selectedState
    ? INDIA_STATES_DISTRICTS[selectedState]?.districts || []
    : [];

  const handleStateChange = (e) => {
    const st = e.target.value;
    setSelectedState(st);
    setSelectedDistrict('');
    setFarmerAdvisory(null);
    setFarmerError('');
  };

  const handleGetFarmerHelp = async (queryText) => {
    const q = (queryText || farmerQuery).trim();
    if (!selectedState || !selectedDistrict) {
      setFarmerError(t('farmer.error', 'Please select a state and district first.'));
      return;
    }
    if (!q) {
      setFarmerError(t('farmer.error', 'Please enter what you want help with.'));
      return;
    }

    setFarmerLoading(true);
    setFarmerError('');
    const adv = await weatherService.getFarmerAdvisory(selectedState, selectedDistrict, q, language);
    setFarmerLoading(false);
    if (!adv.success) {
      setFarmerAdvisory(null);
      setFarmerError(adv.error || t('farmer.error'));
      return;
    }
    setFarmerAdvisory(adv);
  };

  return (
    <div className="destination-page farmergpt-page">
      <BackButton />
      <header className="dash-section-header">
        <div className="dash-farmers-title-wrap">
          <Sprout size={22} color="#ffffff" />
          <div>
            <h2 className="dash-page-heading">{t('farmer.title')}</h2>
            <p className="dash-section-sub">{t('farmer.subtitle')}</p>
          </div>
        </div>
      </header>

      <div className="farmers-control-panel">
        <div className="farmers-select-row">
          <div className="farmers-select-group">
            <label className="farmers-label">1. {t('farmer.stateLabel')}</label>
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="farmers-dropdown"
            >
              <option value="">{t('farmer.stateLabel')}</option>
              {statesList.map((st) => (
                <option key={st} value={st}>
                  {getLocalizedLocationLabel(st, language)}
                </option>
              ))}
            </select>
          </div>

          <div className="farmers-select-group">
            <label className="farmers-label">2. {t('farmer.districtLabel')}</label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="farmers-dropdown"
              disabled={!selectedState}
            >
              <option value="">{t('farmer.districtLabel')}</option>
              {districtsList.map((dist) => (
                <option key={dist} value={dist}>
                  {getLocalizedLocationLabel(dist, language)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedState && selectedDistrict && (
          <>
            <p className="farmers-question-prompt">{t('farmer.quickHelpHeading')}</p>
            <div className="farmers-quick-chips">
              {[
                { canonical: 'Can I sow cotton now?',                    labelKey: 'farmer.quickQ1' },
                { canonical: 'When should I sow rice?',                  labelKey: 'farmer.quickQ2' },
                { canonical: 'Should I irrigate my cotton field today?', labelKey: 'farmer.quickQ3' },
                { canonical: 'Can I spray pesticide tomorrow?',          labelKey: 'farmer.quickQ4' },
                { canonical: 'Which crop is suitable for this season?',  labelKey: 'farmer.quickQ5' },
                { canonical: 'What crops can I grow in Srikakulam?',     labelKey: 'farmer.quickQ6' },
                { canonical: 'Can I sow groundnut now?',                 labelKey: 'farmer.quickQ7' }
              ].map(({ canonical, labelKey }) => (
                <button
                  key={canonical}
                  type="button"
                  className="farmers-chip-btn"
                  onClick={() => {
                    setFarmerQuery(t(labelKey));
                    handleGetFarmerHelp(canonical);
                  }}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>

            <form
              className="farmers-question-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleGetFarmerHelp(farmerQuery);
              }}
            >
              <input
                type="text"
                className="farmers-question-input"
                placeholder={t('farmer.questionPlaceholder')}
                value={farmerQuery}
                onChange={(e) => setFarmerQuery(e.target.value)}
              />
              <button type="submit" className="farmers-submit-btn" disabled={farmerLoading}>
                {farmerLoading ? (
                  <span>{t('farmer.loading')}</span>
                ) : (
                  <>
                    <span>{t('farmer.submitBtn')}</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {farmerError && (
          <div className="dash-error-box">
            <AlertCircle size={18} color="#f87171" />
            <p>{farmerError}</p>
          </div>
        )}

        {farmerAdvisory && (
          <AiResponseErrorBoundary>
          <div className="farmers-advisory-result">
            <h3 className="farmers-result-title">{t('farmer.title')} {t('farmer.directAnswer')}</h3>
            <p className="farmers-result-meta">
              Location: {farmerAdvisory.locationLabel || `${getLocalizedLocationLabel(farmerAdvisory.district, language)}, ${getLocalizedLocationLabel(farmerAdvisory.state, language)}`}
            </p>

            <div className="farmers-conditions-tagline">
              <div>
                Current weather: {farmerAdvisory.current?.temperature}, {translateWeatherCondition(farmerAdvisory.current?.condition)}
              </div>
              <div>
                Rain: {farmerAdvisory.current.rain} • Humidity: {farmerAdvisory.current.humidity} • Wind:{' '}
                {farmerAdvisory.current.wind}
              </div>
              {(farmerAdvisory.forecast?.todayRain || farmerAdvisory.forecast?.rainChance) && (
                <div>
                  Forecast:{' '}
                  {farmerAdvisory.forecast.todayRain
                    ? `Expected rain today ${farmerAdvisory.forecast.todayRain}`
                    : ''}
                  {farmerAdvisory.forecast.rainChance
                    ? ` • Rain chance ${farmerAdvisory.forecast.rainChance}`
                    : ''}
                </div>
              )}
            </div>

            {farmerAdvisory.question && (
              <p className="farmers-result-guidance" style={{ fontStyle: 'italic', marginBottom: '16px' }}>
                Question: "{farmerAdvisory.question}"
              </p>
            )}

            {/* Direct Answer Section */}
            {farmerAdvisory.advice?.directAnswer && (
              <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.04)', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> {t('farmer.directAnswer')}
                </h4>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{farmerAdvisory.advice.directAnswer}</p>
              </div>
            )}

            {/* Weather Assessment */}
            {farmerAdvisory.advice?.weatherAssessment && (
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#cbd5e1' }}>{t('farmer.weatherAssessment')}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>{farmerAdvisory.advice.weatherAssessment}</p>
              </div>
            )}

            {/* Sowing / Timing Assessment */}
            {farmerAdvisory.advice?.timingAssessment && (
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#cbd5e1' }}>{t('farmer.timing')}</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>{farmerAdvisory.advice.timingAssessment}</p>
              </div>
            )}

            {/* Risks */}
            {farmerAdvisory.advice?.risks && farmerAdvisory.advice.risks.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} /> {t('farmer.risks')}
                </h4>
                <ul className="farmers-advice-list" style={{ margin: 0 }}>
                  {farmerAdvisory.advice.risks.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Practical Steps */}
            {farmerAdvisory.advice?.practicalSteps && farmerAdvisory.advice.practicalSteps.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ListChecks size={15} /> {t('farmer.practicalSteps')}
                </h4>
                <ul className="farmers-advice-list" style={{ margin: 0 }}>
                  {farmerAdvisory.advice.practicalSteps.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* What I Need to Know / Missing Information */}
            {farmerAdvisory.advice?.missingInformation && farmerAdvisory.advice.missingInformation.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HelpCircle size={15} /> {t('farmer.missingInfo')}
                </h4>
                <ul className="farmers-advice-list" style={{ margin: 0 }}>
                  {farmerAdvisory.advice.missingInformation.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Crop Selection Section (ONLY shown if user asked a crop selection question) */}
            {farmerAdvisory.advice?.cropCandidates && farmerAdvisory.advice.cropCandidates.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#a78bfa' }}>{t('farmer.cropCandidates')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {farmerAdvisory.advice.cropCandidates.map((c, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>
                        <span>{c.name}</span>
                        <span style={{ color: '#34d399' }}>{c.suitability}</span>
                      </div>
                      {c.reason && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>{c.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="farmers-unavailable-note" style={{ marginTop: '16px' }}>{farmerAdvisory.unavailableNote}</p>
            <div className="farmers-result-footer">
              <span>{t('common.source')}: {farmerAdvisory.source}</span>
              <span className="farmers-source-txt">{t('common.updated')}: {farmerAdvisory.updated}</span>
            </div>
          </div>
          </AiResponseErrorBoundary>
        )}
      </div>
    </div>
  );
}
