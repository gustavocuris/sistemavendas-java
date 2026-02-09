# Sistema de Gerenciamento de Vendas - Pneus

Sistema completo de controle de vendas com análise de dados, comissões e gráficos interativos.

## 📋 Funcionalidades Implementadas

### ✅ Gestão de Vendas
- Criar, editar e deletar vendas
- Registro por mês/ano específico
- Suporte para 4 tipos de venda:
  - Pneu Novo
  - Pneu Recapado
  - Recapagem de Pneu
  - Serviço Borracharia
- Validações completas (data, telefone, valores)

### ✅ Tabelas Mensais
- Visualização de vendas por mês e ano
- Navegação entre meses/anos via calendário superior
- Campos: Data, Cliente, Telefone, Produto, Valor Unitário, Quantidade, Tipo
- Formatação brasileira (datas, moeda, telefone)

### ✅ Comissões
- Edição de percentuais por tipo de venda (Modal dedicada)
- Cálculo automático de comissões
- Resumo visual com totais por tipo
- Atualização em tempo real

### ✅ Calendário do Formulário (DatePicker)
- Customizado em português
- Sincronizado com mês/ano da tabela
- Ícone minimalista SVG (retângulo + linhas)
- Sem navegação extra (travado no mês da tabela)
- Modo claro e escuro com bom contraste

### ✅ Gráfico de Vendas Anuais
- Visualização em barras com Recharts
- 12 meses de dados
- Cores dinâmicas baseadas na cor temática selecionada
- HSL-based tone generation (12 variações por cor)
- Estatísticas: Total, Média, Quantidade de transações
- Refresh automático ao criar/editar/deletar vendas
- Tema claro e escuro com alta qualidade

### ✅ Sistema de Cores & Tema
- 6 presets de cores principais
- Toggle sol/lua para modo escuro
- Cor tema dinâmica com 12 tonalidades geradas
- Aplicado em: UI, gráfico, botões, inputs
- CSS variables para fácil customização

### ✅ Interface & UX
- Design moderno e limpo
- Tipografia melhorada:
  - Tamanhos variados por contexto
  - Pesos 600-900 para destaque
  - Line-heights otimizados
- Ícones SVG minimalistas e consistentes
- Responsivo em diferentes telas
- Modo escuro de alta qualidade

### ✅ Formatação Brasileira
- Datas: dd/mm/aaaa
- Moeda: R$ 1.234,56
- Telefone: (11) 99999-9999

## 🏗️ Estrutura do Projeto

```
sistemavendas-java/
├── backend/
│   ├── server.js (Express.js - porta 3001)
│   ├── package.json
│   ├── sales.json (banco de dados em arquivo)
│   └── node_modules/
├── frontend/
│   ├── src/
│   │   ├── App.jsx (componente principal)
│   │   ├── styles.css (estilos completos - 2540+ linhas)
│   │   ├── components/
│   │   │   ├── SaleForm.jsx (formulário com validações)
│   │   │   ├── SaleList.jsx (tabela de vendas)
│   │   │   ├── CommissionSummary.jsx (resumo e edição de comissões)
│   │   │   ├── DatePicker.jsx (calendário customizado)
│   │   │   └── ChartView.jsx (gráfico anual com Recharts)
│   │   ├── main.jsx
│   │   └── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── node_modules/
├── README.md (este arquivo)
└── .gitignore
```

## 🛠️ Tecnologias

**Backend:**
- Node.js
- Express.js
- JSON (persistência local)

**Frontend:**
- React 18
- Vite (build tool)
- Recharts (gráficos)
- CSS3 (estilos com dark mode)

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 16+ instalado
- npm (vem com Node.js)

### Instalação

1. **Extraia ou clone o projeto**

2. **Instale dependências do backend:**
```powershell
cd backend
npm install
```

3. **Instale dependências do frontend:**
```powershell
cd ../frontend
npm install
```

### Executar

