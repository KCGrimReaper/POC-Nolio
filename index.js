const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  // Bon endpoint de l'API Nolio pour les séances planifiées
  const url = 'https://www.nolio.io/api/get/planned/training/?from=2026-10-01&to=2026-10-31';

  console.log(`Tentative de requête vers ${url}...`);

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
