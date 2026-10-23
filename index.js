import fs from 'fs/promises';

const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  // 1. Les paramètres de requête (issus de Query Parameters dans Scalar)
  const dateFrom = '2026-10-01';
  const dateTo = '2026-10-31';

  // 2. L'URL exacte de l'endpoint (issue de la barre de recherche Scalar) avec les paramètres date_from et date_to
  const url = `https://www.nolio.io/api/v2/planned/trainings/?date_from=${dateFrom}&date_to=${dateTo}`;

  console.log(`Exécution de la requête vers : ${url}`);

  try {
    // 3. Le fetch avec la méthode GET et les en-têtes d'authentification (Bearer Token)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Correspond au Bearer Token de Scalar
        'Accept': 'application/json'          // Correspond au header 'accept' de Scalar
      }
    });

    console.log(`Statut HTTP reçu : ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur renvoyée par l'API :", errorText);
      process.exit(1);
    }

    // On convertit le texte brut en objet JSON exploitable
    const jsonResponse = await response.json();

    // D'après Scalar, les entraînements sont dans le tableau .data
    const workouts = jsonResponse.data;
    console.log(`Nombre de séances trouvées : ${workouts.length}`);

    // Création du contenu du fichier lisible
    let fileContent = `# Entraînements planifiés (${dateFrom} au ${dateTo})\n\n`;

    // On boucle sur chaque séance pour formater les détails
    workouts.forEach((workout, index) => {
      fileContent += `## Séance n°${index + 1} : ${workout.name}\n`;
      fileContent += `- Date : ${workout.date_start}\n`;
      fileContent += `- Description : ${workout.description || 'Aucune'}\n`;
      
      if (workout.duration) {
        fileContent += `- Durée : ${workout.duration.value} ${workout.duration.unit}\n`;
      }
      fileContent += `\n`;
    });

    // Écriture du fichier de sortie en asynchrone (compatible ES modules)
    await fs.writeFile('workouts.md', fileContent, 'utf8');
    console.log("Fichier 'workouts.md' généré avec succès.");

  } catch (error) {
    console.error("Erreur de fetch détaillée :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
