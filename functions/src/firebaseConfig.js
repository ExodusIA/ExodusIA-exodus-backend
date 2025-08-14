const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { resolve } = require('path');

// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: resolve(__dirname, '../../.env') });



// Construir as credenciais a partir das variáveis de ambiente
const firebaseConfig = {
  type: process.env.FIREBASE_TYPE || "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "exodus-c5202",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "1155b17a4506b9f35d6285ea99ef5e255a8f5127",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCbLf1oQGLw17Gc\nlYp5DhYgPruoWarDnGYjKoruC1Dgb9iVTo6qY2N6Uj/oa6LU19HHhgshcUm//412\nViFHZF5w1DkaXEjbj6k8bCmhCpgKYtBWsGzJFDF0o6ev/R5xbPHluv+JSO6kwWm2\nhKNQ7xh4TpyZPmcsM5zeuNBMtxsCbidlJ/Soh+0ExbZs54ZfMG3X9obYbTGR8+5c\nkKXJChbmFoU8eKFVhJ8nXKDwt/KDqLtVgGqIEKr60meMHqupa4pZXu/dEfEXIedr\nDHsnCDtwv7lSSbnnMPdAEY7E8MLAaN+fLpxRk5AGvM1cJSgV2YAEtF64E3jpP71B\nE+LIMTUpAgMBAAECggEAC3DewTFsugSvunOHXo53JiXJ5csanR+/o1xvGsbTIyuh\nLxI4JYAnZOzXJmEig7PCaoX2Sx8USLy5fB3fMpQdUbnr2Ibbnkh0ue41kYMmRi8W\nh4BWvOp+t51F7zfnvIVuPjmaaSTrPKgVOFjbcPZNJQ2SsR+vMUyVhmbfgKXIBCvn\nxzuwVSokqo1+JysYgnfj6w2ES9YYLJJw/fVSFf8AgSzGnGp76YUf0IHihFFbFPdo\ndricsPEYewEMbZs5Opc6OAvO7YaAJAcNiCPnV+0yJ+RtcBgFFAOsBBNa+J2SyJ12\nw5kulh3aXpc8JVJsxr+lsUAyUVOYEM/jtl1u9+3PcwKBgQDWOOcCdBb6sQD/btkf\nIbZy7fOYTuXKucS7VM4gQMuo1Otbjim3p7roIGf3CPVehDOPSrcZZWQ4pEqiQKzC\n9VmqXZkooXl8UBg2B8Wwj3WGPeihEr9+mtbs5mUpzeGjJoia0pv0AGcvFhvjvAUu\nuZ75fk/uqBgdy4/FcYW0Y9wdPwKBgQC5cV7TDyksf/bwjHwuaeFzekIe6uOZP3v3\ngGafPzrl1Q32o+jwwrR+4IG6FJ/38u2Rg25ehPUmnNg+uuAqE0fdY/pR8IYdmByx\nUNVZWiWxbGIOx+014imhh6+tQrA/NmXsEZWxtJ+rDAqLzN1KgrcZGJxbSI/8H9Ff\nMQsWEBXLlwKBgAihIi0nIAXZO4EOphBq+z6F91obU4ZnFVW2hNcnxQx4B0MY5vVO\n/Gh9ZbK92aSFDs6m49lSDEd71sXSdSMlXwdN3e2VE5++WjtS9NO387QEqmpSpwQi\nmKXSYiDc+knoM3iJI18g5QcwjM8Ps+W99Hl4bR/gBZitqoz5lbk+jI9hAoGBAJpU\n3cPtZCjivpLneBnwiG7gmtK8TXqmuPb8Z2u05cGNFLflJeHpSOom0hAZRiDGjiyC\nI4KKSLQ/6EAcqp6ZuT9pC1TSReuvQoHXcheQzLniJ6GBhctIU7lZAT3CuIeDMEPN\nRrXESvXBaa17a9es/dDnCIl31EzR9h+w4zcTX/A1AoGBAKn7OOpQ2EQeHELA2KBb\n4OU7FAnqm/C/l5PqCogBYy8vrIZX0+72Id/dZ5kSfKFNksdhbiBm6BYOG/1ZVQP1\n8Xv4mSAoQmzpbxycv0xDzjOWGI4zFpy+vPi3pEhTHR5jsMoMMbt+a5M0odEjgp2+\nPKQCVaEDzIDD/2UYb2Zc7+Zh\n-----END PRIVATE KEY-----\n",
  client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-t6bfk@exodus-c5202.iam.gserviceaccount.com",
  client_id: process.env.FIREBASE_CLIENT_ID || "108946198949506776804",
  auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
  token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-t6bfk%40exodus-c5202.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};


try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
    storageBucket: process.env.FIRE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
  });
  
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  throw error;
}

const db = admin.firestore();
const auth = admin.auth();
db.settings({ ignoreUndefinedProperties: true });


module.exports = { db, auth, admin };