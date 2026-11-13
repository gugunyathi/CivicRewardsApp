import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CivicRewards ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#05070B',
            color: '#e2e8f0',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              CivicRewards — App Error
            </div>
            <div
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 4,
                padding: '12px 16px',
                fontSize: 12,
                lineHeight: 1.6,
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message}
            </div>
            <button
              style={{
                marginTop: 16,
                padding: '10px 20px',
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
