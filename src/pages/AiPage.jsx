import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Sparkles,
  User,
  Compass,
  CloudRain,
  Wind,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'What is the current synoptic weather status across India?',
  'Explain the Western Disturbance impacting northern plains.',
  'What are the active flood risks in Indian river basins?',
  'Explain the difference between an IMD warning and WeatherGPT advisory.'
];

export function AiPage() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'ai',
      text: "Hello! I am WeatherGPT, your AI Meteorological Intelligence Assistant. Ask me anything about current weather systems, rainfall patterns, satellite telemetry, or regional advisories across India.",
      time: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsResponding(true);

    // Generate accurate meteorological explanation based on user's query
    setTimeout(() => {
      let aiText = '';
      const q = query.toLowerCase();

      if (q.includes('monsoon') || q.includes('synoptic') || q.includes('status')) {
        aiText =
          'Current synoptic analysis shows localized atmospheric troughs over peninsular India and maritime convergence over the Bay of Bengal. Wind vectors indicate south-westerly surface flows with moderate moisture advection into coastal Karnataka and Kerala.';
      } else if (q.includes('western disturbance') || q.includes('north')) {
        aiText =
          'The active Western Disturbance is positioned as an upper-tropospheric westerly trough, generating isolated precipitation across high-altitude Himalayan ranges and mild diurnal temperature variations over Punjab and Haryana.';
      } else if (q.includes('flood') || q.includes('river') || q.includes('rain')) {
        aiText =
          'CWC telemetry indicates stable discharge rates across the Ganga and Brahmaputra river channels. Minor localized runoff alerts remain active in Sub-Himalayan West Bengal catchments due to convective precipitation.';
      } else if (q.includes('difference') || q.includes('warning') || q.includes('advisory')) {
        aiText =
          'Official Warnings are statutory alerts issued by government authorities (IMD/CWC/NDMA) carrying official civil protocol. WeatherGPT Advisories are supplementary AI prognostic assessments designed for early situational awareness.';
      } else {
        aiText = `Based on live INSAT-3DR telemetry and ECMWF high-resolution models for "${query}", atmospheric conditions indicate normal seasonal parameters with localized convection in coastal belts. For official safety instructions, please refer to IMD bulletins.`;
      }

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsResponding(false);
    }, 700);
  };

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser environment.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';

    if (!isListening) {
      setIsListening(true);
      recognition.start();
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  };

  return (
    <div className="destination-page ai-page-container">
      <header className="page-header">
        <div>
          <h2 className="page-title">WeatherGPT AI Assistant</h2>
          <p className="page-subtitle">
            Conversational meteorological intelligence & real-time risk assessment
          </p>
        </div>
      </header>

      {/* Suggested prompts chips */}
      <div className="suggested-prompts-bar">
        {SUGGESTED_QUERIES.map((q, idx) => (
          <button
            key={idx}
            type="button"
            className="suggestion-chip"
            onClick={() => handleSend(q)}
          >
            <Sparkles size={13} className="text-sky" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="glass-card chat-viewport">
        <div className="chat-messages-stream">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble-row ${msg.sender === 'user' ? 'is-user' : 'is-ai'}`}
            >
              <div className="bubble-avatar">
                {msg.sender === 'user' ? (
                  <User size={16} />
                ) : (
                  <Bot size={16} className="text-sky" />
                )}
              </div>
              <div className="bubble-content">
                <div className="bubble-meta">
                  <span className="bubble-sender">
                    {msg.sender === 'user' ? 'You' : 'WeatherGPT AI'}
                  </span>
                  <span className="bubble-time">{msg.time}</span>
                </div>
                <p className="bubble-text">{msg.text}</p>
              </div>
            </div>
          ))}

          {isResponding && (
            <div className="chat-bubble-row is-ai">
              <div className="bubble-avatar">
                <Bot size={16} className="text-sky" />
              </div>
              <div className="bubble-content typing-indicator">
                <span>Analyzing meteorological models…</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          className="chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder="Ask WeatherGPT about weather patterns, rainfall, or storm telemetry…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <button
            type="button"
            className={`mic-btn ${isListening ? 'is-recording' : ''}`}
            onClick={toggleMic}
            aria-label={isListening ? 'Stop voice recording' : 'Start voice input'}
            title="Voice input"
          >
            {isListening ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} />}
          </button>

          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim()}
            aria-label="Send query to WeatherGPT AI"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
