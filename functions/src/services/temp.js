const { db } = require('../firebaseConfig'); // Importa a configuração do Firebase Admin

async function findClientsByEmails() {
  try {
    const emailList = [
      "lumameinerz@hotmail.com", "thalitaoliveiramkt@gmail.com", "maisainfante@yahoo.com.br", "thais_borges@hotmail.com", "efeitodapratica@gmail.com", "endrigomonsanto@yahoo.com.br", "liliane.frts@yahoo.com.br", "mauricio@ragazzi.adv.br", "you@spaak.com.br", "makinas77@hotmail.com", "raquel.caram@uol.com.br", "luisfsberrettini@gmail.com", "daniluque2020@hotmail.com", "drmeinerz@gmail.com", "luciliamachado.lsm@gmail.com", "daisygm.rep@gmail.com", "fernando@ercoli.com.br", "pri_smizato@hotmail.com", "katyrpmelito@hotmail.com", "mauraprado1960@gmail.com", "cinthia.catellan@gmail.com", "renata_mottaluchesi@outlook.com", "hiroki.uehara@hotmail.com", "franklin@perolatapetes.com.br", "amorimluciana7@hotmail.com", "mfsantos.santos01@gmail.com", "julilui23@gmail.com", "andreiamazloum@gmail.com", "thaysemfreitas@gmail.com", "liciliamachado.lam@gmail.com", "danieletrigo@gmail.com", "carol-vet@uol.com.br", "felpsrdz@gmail.com", "Biafurlan@yahoo.com.br", "edinhorx@hotmail.com", "gisposito@hotmail.com", "beatrizcromantini@gmail.com", "yyfattah@gmail.com", "sandra.pinheiro1@yahoo.com.br", "rtalaia@outlook.com", "rosane.po90@gmail.com", "marcia.cherbino@gmail.com", "luzfatima@gmail.com.br", "lucianameinerz@gmail.com", "mayumadepaula@gmail.com", "lilianeapgmf@gmail.com", "daniluqueluque@gmail.com", "renata.d.shirai@gmail.com", "maisainfante@gmail.com", "isabella.uglik@gmail.com", "contato@denisefurlan.com.br", "edinhorx@gmail.com", "crleal.ac@gmail.com", "katyrpmelito@gmail.com", "luzfatima@gmail.com", "marcelscarneiro@gmail.com", "fabiohiro@gmail.com", "giovanaromantini@gmail.com", "ptgc.civolani@gmail.com", "flaviaortiz@aasp.org.br", "alewatanabe88@gmail.com", "nubia.boito@uol.com.br", "marianamarcolino@gmail.com", "cassavia@gmail.com", "rimsaragazzi@gmail.com", "kiara.ayza.sofia@gmail.com", "pri.uehara07@gmail.com", "jackoliveiraoficial@gmail.com", "mauriciocresostomo@gmail.com", "ritaccatellan1@gmail.com", "karomantini@gmail.com", "luma.cromantini@gmail.com", "lahamsimone@gmail.com", "mellojorgeclaudiode@gmail.com", "renata.motta1@gmail.com", "ireaugusto13@gmail.com", "cristinalainec@gmail.com"
    ];
    
    const clientsRef = db.collection("clients");
    
    for (const email of emailList) {
      const querySnapshot = await clientsRef.where("email", "==", email).get();
      
      querySnapshot.forEach(doc => {
        const clientData = doc.data();
        console.log(`Cliente encontrado: ID=${doc.id}, Nome=${clientData.name}, Email=${clientData.email}`);
      });
    }
  } catch (error) {
    console.error("Erro ao buscar os clientes:", error);
  }
}

findClientsByEmails().catch(console.error);
