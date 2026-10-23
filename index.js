import fs from 'fs/promises';

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
      await fs.writeFile(`exports/detail_${id}.json`, JSON.stringify(data, null, 2), 'utf8');
      return data;
    }
  } catch (error) {
    console.error(`Erreur fetch detail pour ${id} :`, error.message);
  }
  return null;
};

// Fonction récursive pour aplatir les étapes et les blocs de répétition (repeat)
const flattenWorkoutSteps = (stepsArray, multiplier = 1) => {
  let flattened = [];
  if (!stepsArray || !Array.isArray(stepsArray)) return flattened;

  for (const item of stepsArray) {
    if (item.kind === 'repeat') {
      const times = item.times || 1;
      // Appel récursif en multipliant le nombre de répétitions
      flattened.push(...flattenWorkoutSteps(item.steps, multiplier * times));
    } else if (item.kind === 'step') {
      flattened.push({
        intensity: item.intensity || 'N/A',
        durationValue: item.duration ? item.duration.value : '',
        durationUnit: item.duration ? item.duration.unit : '',
        targets: item.targets || [],
        repeats: multiplier > 1 ? multiplier : 1
      });
    }
  }
  return flattened;
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
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error("Erreur API Nolio");
      process.exit(1);
    }

    const jsonResponse = await response.json();
    const workouts = jsonResponse.data;
    console.log(`Nombre de séances trouvées : ${workouts.length}`);

    await fs.mkdir('exports', { recursive: true });

    // En-têtes du CSV avec des colonnes bien distinctes
    let csvContent = "\uFEFFDate;Nom;Description;Durée Totale;Intensité Étape;Répétitions;Durée Étape;Unité;Cible\n";

    for (const workout of workouts) {
      console.log(`Récupération du détail pour : ${workout.name} (${workout.id})`);
      const detail = await fetchWorkoutDetail(workout.id, token);

      let totalDurationStr = workout.duration ? `${workout.duration.value} ${workout.duration.unit}` : '';
      const name = (workout.name || '').replace(/[\r\n]+/g, ' ');
      const description = (workout.description || 'Aucune').replace(/[\r\n]+/g, ' ');

      if (detail && detail.workout) {
        const steps = flattenWorkoutSteps(detail.workout);

        for (const step of steps) {
          let targetStr = 'Libre';
          if (step.targets && step.targets.length > 0) {
            const t = step.targets[0];
            if (t.type === 'metric') {
              const resolvedInfo = t.resolved ? ` (${t.resolved.low}-${t.resolved.high} ${t.resolved.unit})` : '';
              targetStr = `${t.metric} ${t.percent}-${t.percent_max}%${resolvedInfo}`;
            }
          }

          csvContent += `"${workout.date_start}";"${name}";"${description}";"${totalDurationStr}";"${step.intensity}";"${step.repeats}";"${step.durationValue}";"${step.durationUnit}";"${targetStr}"\n`;
        }
      }
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `exports/workouts_${timestamp}.csv`;

    await fs.writeFile(fileName, csvContent, 'utf8');
    console.log(`Fichier '${fileName}' généré avec succès !`);

  } catch (error) {
    console.error("Erreur :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
