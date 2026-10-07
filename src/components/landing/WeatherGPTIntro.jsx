import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

export function WeatherGPTIntro() {
  const { t } = useTranslation();

  const features = [
    {
      icon: '🌧️',
      title: t('landing.forecastTitle', 'Weather Forecasts'),
      description: t('landing.forecastDesc', 'Real-time weather conditions and forecasts for locations across India.')
    },
    {
      icon: '🌪️',
      title: t('landing.cycloneTitle', 'Cyclone Monitoring'),
      description: t('landing.cycloneDesc', 'Track cyclone-related weather information and risk conditions.')
    },
    {
      icon: '🌊',
      title: t('nav.map', 'Weather Map'),
      description: t('map.subtitle', 'Real-time meteorological layers and atmospheric telemetry.')
    },
    {
      icon: '🌡️',
      title: t('landing.alertsTitle', 'Weather Alerts & Updates'),
      description: t('landing.alertsDesc', 'Instant advisories and danger warnings for heavy rainfall and storms.')
    },
    {
      icon: '🌾',
      title: t('nav.farmer', 'FarmerGPT'),
      description: t('farmer.subtitle', 'AI-powered precision agricultural intelligence for Indian farmers.')
    },
    {
      icon: '✈️',
      title: t('nav.travel', 'Travel Planner'),
      description: t('travel.subtitle', '16-day atmospheric travel telemetry and destination risk analysis.')
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="landing-intro"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="landing-badge"
      >
        <Sparkles size={14} color="#38bdf8" />
        <span>{t('landing.badge', 'AI-Powered Weather Intelligence')}</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="landing-title"
      >
        WeatherGPT
      </motion.h1>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="landing-subtitle"
      >
        {t('landing.heading', 'Understand Weather. Detect Risk. Act in Time.')}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="landing-tagline"
      >
        <strong>{t('landing.subheading', 'Real-time atmospheric telemetry, cyclone tracking, and AI-driven agricultural & travel warnings across India.')}</strong>
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="landing-features-grid"
      >
        {features.map((item) => (
          <div key={item.title} className="landing-feature-card">
            <div className="landing-feature-header">
              <span className="landing-feature-icon">{item.icon}</span>
              <strong>{item.title}</strong>
            </div>
            <p className="landing-feature-desc">{item.description}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.6 }}
        className="landing-alerts-banner"
      >
        <div className="landing-alerts-title">
          <span className="landing-feature-icon">📧</span>
          <span>{t('landing.alertsTitle', 'Weather Alerts & Updates')}</span>
        </div>
        <p className="landing-alerts-desc">
          {t('landing.alertsDesc', 'Receive important weather alerts, updates and weather-condition information.')}
        </p>
      </motion.div>
    </motion.div>
  );
}
