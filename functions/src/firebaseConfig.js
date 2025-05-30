const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { resolve } = require('path');


// Carregar variáveis de ambiente do arquivo .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const firebaseConfig = {
  type: "service_account",
  project_id: "exodus-c5202",
  private_key_id: "3f3d3bc4168f0cc890ee70121e5eb8f9e444c17d",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1UuLTVInaoNWh\nlnPeMQ6t6yoQqVIw6GMdxn7rG7oLVc71HMAMg2wJUVo+ufDL/FEY7BxgtxCIOMq7\nZ+REx8qqvYyhmpzhkSJAgL0yHTY6jQEiQSZqP5ff5b3iFftR/P5zz9R5T3kjJwjt\nr5Oxa//xKbGknrK7R9CeEHKxe8uWxbWFmlyWi+CaaShTylKU5n7Yhr8oNpQs8VKV\nEyQ0MW5/5JSUfRpuAPR2frFrTRaj88unwh8Vgy0sqZ88X11dHpFw6+W2+ptLh330\nzGDWt5OVz1Ug+JVZMYCxHIlIVxYDfzn0p0IRFcIW9W3fOJZvgnnUBxelHV9H19Q0\noga3WNBpAgMBAAECggEACxPqM4mRFi2TJ65gBqreGqOI/CAaxfioojd6kRAZAhtx\ntllq5UjRMfze+SvrKXc77XxysQ5LdlsWjbOyRz535A21Dg7QDLA31L4uG5Cb0SDE\nuTbxlcur/Rvq3tQYzjXum3I5fljWjd59uzxpwaJCGSsthSEZ9SWqeexc1CQ7+F/M\n1n0QcdvDN4JPPXbjiztEd9Bg5zBlsDV81I8iv+lC/0YXbao1CfzJOKngCC96eoXL\n/23/J3TcxK7dJCjTWqUjh/rJbeEpgAqUOfPLMWLE4w5PQGynv3k9E8UeqLr8ONUU\nioYDtXxasFjqFcPV/AeBGlsXuaRLb5WIcaSKCgcoNQKBgQDzBk+m3RAsAu1odZXs\nPSq47E8ksXQcwM2nFnVqAOY0AWAhw5sml59bUgVoAm926HgxMApbH0v8zkUznbVf\nZgr8SQrer6qUDNtM0MvWWD61ReSd7nQuwLlYw92qKp0mL5lFvjGnfqAXo+FUNr69\nOhCvFi1OJjlNWg0hjPGxJCbLXQKBgQC/AT19X76W/MIv7scM4Zrwbjjuo3Q4ZQlP\nJ8Ueoz9dAeno2A5nD70re38/QBgkj+3ebeSk6D0nGEreCMUvlnexJxzc2elFygpZ\na0/1Ozp5hqwIL4tzEjT/RHAyzcNshcuerd6chwryzvXqWrIj2ogU6EK8MptjuoFd\nfsO+XpFUfQKBgQCC5GlONE6bhdAcrQhcvu0dwJk36CPjwKyDTANdXrKeXAdM6C/O\nb2ezJdAnnvguETN7Oqa5QXgJ54c6L70abrmH/EdQfUjgiLQtAWBoSAsuU0C5F0+Y\nRtENUCE5n84YXRaui6vuzLKpSOj6FKpS/M0zoDwylT/Tu6bK5UDf6drDOQKBgQCB\nM2qPozM92O3WFJOKkBUJa9WQ/vn/p8CbTZCWP+D9nezGt1dOuaPBhQE3HLj4Cm/h\n1L4kGoA7MMB73rzbitGeAJIShki4D4neoKtue8j7KXC2/Mo8ZWV6AqZOh0cY4oww\n4vXBNcvfIMXR59W2UP1Z/x4dRbI8zIzzXGs2G6v81QKBgGNOmJKzSMB+MdHws6ji\nIB3urfEM/EqLRuXStcwwzlW73q6KNGSjzq3WDq/a2MmMeHAyNYnkr34tKM8ifjY5\ncXkvf8ON8kOPMd4wsI2nFxOQmjl/N1RcG0xeI3tnnXMbezrA5zkT0WcLWjVMDwHS\nxj5YteOZRMYyU969BGwaeYeP\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
  client_email: "exodus-c5202@appspot.gserviceaccount.com",
  client_id: "105468369505550551592",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/exodus-c5202%40appspot.gserviceaccount.com"
};

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  storageBucket: process.env.FIRE_STORAGE_BUCKET,
  databaseURL: `https://${process.env.FIRE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();
const auth = admin.auth();
db.settings({ ignoreUndefinedProperties: true });

module.exports = { db, auth, admin };
