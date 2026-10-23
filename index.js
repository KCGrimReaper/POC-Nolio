import fs from 'fs/promises';

// Fonction pour récupérer le détail complet d'une séance via son ID et sauvegarder le JSON
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
      
      // Sauvegarde du JSON individuel dans le dossier exports
      await fs.writeFile(`exports/detail_${id}.json`, JSON.stringify(data, null, 2), 'utf8');
      
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

    // Création automatique du dossier 'exports' s'il n'existe pas
    await fs.mkdir('exports', { recursive: true });

    // \uFEFF (BOM UTF-8) force Excel à reconnaître les accents
    let csvContent = "\uFEFFDate;Nom;Description;Durée;Détail Structuré (Intensity / Duration / Targets)\n";

    for (const workout of workouts) {
      console.log(`Récupération du détail pour : ${workout.name} (${workout.id})`);
      const detail = await fetchWorkoutDetail(workout.id, token);

      let durationStr = '';
      if (workout.duration) {
        durationStr = `${workout.duration.value} ${workout.duration.unit}`;
      }

      const name = (workout.name || '').replace(/[\r\n]+/g, ' ');
      const description = (workout.description || 'Aucune').replace(/[\r\n]+/g, ' ');

      // Extraction et formatage propre des étapes structurées (workout array)
      let structuredInfo = '';
      if (detail && detail.workout && Array.isArray(detail.workout)) {
        const stepsFormatted = detail.workout.map(step => {
          const intensity = step.intensity || 'N/A';
          const durVal = step.duration ? step.duration.value : '';
          const durUnit = step.duration ? step.duration.unit : '';
          
          let targetStr = 'Sans cible';
          if (step.targets && step.targets.length > 0) {
            const t = step.targets[0];
            if (t.type === 'metric') {
              const resolvedInfo = t.resolved ? ` (${t.resolved.low}-${t.resolved.high} ${t.resolved.unit})` : '';
              targetStr = `${t.metric} ${t.percent}-${t.percent_max}%${resolvedInfo}`;
            } else if (t.type === 'no_target') {
              targetStr = 'Libre';
            }
          }
          return `[${intensity}] ${durVal}${durUnit} -> Cible: ${targetStr}`;
        });
        structuredInfo = stepsFormatted.join(' | ').replace(/[\r\n]+/g, ' ');
      }

      csvContent += `"${workout.date_start}";"${name}";"${description}";"${durationStr}";"${structuredInfo}"\n`;
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `exports/workouts_${timestamp}.csv`;

    await fs.writeFile(fileName, csvContent, 'utf8');
    console.log(`Fichier '${fileName}' généré avec succès avec le détail structuré.`);

  } catch (error) {
    console.error("Erreur de fetch détaillée :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
