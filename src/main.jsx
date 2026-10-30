import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically forward all relative /api/* requests to microservice daemon at 127.0.0.1:48899
const originalFetch = window.fetch;
window.fetch = function(input, init) {
  if (typeof input === 'string' && input.startsWith('/api')) {
    input = `http://127.0.0.1:48899${input}`;
  } else if (input instanceof Request && input.url && input.url.startsWith('/api')) {
    input = new Request(`http://127.0.0.1:48899${input.url}`, input);
  }
  return originalFetch.call(this, input, init);
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '30px',
          backgroundColor: '#0c101c',
          color: '#f87171',
          height: '100vh',
          width: '100vw',
          overflow: 'auto',
          fontFamily: 'monospace',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ color: '#ef4444', fontSize: '20px', marginBottom: '16px' }}>
            ⚠️ Lỗi Hiển Thị Giao Diện (React Error)
          </h1>
          <div style={{
            backgroundColor: '#161e2e',
            padding: '16px',
            borderRadius: '8px',
            color: '#e2e8f0',
            marginBottom: '16px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            <b>Lỗi:</b> {this.state.error?.toString()}
          </div>
          <pre style={{
            backgroundColor: '#0a0d15',
            padding: '16px',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '12px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.errorInfo?.componentStack || this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              backgroundColor: '#0284c7',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Tải lại giao diện
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
