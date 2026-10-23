const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  const startDate = '2026-10-01';
  const endDate = '2026-10-31';
  // Endpoint v2 pour les séances planifiées avec les bons paramètres et le slash final
  const url = `https://www.nolio.io/api/v2/workouts/planned/?from=${startDate}&to=${endDate}`;

  console.log(`Interrogation des séances planifiées du ${startDate} au ${endDate}...`);

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
    console.log("Données récupérées :", text);

  } catch (error) {
    console.error("Erreur de fetch détaillée :", error.cause || error.message);
    process.exit(1);
  }
};

fetchNolioData();
