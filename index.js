const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  // Utilisation de l'URL de base officielle de l'API Nolio
  const url = 'https://www.nolio.io/api/v1/user/'; // ou l'endpoint de test de base

  console.log(`Tentative de connexion à l'API Nolio...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'POC-Nolio-Script'
      }
    });

    console.log(`Statut HTTP reçu : ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log("Réponse du serveur :", text);

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }
  } catch (error) {
    console.error("Échec critique de la requête réseau :", error);
    process.exit(1);
  }
};

fetchNolioData();
