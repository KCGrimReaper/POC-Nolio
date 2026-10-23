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
      await fs.mkdir('exports/json', { recursive: true });
      await fs.writeFile(`exports/json/detail_${id}.json`, JSON.stringify(data, null, 2), 'utf8');
      return data;
    }
  } catch (error) {
    console.error(`Erreur fetch detail pour ${id} :`, error.message);
  }
  return null;
};

const cleanText = (str) => {
  if (!str) return '';
  return String(str).replace(/"/g, '""').replace(/[\r\n]+/g, ' ').trim();
};

const formatStepsMarkdown = (stepsArray, depth = 0) => {
  let md = '';
  if (!stepsArray || !Array.isArray(stepsArray)) return md;

  for (const item of stepsArray) {
    const indent = '  '.repeat(depth);
    if (item.kind === 'repeat') {
      const times = item.times || 1;
      md += `${indent}- **${times}x**\n`;
      md += formatStepsMarkdown(item.steps, depth + 1);
    } else if (item.kind === 'step') {
      const intensity = item.intensity ? `[${item.intensity}]` : '';
      const duration = item.duration ? `${item.duration.value}${item.duration.unit}` : '';
      
      let targetStr = 'Libre';
      if (item.targets && item.targets.length > 0) {
        const t = item.targets[0];
        if (t.type === 'metric') {
          const resolved = t.resolved ? ` (${t.resolved.low}-${t.resolved.high} ${t.resolved.unit})` : '';
          targetStr = `${t.metric} ${t.percent}-${t.percent_max}%${resolved}`;
        }
      }
      md += `${indent}- ${intensity} **${duration}** -> Cible : ${targetStr}\n`;
    }
  }
  return md;
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

    // Création des sous-répertoires pour ranger proprement
    await fs.mkdir('exports/csv', { recursive: true });
    await fs.mkdir('exports/md', { recursive: true });

    let csvContent = "\uFEFFDate;Nom;Description;Durée Totale;Intensité Étape;Répétitions;Durée Étape;Unité Durée;Type Cible;Métrique;% Min;% Max;Cible Low;Cible High;Unité Cible\n";

    for (const workout of workouts) {
      console.log(`Récupération du détail pour : ${workout.name} (${workout.id})`);
      const detail = await fetchWorkoutDetail(workout.id, token);

      let totalDurationSec = workout.duration ? workout.duration.value : 0;
      let durationFormatted = `${Math.floor(totalDurationSec / 3600)}h ${Math.floor((totalDurationSec % 3600) / 60)}m`;
      let distanceKm = workout.distance ? `${workout.distance.value} ${workout.distance.unit}` : 'N/A';
      const name = cleanText(workout.name);
      const description = workout.description || 'Aucune description';

      // Génération de la fiche Markdown individuelle basée sur le modèle WS Coaching[cite: 3]
      let mdSheet = `WS COACHING\n`;
      mdSheet += `Ton entraîneur\n`;
      mdSheet += `William Sandy Wscoaching 63 - Wscoaching63@gmail.com - 0637421016\n`;
      mdSheet += `Vallonné - Course à pied\n\n`;
      mdSheet += `✓ Séance structurée envoyée vers Suunto app\n\n`;
      mdSheet += `**Durée :** ${durationFormatted}  \n`;
      mdSheet += `**Allure :** 5'25/km - 11.08 km/h  \n`;
      mdSheet += `**Distance :** ${distanceKm}  \n`;
      mdSheet += `**Dénivelé + :** ${workout.elevation_gain || '0'} m  \n\n`;
      mdSheet += `### Commentaire de l'entraîneur\n`;
      mdSheet += `> ${description.replace(/\n/g, '  \n> ')}\n\n`;
      mdSheet += `### Déroulé structuré\n`;

      if (detail && detail.workout) {
        mdSheet += formatStepsMarkdown(detail.workout);

        const flattenSteps = (stepsArray) => {
          let res = [];
          for (const item of stepsArray) {
            if (item.kind === 'repeat') {
              for (let i = 0; i < (item.times || 1); i++) res.push(...flattenSteps(item.steps));
            } else if (item.kind === 'step') {
              res.push({
                intensity: item.intensity || 'N/A',
                durationValue: item.duration ? item.duration.value : '',
                durationUnit: item.duration ? item.duration.unit : '',
                targets: item.targets || []
              });
            }
          }
          return res;
        };

        const steps = flattenSteps(detail.workout);
        for (const step of steps) {
          let tType = 'no_target', tMetric = '', tPercent = '', tPercentMax = '', tLow = '', tHigh = '', tUnit = '';
          if (step.targets && step.targets.length > 0) {
            const t = step.targets[0];
            tType = t.type || 'no_target';
            tMetric = t.metric || '';
            tPercent = t.percent ?? '';
            tPercentMax = t.percent_max ?? '';
            if (t.resolved) {
              tLow = t.resolved.low ?? '';
              tHigh = t.resolved.high ?? '';
              tUnit = t.resolved.unit || '';
            }
          }
          csvContent += `"${workout.date_start}";"${name}";"${cleanText(description)}";"${totalDurationSec}s";"${step.intensity}";"1";"${step.durationValue}";"${step.durationUnit}";"${tType}";"${tMetric}";"${tPercent}";"${tPercentMax}";"${tLow}";"${tHigh}";"${tUnit}"\n`;
        }
      }

      mdSheet += `\nConçu avec Nolio\nwww.nolio.io\nnöliö\n`;
      
      // Sauvegarde de la fiche dans le sous-dossier md/
      await fs.writeFile(`exports/md/fiche_${workout.date_start}_${workout.id}.md`, mdSheet, 'utf8');
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await fs.writeFile(`exports/csv/workouts_${timestamp}.csv`, csvContent, 'utf8');
    console.log(`Fichiers rangés avec succès dans exports/csv/ et exports/md/ !`);

  } catch (error) {
    console.error("Erreur :", error.message);
    process.exit(1);
  }
};

fetchNolioData();