**Terminal 1 - Backend (porta 3001):**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend (porta 5174):**
```powershell
cd frontend
npm run dev
```

Abra no navegador: **http://localhost:5174**

## 📊 Dados & Persistência

Os dados são salvos em `backend/sales.json` com ID sequencial global:

```json
{
  "nextId": 6,
  "2026-02": {
    "sales": [
      {
        "id": 5,
        "date": "2026-02-07",
        "client": "João Silva",
        "phone": "(11) 98765-4321",
        "product": "Pneu Aro 13",
        "unit_price": 155.55,
        "quantity": 10,
        "tire_type": "new",
        "total": 1555.50
      }
    ]
  },
  "2026-03": {
    "sales": []
  }
}
```

## 🎨 Cores & Tema

**Presets disponíveis:**
1. 🟢 Verde (padrão)
2. 🔵 Azul
3. 🟣 Roxo
4. 🌸 Rosa
5. 🟠 Laranja
6. 🔴 Vermelho

Cada cor gera automaticamente 12 tonalidades (HSL manipulation) para o gráfico anual.

## ⌨️ Features & Atalhos

- **Navegação:** Clique em "Fevereiro 2026" para selecionar mês/ano
- **Cor tema:** Clique nos botões coloridos na barra superior
- **Modo escuro:** Clique no ícone sol/lua
- **Gráfico:** Clique no ícone de gráfico (3 barras) no header
- **Editar:** Clique na linha da venda na tabela
- **Deletar:** Clique em "Remover" em cada venda
- **Comissões:** Clique em "Editar Comissões" para ajustar percentuais

## 📡 API Endpoints

Base URL: `http://localhost:3001/api`

**GET** `/sales?month=YYYY-MM` - Busca vendas de um mês
```
Response: { sales: [...], commissions: {...} }
```

**POST** `/sales` - Cria nova venda
```json
{
  "date": "2026-02-07",
  "client": "Nome Cliente",
  "phone": "(11) 99999-9999",
  "product": "Pneu Aro 13",
  "unit_price": 155.55,
  "quantity": 10,
  "tire_type": "new"
}
```

**PUT** `/sales/:id` - Atualiza venda
```json
{ ...mesma estrutura do POST }
```

**DELETE** `/sales/:id` - Deleta venda

**PUT** `/commissions/:tire_type` - Atualiza comissão
```json
{ "percentage": 10.5 }
```

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| "Cannot find module" | Rode `npm install` na pasta (backend ou frontend) |
| "EADDRINUSE" na porta 3001 | Altere a porta em `backend/server.js` |
| Dados não aparecem | Verifique se `backend/sales.json` existe |
| Estilos não carregam | Limpe cache do navegador (Ctrl+Shift+Del) |
| "No matching routes found" | Certifique-se que o backend está rodando |

## 📈 Próximas Melhorias

- [ ] Deploy em Render/Vercel/Railway
- [ ] Migração para banco de dados (MongoDB/PostgreSQL)
- [ ] Autenticação de usuários
- [ ] Relatórios em PDF
- [ ] Exportação (Excel, CSV)
- [ ] Backup automático de dados
- [ ] API mais robusta com tratamento de erros

## ✅ Checklist de Verificação

- [x] Criar, editar, deletar vendas
- [x] Tabelas por mês/ano
- [x] Comissões editáveis
- [x] Gráfico anual com Recharts
- [x] Calendário sincronizado
- [x] Modo escuro completo
- [x] Sistema de cores dinâmico
- [x] Formatação brasileira
- [x] Ícones minimalistas
- [x] Responsividade
- [x] Validações de entrada

## 👤 Informações do Projeto

- **Tipo:** SPA (Single Page Application)
- **Status:** ✅ Funcional e pronto para produção
- **Última atualização:** 07 de Fevereiro de 2026
- **Versão:** 1.0.0

---

**Projeto desenvolvido com React, Express e Recharts | Pronto para deploy**
