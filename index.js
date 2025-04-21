const express = require('express');
const axios = require('axios');
const { ANIME } = require('@consumet/extensions');
const { compareTwoStrings } = require('string-similarity');

const app = express();
const PORT = process.env.PORT || 3000;

// Instantiate AnimeKai
const animeProvider = new ANIME.AnimeKai();

// Function to search and map the AniList title to AnimeKai
async function getMappings(title) {
  if (!title || !title.english || !title.romaji) return null;

  try {
    const eng = await animeProvider.search(title.english);
    const rom = await animeProvider.search(title.romaji);

    const combined = [...(eng?.results || []), ...(rom?.results || [])];

    const uniqueResults = Array.from(new Set(combined.map(item => JSON.stringify(item))))
      .map(item => JSON.parse(item));

    let highestComp = 0;
    let similarity_id = '';

    uniqueResults.forEach((obj) => {
      const eng_comp = compareTwoStrings(title.english, obj.title || '');
      const rom_comp = compareTwoStrings(title.romaji, obj.japaneseTitle || '');
      const score = Math.max(eng_comp, rom_comp);

      if (score > highestComp) {
        highestComp = score;
        similarity_id = obj.id;
      }
    });

    return similarity_id;
  } catch (err) {
    console.error('Error while searching anime:', err);
    return null;
  }
}

// API route that maps AniList ID to AnimeKai ID
app.get('/api/map/:anilistId', async (req, res) => {
  const { anilistId } = req.params;

  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        title {
          romaji
          english
        }
      }
    }
  `;

  try {
    const response = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { id: Number(anilistId) },
    });

    const title = response.data.data.Media.title;

    const kaiId = await getMappings(title);

    if (kaiId) {
      res.json({ kaiId });
    } else {
      res.status(404).json({ error: 'No match found on AnimeKai.' });
    }
  } catch (err) {
    console.error('AniList query failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch from AniList or map result.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
