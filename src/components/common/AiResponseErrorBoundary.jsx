import React from 'react';

/**
 * AiResponseErrorBoundary
 *
 * A React class-based Error Boundary that catches runtime errors in AI
 * response rendering components. If an AI response renderer throws, this
 * boundary shows a safe fallback instead of crashing the entire application.
 *
 * Usage:
 *   <AiResponseErrorBoundary>
 *     {someAiResponseComponent}
 *   </AiResponseErrorBoundary>
 */
export class AiResponseErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown rendering error'
    };
  }

  componentDidCatch(error, info) {
    console.error('[AiResponseErrorBoundary] Caught rendering error:', error?.message);
    console.error('[AiResponseErrorBoundary] Component stack:', info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px 24px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            color: '#fca5a5',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          role="alert"
        >
          <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
            Unable to display the AI analysis. Please try again.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '7px 16px',
              background: 'rgba(239,68,68,0.18)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '6px',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
