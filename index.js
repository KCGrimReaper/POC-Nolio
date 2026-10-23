const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  const startDate = '2026-10-01';
  const endDate = '2026-10-31';
  const url = `https://api.nolio.io/api/v2/workouts/planned?from=${startDate}&to=${endDate}`;

  console.log(`Interrogation de l'URL : ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`Statut de la réponse : ${response.status} ${response.statusText}`);

    const responseText = await response.text();
    console.log("Corps de la réponse brute :", responseText);

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }
  } catch (error) {
    console.error("Échec de la requête Nolio :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
