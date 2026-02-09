# 🚀 Guia de Deploy - Sistema de Vendas

## ✅ Código Preparado para Deploy!

Seu sistema está configurado com variáveis de ambiente e pronto para ser publicado.

---

## 📋 Pré-requisitos

Antes de começar, instale a dependência do backend:

```bash
cd backend
npm install dotenv
```

---

## 🌐 Opção 1: Deploy Gratuito (Render + Vercel)

### **Passo 1: Deploy do Backend no Render**

1. Acesse [render.com](https://render.com) e crie uma conta (pode usar GitHub)

2. Clique em **"New +"** → **"Web Service"**

3. Conecte seu repositório do GitHub

4. Configure o serviço:
   ```
   Name: sistemavendas-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Root Directory: backend
   Plan: Free
   ```

5. Adicione as **Environment Variables**:
   ```
   PORT = 3001
   ALLOWED_ORIGINS = https://seu-frontend.vercel.app
   ```
   *(você vai atualizar isso depois)*

6. Clique em **"Create Web Service"**

7. **IMPORTANTE:** Copie a URL gerada!
   - Exemplo: `https://sistemavendas-backend.onrender.com`

---

### **Passo 2: Configurar URL do Backend no Frontend**

Edite o arquivo `frontend/.env.production`:

```env
VITE_API_URL=https://sistemavendas-backend.onrender.com
```

*(Troque pela URL que você copiou do Render)*

---

### **Passo 3: Deploy do Frontend na Vercel**

1. Acesse [vercel.com](https://vercel.com) e crie uma conta

2. Clique em **"Add New..."** → **"Project"**

3. Importe seu repositório do GitHub

4. Configure o projeto:
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```

5. Adicione **Environment Variable**:
   ```
   VITE_API_URL = https://sistemavendas-backend.onrender.com
   ```

6. Clique em **"Deploy"**

7. Aguarde o deploy finalizar e copie a URL do seu site!
   - Exemplo: `https://sistemavendas.vercel.app`

---

### **Passo 4: Atualizar CORS no Backend**

1. Volte ao **Render Dashboard**
2. Entre nas configurações do seu backend
3. Vá em **"Environment"**
4. Edite `ALLOWED_ORIGINS` e coloque a URL do Vercel:
   ```
   ALLOWED_ORIGINS=https://sistemavendas.vercel.app
   ```
5. Salve e aguarde o redeploy automático (≈ 2 minutos)

---

## 🎉 Pronto! Seu sistema está no ar!

Acesse: `https://sistemavendas.vercel.app`

---

## 📱 Testando o Sistema

1. Abra a URL do frontend
2. Adicione uma venda de teste
3. Verifique se está salvando (atualize a página)
4. Teste o fluxo: Anotações → Em Negociação → Finalização → Vendas
5. Experimente mudar o tema e ativar modo escuro

---

## ⚠️ Limitações do Plano Gratuito

**Render (Backend):**
- Servidor hiberna após 15 minutos de inatividade
- Primeira requisição pode levar 30-60 segundos
- 750 horas grátis/mês (suficiente para uso 24/7)

**Vercel (Frontend):**
- Sem limitações significativas para este projeto
- 100GB de bandwidth/mês

---

## 💾 Backup de Dados

⚠️ **IMPORTANTE:** No plano gratuito do Render, os dados em `backend/data/sales.json` podem ser perdidos!

**Soluções:**

1. **Opção 1 - Backup Manual:**
   - Acesse periodicamente: `https://seu-backend.onrender.com/api/database`
   - Salve o JSON retornado

2. **Opção 2 - Upgrade para Render Paid ($7/mês):**
   - Ative "Persistent Disk" nas configurações
   - Dados ficam permanentes

3. **Opção 3 - Usar MongoDB Atlas (Grátis):**
   - Requer mudança no código para usar banco real
   - 512MB grátis para sempre

---

## 🔧 Configurações Avançadas

### Domínio Personalizado

**Vercel (Frontend):**
1. Vá em Settings → Domains
2. Adicione seu domínio: `vendas.suaempresa.com.br`
3. Configure DNS conforme instruções

**Render (Backend):**
1. Crie subdomínio: `api.suaempresa.com.br`
2. Configure CNAME apontando para Render

### Monitoramento

**UptimeRobot (Grátis):**
- Monitora se o backend está online
- Faz ping a cada 5 minutos (evita hibernação)
- Envia alertas por email/SMS

Cadastre: https://uptimerobot.com
URL para monitorar: `https://seu-backend.onrender.com/api/months`

---

## 🆘 Problemas Comuns

### ❌ Frontend não conecta ao backend

**Solução:**
1. Verifique se a URL em `.env.production` está correta
2. Confira se `ALLOWED_ORIGINS` no Render inclui sua URL do Vercel
3. Aguarde 2 minutos após mudar CORS (redeploy automático)

### ❌ Primeira requisição muito lenta

**Normal no plano gratuito!** O servidor hiberna após 15min. Use UptimeRobot para resolver.

### ❌ Dados sumiram após redeploy

**Solução:**
- Configure "Persistent Disk" no Render (plano pago)
- OU migre para MongoDB Atlas (grátis)
- OU faça backups manuais regulares

### ❌ CORS Error no console

**Solução:**
1. Abra Render → Environment
2. Certifique-se que `ALLOWED_ORIGINS` tem a URL exata do Vercel
3. Não use barra "/" no final da URL
4. Aguarde redeploy

---

## 📚 Arquivos de Configuração Criados

```
✅ frontend/.env              → Desenvolvimento local
✅ frontend/.env.production   → Produção (Vercel)
✅ frontend/.env.example      → Exemplo para equipe
✅ frontend/.gitignore        → Protege arquivos sensíveis

✅ backend/.env               → Desenvolvimento local
✅ backend/.env.example       → Exemplo para equipe
✅ backend/.gitignore         → Protege dados e node_modules
```

---

## 🎯 Checklist Final

Antes de fazer push para produção:

- [x] Instalou `dotenv` no backend
- [ ] Atualizou `.env.production` com URL do Render
- [ ] Fez commit e push para GitHub
- [ ] Criou backend no Render
- [ ] Configurou variáveis de ambiente no Render
- [ ] Criou frontend na Vercel
- [ ] Configurou variável VITE_API_URL na Vercel
- [ ] Atualizou ALLOWED_ORIGINS no Render
- [ ] Testou o sistema em produção
- [ ] Configurou monitoramento (opcional)

---

## 💰 Custos

| Serviço | Plano | Custo |
|---------|-------|-------|
| Render Backend | Free | R$ 0 |
| Vercel Frontend | Free | R$ 0 |
| **Total** | | **R$ 0/mês** |

**Upgrade recomendado (opcional):**
- Render Starter ($7/mês) = Dados persistentes + Sem hibernação

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no Render/Vercel
2. Teste localmente primeiro (`npm start` / `npm run dev`)
3. Consulte documentação oficial:
   - https://render.com/docs
   - https://vercel.com/docs

---

**Status:** ✅ Sistema 100% configurado e pronto para deploy!

**Próximo passo:** Seguir o Passo 1 acima ☝️
