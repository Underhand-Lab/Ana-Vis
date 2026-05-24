import React from 'react';
import { Div } from "@shared/bridges/UIBridge";

interface Props {
  children: React.ReactNode;
  title: string;
}

interface State {
  hasError: boolean;
}

/**
 * 개별 분석 모듈의 런타임 에러를 격리하기 위한 Error Boundary
 */
class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(`Error in module [${this.props.title}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%', 
          padding: '20px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
        }}>
          <span style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</span>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>오류 발생</span>
          <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>{this.props.title} 모듈에서 문제가 발생했습니다.</span>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: '12px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            다시 시도
          </button>
        </Div>
      );
    }
    return this.props.children;
  }
}

export default ModuleErrorBoundary;