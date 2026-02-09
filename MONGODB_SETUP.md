# Solução: Migrar para MongoDB Atlas

## Problemas Identificados ❌

1. **Login aceita qualquer senha** - O arquivo `auth.json` é perdido quando o app reinicia no Render
2. **Dados não aparecem na tabela** - O arquivo `sales.json` não persiste entre reinicializações

> **Motivo:** Render reseta o sistema de arquivos a cada deploy/restart. Você precisa de um banco de dados persistente.

---

## Solução: MongoDB Atlas (Gratuito) ✅

### Passo 1: Criar Conta no MongoDB Atlas
1. Acesse [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Clique em **"Sign Up"**
3. Preencha com:
   - Email
   - Password
   - Seu nome
   - Clique em **Create an Account**

### Passo 2: Criar um Cluster Grátis
1. Na dashboard, clique em **"Create"** (botão verde)
2. Escolha **Free** (M0 - grátis)
3. Selecione:
   - **Provider**: AWS
   - **Region**: Escolha a mais próxima (ex: `sa-east-1` para São Paulo)
4. Clique em **Create Cluster** (vai levar ~5 min)

### Passo 3: Configurar Acesso
1. Na esquerda, vá para **Security** → **Database Access**
2. Clique em **Add New Database User**
3. Preencha:
   - Username: `vendas`
   - Password: Gere uma senha forte, **COPIE-A**
   - Role: **Atlas Admin**
4. Clique em **Add User**

### Passo 4: Permitir Acesso de Qualquer IP
1. Em **Security** → **Network Access**
2. Clique em **Add IP Address**
3. Selecione **Allow access from anywhere** (0.0.0.0/0)
4. Clique em **Confirm**

### Passo 5: Obter String de Conexão
1. Volta para **Overview** → Clique em **Connect**
2. Selecione **Drivers**
3. Driver: **Node.js** | Version: **latest**
4. **COPIE** a connection string
   - Exemplo: `mongodb+srv://vendas:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`
   - Substitua `<password>` pela senha do passo 3

---

## Atualizar Backend Local

### Passo 1: Instalar Mongoose
```bash
cd backend
npm install mongoose
```

### Passo 2: Renomear arquivo antigo
```bash
# Mude o arquivo antigo para referência
mv index.js index-json.js

# Use o novo com MongoDB
mv index-mongo.js index.js
mv db.js db-json.js
mv db-mongo.js db.js
```

### Passo 3: Configurar .env
```env
MONGODB_URI=mongodb+srv://vendas:SUA_SENHA_AQUI@cluster.mongodb.net/vendas?retryWrites=true&w=majority
VITE_API_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
PORT=3001
GMAIL_USER=seu_email@gmail.com
GMAIL_PASSWORD=sua_senha_app
```

### Passo 4: Testar Localmente
```bash
npm start
```

Acesse `http://localhost:5173` e teste:
- Login: **usuário** = `Intercap Pneus`, **Senha** = `IPN2026@`
- Criar uma venda e recarregar a página - deve estar lá! ✅

---

## Deploy no Render

### Passo 1: Atualizar Render Environment Variables
1. Para no Render no painel do seu backend
2. Vá para **Environment**
3. Adicione a variável:
   ```
   MONGODB_URI=mongodb+srv://vendas:SUA_SENHA_AQUI@cluster.mongodb.net/vendas?retryWrites=true&w=majority
   ```
4. **Não deleta** as outras variáveis existentes

### Passo 2: Fazer Deploy
```bash
# No seu computador:
git add -A
git commit -m "feat: migrar para MongoDB Atlas"
git push
```

Render vai redeploy automaticamente em ~5 min.

### Passo 3: Verificar Deploy
- Acesse seu app no Render
- Vá em **Logs** para ver se conectou ao MongoDB
- Procure por: `MongoDB conectado com sucesso`

---

## Resultado Final

✅ **Login protegido** - Só entra com a senha correta  
✅ **Dados persistem** - Mesmo depois de reiniciar o app  
✅ **Funciona em produção** - No Render com MongoDB Atlas

---

## Troubleshooting

### "mongodb connection error"
- Verifique se a senha está correta (sem caracteres especiais escapados)
- Confirme se o IP foi liberado (Network Access)
- Verifique se o cluster está rodando (clique em "Resume" se parado)

### "Ainda aceita qualquer senha no Render"
- Nas Settings do Render, clique em **Redeploy** (não rebuild)
- Aguarde ~2 min

### "Dados ainda não aparecem"
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Relogar no sistema
- Criar uma nova venda

---

## Opcional: Migrar Dados Antigos

Se seus arquivos `sales.json` e `auth.json` ainda existem localmente, você pode migrá-los:

```javascript
// Criar um script migration.js para copiar dados antigos
import fs from 'fs';
import { Sale } from './db-mongo.js';

async function migrate() {
  const oldData = JSON.parse(fs.readFileSync('data/sales.json'));
  
  for (const [month, monthData] of Object.entries(oldData.months || {})) {
    for (const sale of monthData.sales || []) {
      await Sale.create({
        ...sale,
        month
      });
    }
  }
  
  console.log('Migração concluída!');
}

migrate();
```

Depois rodar:
```bash
node migration.js
```
