const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  const startDate = '2026-10-01';
  const endDate = '2026-10-31';
  const url = `https://api.nolio.io/api/v2/workouts/planned?from=${startDate}&to=${endDate}`;

  console.log(`Interrogation de l'API Nolio pour la période du ${startDate} au ${endDate}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Données récupérées avec succès :");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Échec de la requête Nolio :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
