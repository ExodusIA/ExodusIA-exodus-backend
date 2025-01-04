const { db } = require('./../firebaseConfig'); // Importa o Firestore já configurado
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://pjgclgmtygvdjsadpikd.supabase.co'; // Substitua pelo URL do seu Supabase
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqZ2NsZ210eWd2ZGpzYWRwaWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxMTQ4NDYsImV4cCI6MjA0NzY5MDg0Nn0.yTRWRAmk-eA-96Sx9-1_iM4Rh72DS2BnwZMjtd6wEPw'; // Substitua pela sua chave de API
const supabase = createClient(supabaseUrl, supabaseKey);

// ID fixo do business
const fixedBusinessId = '587f9ca0-7ac5-4fef-b17c-e5ae6c181bfa';

// Função para migrar dados
const migrateClients = async () => {
  try {
    const clientsSnapshot = await db.collection('clients').get();
    if (clientsSnapshot.empty) {
      console.log('Nenhum cliente encontrado na coleção "clients".');
      return;
    }

    const clients = [];
    clientsSnapshot.forEach(doc => {
      const data = doc.data();
      clients.push({
        name: data.name || null,
        nickname: data.nickname || null,
        email: data.email || null,
        phone: data.phone || null,
        active: data.active || false,
        business: fixedBusinessId // ID fixo do business
      });
    });

    for (const client of clients) {
      const { error } = await supabase
        .from('clients')
        .insert([{
          name: client.name,
          nickname: client.nickname,
          email: client.email,
          phone: client.phone,
          active: client.active,
          business: client.business
        }]);

      if (error) {
        console.error(`Erro ao inserir cliente ${client.name}:`, error.message);
      } else {
        console.log(`Cliente ${client.name} inserido com sucesso!`);
      }
    }

    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error.message);
  }
};

// Executar a migração
migrateClients();
