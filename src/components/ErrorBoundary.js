import React from 'react';
import { t } from '../i18n';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Game crashed:', error, info?.componentStack);
  }

  handleRestart = () => {
    this.setState(prev => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#120e29', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Orbitron, Arial, sans-serif', color: '#fff',
          textAlign: 'center', padding: 40,
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>!</div>
          <h2 style={{ fontSize: 20, color: '#cc66ff', marginBottom: 12 }}>
            {t('error.title')}
          </h2>
          <p style={{ fontSize: 13, color: '#aaaacc', lineHeight: 1.6, marginBottom: 30 }}>
            {t('error.desc')}
          </p>
          <button
            onClick={this.handleRestart}
            style={{
              padding: '14px 40px', fontSize: 16,
              fontFamily: 'Orbitron, Arial, sans-serif',
              background: 'linear-gradient(135deg, #9944ff, #6622cc)',
              color: '#fff', border: 'none', borderRadius: 12,
              cursor: 'pointer', boxShadow: '0 0 20px rgba(153,68,255,0.4)',
            }}
          >
            {t('error.restart')}
          </button>
        </div>
      );
    }
    return React.Children.map(this.props.children, child =>
      React.cloneElement(child, { key: this.state.resetKey })
    );
  }
}

export default ErrorBoundary;
