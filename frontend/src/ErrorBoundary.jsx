import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
    this.lastResetKey = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Erro capturado:", error, info);
    this.setState({ info });
  }

  componentDidUpdate(prevProps) {
    // Resetar erro se a prop resetKey mudar (ex: login/logout, troca de tela principal)
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null, info: null });
    }
  }

  render() {
    if (this.state.hasError) {
      // Não renderiza nada em caso de erro
      return null;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;