import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDataDir = path.join(__dirname, 'data');
const authFilePath = path.join(authDataDir, 'auth.json');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Criar diretório se não existir
if (!fs.existsSync(authDataDir)) {
  fs.mkdirSync(authDataDir, { recursive: true });
}

// Reset para senha correta
const authData = {
  username: 'Intercap Pneus',
  passwordHash: hashPassword('IPN2026@'),
  resetToken: null,
  resetTokenExpires: null
};

fs.writeFileSync(authFilePath, JSON.stringify(authData, null, 2));
console.log('✅ auth.json resetado com sucesso!');
console.log('Usuário: Intercap Pneus');
console.log('Senha: IPN2026@');
console.log('Hash:', authData.passwordHash);
