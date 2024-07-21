const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: resolve(__dirname, '../.env') });

const firebaseConfig = {
  type: process.env.FIRE_TYPE,
  project_id: process.env.FIRE_PROJECT_ID,
  private_key_id: process.env.FIRE_PRIVATE_KEY_ID,
  private_key: process.env.FIRE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIRE_CLIENT_EMAIL,
  client_id: process.env.FIRE_CLIENT_ID,
  auth_uri: process.env.FIRE_AUTH_URI,
  token_uri: process.env.FIRE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIRE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIRE_CLIENT_CERT_URL
};

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { db, auth };
