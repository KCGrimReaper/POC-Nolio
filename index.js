const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  // Base URL v2 avec le slash final obligatoire pour éviter le 404
  const url = 'https://www.nolio.io/api/v2/me/';

  console.log(`Tentative de requête v2 vers ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`Statut HTTP reçu : ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log("Réponse du serveur :", text);

  } catch (error) {
    console.error("Erreur de fetch détaillée :", error.cause || error.message);
    process.exit(1);
  }
};

fetchNolioData();
