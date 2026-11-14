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
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#0B0F17',
            color: '#e2e8f0',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          <div style={{ maxWidth: 480, width: '100%' }}>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
              CivicRewards — Unexpected Error
            </div>
            <div
              style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: 12,
                fontFamily: 'monospace',
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
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
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
