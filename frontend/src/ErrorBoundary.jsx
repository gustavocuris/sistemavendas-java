import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Erro capturado:", error, info);
    this.setState({ info });
  }

  componentDidUpdate() {
    // Se já houve erro, mas agora os filhos renderizam normalmente, limpa o erro
    if (this.state.hasError) {
      this.setState({ hasError: false, error: null, info: null });
    }
  }
  render() {
    if (this.state.hasError) {
      // Exibe a tela de erro só por 1 segundo, depois tenta renderizar de novo
      setTimeout(() => this.setState({ hasError: false, error: null, info: null }), 1000);
      return (
        <div style={{ padding: 24 }}>
          <h2>Erro de renderização detectado</h2>
          <pre>{String(this.state.error?.message)}</pre>
          <pre>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;