import fs from 'fs/promises';

// Fonction pour récupérer le détail complet d'une séance via son ID
const fetchWorkoutDetail = async (id, token) => {
  const url = `https://www.nolio.io/api/v2/planned/trainings/${id}/`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      // Affiche toutes les clés disponibles dans le détail de la séance
      console.log(`\n🔍 Clés dispo pour ${id}:`, Object.keys(data));
      // Affiche le JSON complet pour qu'on voie où sont les blocs
      console.log(JSON.stringify(data, null, 2));
      return data;
    }
  } catch (error) {
    console.error(`Erreur fetch detail pour ${id} :`, error.message);
  }
  return null;
};

const fetchNolioData = async () => {
  const token = process.env.NOLIO_TOKEN;

  if (!token) {
    console.error("Erreur : La variable d'environnement NOLIO_TOKEN est manquante.");
    process.exit(1);
  }

  const dateFrom = '2026-10-01';
  const dateTo = '2026-10-31';
  const url = `https://www.nolio.io/api/v2/planned/trainings/?date_from=${dateFrom}&date_to=${dateTo}`;

  console.log(`Exécution de la requête vers : ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`Statut HTTP reçu : ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur renvoyée par l'API :", errorText);
      process.exit(1);
    }

    const jsonResponse = await response.json();
    const workouts = jsonResponse.data;
    console.log(`Nombre de séances trouvées : ${workouts.length}`);

    // \uFEFF (BOM UTF-8) force Excel à reconnaître les accents
    let csvContent = "\uFEFFDate;Nom;Description;Durée;Détail Structuré\n";

    // On boucle sur chaque séance de la liste pour aller chercher son vrai contenu détaillé
    for (const workout of workouts) {
      console.log(`Récupération du détail pour : ${workout.name} (${workout.id})`);
      const detail = await fetchWorkoutDetail(workout.id, token);

      let durationStr = '';
      if (workout.duration) {
        durationStr = `${workout.duration.value} ${workout.duration.unit}`;
      }

      const name = (workout.name || '').replace(/[\r\n]+/g, ' ');
      const description = (workout.description || 'Aucune').replace(/[\r\n]+/g, ' ');

      // Extraction du détail structuré si présent
      const structuredInfo = detail && detail.structured ? JSON.stringify(detail.structured).replace(/[\r\n]+/g, ' ') : '';

      csvContent += `"${workout.date_start}";"${name}";"${description}";"${durationStr}";"${structuredInfo}"\n`;
    }

    // Création automatique du dossier 'exports' s'il n'existe pas
    await fs.mkdir('exports', { recursive: true });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `exports/workouts_${timestamp}.csv`;

    await fs.writeFile(fileName, csvContent, 'utf8');
    console.log(`Fichier '${fileName}' généré avec succès avec tous les détails.`);

  } catch (error) {
    console.error("Erreur de fetch détaillée :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
