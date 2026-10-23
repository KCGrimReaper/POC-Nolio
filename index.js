const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  // ==========================================
  // 1. C'EST ICI QUE TU METS TON URL ET TES PARAMÈTRES
  // ==========================================
  const startDate = '2026-10-01';
const endDate = '2026-10-31';
const url = `https://www.nolio.io/api/v2/planned/trainings/?date_from=${startDate}&date_to=${endDate}`;

  console.log(`Exécution de la requête vers : ${url}`);

  try {
    // ==========================================
    // 2. C'EST ICI QUE TU CONFIGURES LA MÉTHODE (GET / POST)
    // ==========================================
    const response = await fetch(url, {
      method: 'GET', // Mets 'POST' si tu envoies des données, 'GET' pour les récupérer
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
      // Si tu fais un POST, tu ajouterais une ligne body ici :
      // body: JSON.stringify({ ... })
    });

    console.log(`Statut HTTP reçu : ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log("Données récupérées :", text);

  } catch (error) {
    console.error("Erreur de fetch détaillée :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
