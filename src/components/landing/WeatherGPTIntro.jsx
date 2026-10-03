import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: '🌧️',
    title: 'Weather Forecasts',
    description: 'Real-time weather conditions and forecasts for locations across India.'
  },
  {
    icon: '🌪️',
    title: 'Cyclone Monitoring',
    description: 'Track cyclone-related weather information and risk conditions.'
  },
  {
    icon: '🌊',
    title: 'Flood Awareness',
    description: 'Understand rainfall and flood-related weather conditions.'
  },
  {
    icon: '🌡️',
    title: 'Extreme Weather',
    description: 'Stay informed about extreme heat, heavy rain, strong winds and other severe weather conditions.'
  },
  {
    icon: '🇮🇳',
    title: 'India Weather Intelligence',
    description: 'Get weather information and insights across India.'
  },
  {
    icon: '🌾',
    title: 'FarmerGPT',
    description: 'Get weather-based farming guidance using location and weather conditions.'
  },
  {
    icon: '✈️',
    title: 'Travel Planner',
    description: 'Plan trips using destination weather and forecast conditions.'
  }
];

export function WeatherGPTIntro() {
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
        <span>Next-Gen Climate Intelligence</span>
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
        AI-Powered Weather Intelligence
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="landing-tagline"
      >
        <strong>Understand Weather. Detect Risk. Act in Time.</strong>
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="landing-description"
      >
        WeatherGPT brings real-time weather conditions, forecasts, extreme-weather information and weather-based intelligence together in one platform.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.6 }}
        className="landing-features-grid"
      >
        {FEATURES.map((item) => (
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
          <span>Weather Alerts & Updates</span>
        </div>
        <p className="landing-alerts-desc">
          Receive important weather alerts, updates and weather-condition information through email.
        </p>
      </motion.div>
    </motion.div>
  );
}
