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

const cleanCsvField = (str) => {
  if (!str) return '';
  return String(str).replace(/"/g, '""').replace(/[\r\n]+/g, ' ').trim();
};

const flattenWorkoutSteps = (stepsArray) => {
  let flattened = [];
  if (!stepsArray || !Array.isArray(stepsArray)) return flattened;

  for (const item of stepsArray) {
    if (item.kind === 'repeat') {
      const times = item.times || 1;
      for (let i = 0; i < times; i++) {
        flattened.push(...flattenWorkoutSteps(item.steps));
      }
    } else if (item.kind === 'step') {
      flattened.push({
        intensity: item.intensity || 'N/A',
        durationValue: item.duration ? item.duration.value : '',
        durationUnit: item.duration ? item.duration.unit : '',
        targets: item.targets || [],
        repeats: 1
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

    let csvContent = "\uFEFFDate;Nom;Description;Durée Totale;Intensité Étape;Répétitions;Durée Étape;Unité Durée;Type Cible;Métrique;% Min;% Max;Cible Low;Cible High;Unité Cible\n";
    
    // Contenu de base pour le fichier Markdown
    let mdContent = `# Récapitulatif des entraînements Nolio\n\n`;
    mdContent += `| Date | Nom | Intensité | Durée | Cible |\n`;
    mdContent += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const workout of workouts) {
      console.log(`Récupération du détail pour : ${workout.name} (${workout.id})`);
      const detail = await fetchWorkoutDetail(workout.id, token);

      let totalDurationStr = workout.duration ? `${workout.duration.value} ${workout.duration.unit}` : '';
      const name = cleanCsvField(workout.name);
      const description = cleanCsvField(workout.description || 'Aucune');

      if (detail && detail.workout) {
        const steps = flattenWorkoutSteps(detail.workout);

        for (const step of steps) {
          let tType = 'no_target';
          let tMetric = '';
          let tPercent = '';
          let tPercentMax = '';
          let tLow = '';
          let tHigh = '';
          let tUnit = '';

          if (step.targets && step.targets.length > 0) {
            const t = step.targets[0];
            tType = t.type || 'no_target';
            tMetric = t.metric || '';
            tPercent = t.percent !== undefined ? t.percent : '';
            tPercentMax = t.percent_max !== undefined ? t.percent_max : '';
            if (t.resolved) {
              tLow = t.resolved.low !== undefined ? t.resolved.low : '';
              tHigh = t.resolved.high !== undefined ? t.resolved.high : '';
              tUnit = t.resolved.unit || '';
            }
          }

          csvContent += `"${workout.date_start}";"${name}";"${description}";"${totalDurationStr}";"${step.intensity}";"${step.repeats}";"${step.durationValue}";"${step.durationUnit}";"${tType}";"${tMetric}";"${tPercent}";"${tPercentMax}";"${tLow}";"${tHigh}";"${tUnit}"\n`;

          // Ajout de la ligne dans le tableau Markdown
          const targetDisplay = tLow && tHigh ? `${tMetric} ${tPercent}-${tPercentMax}% (${tLow}-${tHigh} ${tUnit})` : 'Libre';
          mdContent += `| ${workout.date_start} | ${name} | ${step.intensity} | ${step.durationValue}${step.durationUnit} | ${targetDisplay} |\n`;
        }
      }
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvFileName = `exports/workouts_${timestamp}.csv`;
    const mdFileName = `exports/workouts_summary.md`;

    await fs.writeFile(csvFileName, csvContent, 'utf8');
    await fs.writeFile(mdFileName, mdContent, 'utf8');
    console.log(`Fichiers CSV et Markdown générés avec succès !`);

  } catch (error) {
    console.error("Erreur :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
