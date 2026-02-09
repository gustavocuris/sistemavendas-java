# SOLUÇÃO RÁPIDA - Seus 2 Problemas

## 📋 O que está acontecendo?

| Problema | Causa | Solução |
|----------|-------|--------|
| ❌ Login aceita qualquer senha | `auth.json` é apagado quando app reinicia no Render | Usar **MongoDB** em vez de arquivos |
| ❌ Dados não aparecem na tabela | `sales.json` é apagado quando app reinicia no Render | Usar **MongoDB** para persistência |

---

## ⚡ Solução em 5 Passos

### 1️⃣ MongoDB Atlas (Grátis)
Acesse: https://www.mongodb.com/cloud/atlas
- Sign Up com seu email
- Create Cluster (plano Free M0)
- Escolher region: **sa-east-1** (São Paulo) ou perto de você
- Database User: `vendas` / senha forte
- Network: Allow **0.0.0.0/0**
- **COPIAR** a connection string `mongodb+srv://vendas:SENHA@...`

### 2️⃣ Atualizar .env Local
Abre em `backend/.env` e adiciona:
```env
MONGODB_URI=mongodb+srv://vendas:SUA_SENHA_AQUI@cluster.mongodb.net/vendas?retryWrites=true&w=majority
```

### 3️⃣ Instalar Mongoose
```bash
cd backend
npm install mongoose
```

### 4️⃣ Usar novo backend com MongoDB
```bash
# Backup dos arquivos antigos
mv index.js index-json.js
mv db.js db-json.js

# Usar os novos arquivos
mv index-mongo.js index.js
mv db-mongo.js db.js
```

### 5️⃣ Testar Localmente
```bash
npm start
```
Abra http://localhost:5173:
- Login: `Intercap Pneus` / `IPN2026@` ✅
- Criar uma venda
- Recarregar página - deve estar lá! ✅

---

## 🚀 Fazer Deploy no Render

### No Painel do Render:
1. Vá para seu **Backend service**
2. **Environment** → Adiciona nova variável:
   ```
   MONGODB_URI=mongodb+srv://vendas:SUA_SENHA_AQUI@cluster.mongodb.net/vendas?retryWrites=true&w=majority
   ```
3. Não deleta as outras variáveis!

### No seu Computador:
```bash
git add -A
git commit -m "Migrar para MongoDB"
git push
```

Render vai fazer deploy automático (~5 min).

---

## ✅ Resultado Esperado

Após o deploy:
- ✅ Login só aceita `IPN2026@` (ou a senha que você mudar)
- ✅ Dados salvos permanecem mesmo após restart
- ✅ Múltiplos usuários conseguem ver os mesmos dados

---

## 🐛 Se der erro?

### "Connection refused"
→ Verifique se a senha do MongoDB está correta (compare com Atlas)

### "Ainda aceita qualquer senha"
→ No Render, em **Settings**, clique em **Redeploy** (espere 2 min)

### "Dados continuam sumindo"
→ Confirme que MONGODB_URI está nas variáveis de ambiente do Render

---

## 📚 Documentação Completa

Ver arquivo: **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** para instruções detalhadas
