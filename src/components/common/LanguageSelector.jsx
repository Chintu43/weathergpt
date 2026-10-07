import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../i18n/LanguageContext';
import './LanguageSelector.css';

export function LanguageSelector({ compact = false, className = '' }) {
  const { language, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`language-selector-container ${compact ? 'is-compact' : ''} ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`language-selector-btn ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <Globe size={15} className="lang-globe-icon" />
        <span className="lang-btn-label">{currentLangObj.nativeName}</span>
        <ChevronDown size={13} className={`lang-arrow ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="language-dropdown-menu">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                className={`language-option-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelect(lang.code)}
              >
                <div className="lang-option-text">
                  <span className="lang-native-name">{lang.nativeName}</span>
                  <span className="lang-en-name">{lang.label}</span>
                </div>
                {isSelected && <Check size={14} className="lang-check-icon" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
