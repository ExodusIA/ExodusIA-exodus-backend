const { db } = require('../firebaseConfig'); // Importa a configuração do Firebase Admin

async function findClientsAndAssignTurma() {
  try {
    // Lista de clientes com seus dias de treino
    const clientList = [
      { name: "Ailton Wang", day: "TERÇA" },
      { name: "Alessandra Dias Watanabe", day: "SEGUNDA" },
      { name: "Ana Carolina Leal", day: "TERÇA" },
      { name: "Ana Cristina Machado", day: "ONLINE" },
      { name: "Andreia Mohamad Mazloum", day: "TERÇA" },
      { name: "Beatriz Cury Romantini", day: "SEGUNDA" },
      { name: "Beatriz Furlan", day: "TERÇA" },
      { name: "Benita Terezinha Galeti Romantini", day: "TERÇA" },
      { name: "Cinthia Catellan", day: "TERÇA" },
      { name: "Daisy Gomes Medeiros", day: "TERÇA" },
      { name: "Daniela Luque de Souza Oliveira", day: "TERÇA" },
      { name: "Daniele Trigo", day: "TERÇA" },
      { name: "Edison Augusto de Oliveira", day: "TERÇA" },
      { name: "Elaine Cristina Figueiredo Cardoso Campanelli", day: "ONLINE" },
      { name: "Ellen Dutra", day: "TERÇA" },
      { name: "Fátima Luz", day: "TERÇA" },
      { name: "Flavia Ortiz Rodrigues Garcia", day: "TERÇA" },
      { name: "Franklin Delgado", day: "TERÇA" },
      { name: "Giovana Sganzela Romantini", day: "SEGUNDA" },
      { name: "Guile Amadeu", day: "TERÇA" },
      { name: "Irene de Fátima Augusto Oliveira", day: "TERÇA" },
      { name: "Isabella Uglik Galvez", day: "SEGUNDA" },
      { name: "Jackson Hiroki Teruya Uehara", day: "SEGUNDA" },
      { name: "Jaqueline J M de Oliveira", day: "TERÇA" },
      { name: "Jose Roberto Mayer", day: "TERÇA" },
      { name: "Jorge Claudio de Mello", day: "TERÇA" },
      { name: "Juliana Romantini", day: "TERÇA" },
      { name: "Katia R Cury Romantini", day: "ONLINE" },
      { name: "Katy Ramos Pinho Melito", day: "TERÇA" },
      { name: "Liliane Aparecida Gonçalves Medeiros de Freitas", day: "SEGUNDA" },
      { name: "Luciana Cristina de Amorim", day: "TERÇA" },
      { name: "Luciana Meinerz", day: "SEGUNDA" },
      { name: "Lucilia da Silva Machado", day: "TERÇA" },
      { name: "Luma Cury Romantini", day: "ONLINE" },
      { name: "Lurdes Romantini", day: "TERÇA" },
      { name: "Madalena Almeida", day: "SEGUNDA" },
      { name: "Maisa Infante", day: "SEGUNDA" },
      { name: "Márcia Cristina de Magalhães Cherbino", day: "TERÇA" },
      { name: "Márcia Cristina Sorvilo Moreno", day: "TERÇA" },
      { name: "Mariana Marcolino", day: "TERÇA" },
      { name: "Maura Prado de Oliveira", day: "TERÇA" },
      { name: "Mauricio Aparecido Cresostomo", day: "TERÇA" },
      { name: "Mauricio Fernandes dos Santos", day: "TERÇA" },
      { name: "Núbia M O Boito", day: "SEGUNDA" },
      { name: "Paula Civolani", day: "ONLINE" },
      { name: "Priscila Smizato Uehara", day: "TERÇA" },
      { name: "Rafael Vaz de Lima", day: "SEGUNDA" },
      { name: "Raquel Caram Teixeira", day: "SEGUNDA" },
      { name: "Reginaldo Gonzalez", day: "TERÇA" },
      { name: "Renata Motta Luchesi", day: "TERÇA" },
      { name: "Rita De Cassia Costa Catellan", day: "TERÇA" },
      { name: "Rosane Prado de Oliveira", day: "TERÇA" },
      { name: "Thais de Oliveira Borges", day: "TERÇA" },
      { name: "Thais Guimarães Pimentel", day: "TERÇA" },
      { name: "Vera Lucia Milan Aznar", day: "TERÇA" },
      { name: "Veronica Cassavia", day: "TERÇA" }
    ];

    const clientsRef = db.collection("clients");
    
    // Buscar todos os clientes do banco
    const allClientsSnapshot = await clientsRef.get();
    
    let foundClients = [];
    let updatedClients = [];

    // Iterar através de todos os clientes do banco
    allClientsSnapshot.forEach(doc => {
      const clientData = doc.data();
      const clientName = clientData.name;
      
      // Procurar por correspondência de nome na lista
      const matchedClient = clientList.find(listClient => {
        // Comparação exata primeiro
        if (listClient.name.toLowerCase() === clientName.toLowerCase()) {
          return true;
        }
        
        // Comparação parcial - verifica se o nome do banco contém palavras-chave do nome da lista
        const listNameWords = listClient.name.toLowerCase().split(' ');
        const clientNameLower = clientName.toLowerCase();
        
        // Verifica se pelo menos 2 palavras principais coincidem
        const matchingWords = listNameWords.filter(word => 
          word.length > 2 && clientNameLower.includes(word)
        );
        
        return matchingWords.length >= 2;
      });

      if (matchedClient) {
        foundClients.push({
          id: doc.id,
          name: clientName,
          email: clientData.email,
          matchedWith: matchedClient.name,
          day: matchedClient.day
        });
      }
    });

    console.log(`\nEncontrados ${foundClients.length} clientes correspondentes:\n`);

    // Processar cada cliente encontrado
    for (const client of foundClients) {
      let turma;
      
      // Determinar a turma baseada no dia
      if (client.day === "SEGUNDA") {
        turma = 1;
      } else if (client.day === "TERÇA") {
        turma = 2;
      } else if (client.day === "ONLINE") {
        turma = 3; // Assumindo turma 3 para treino online
      } else {
        turma = null; // Caso não identificado
      }

      console.log(`Cliente: ${client.name}`);
      console.log(`  ID: ${client.id}`);
      console.log(`  Email: ${client.email}`);
      console.log(`  Corresponde a: ${client.matchedWith}`);
      console.log(`  Dia de treino: ${client.day}`);
      console.log(`  Turma atribuída: ${turma}`);
      console.log('---');

      // Atualizar o documento do cliente com a turma
      if (turma !== null) {
        try {
          await clientsRef.doc(client.id).update({
            turma: turma
          });
          
          updatedClients.push({
            name: client.name,
            turma: turma
          });
          
          console.log(`✅ Cliente ${client.name} atualizado com turma ${turma}`);
        } catch (updateError) {
          console.error(`❌ Erro ao atualizar cliente ${client.name}:`, updateError);
        }
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`Clientes encontrados: ${foundClients.length}`);
    console.log(`Clientes atualizados: ${updatedClients.length}`);
    
    if (updatedClients.length > 0) {
      console.log(`\n📝 Clientes atualizados:`);
      updatedClients.forEach(client => {
        console.log(`  ${client.name} - Turma ${client.turma}`);
      });
    }

  } catch (error) {
    console.error("Erro ao buscar e atualizar os clientes:", error);
  }
}

findClientsAndAssignTurma().catch(console.error);