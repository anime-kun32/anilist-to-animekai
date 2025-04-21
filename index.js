
const express = require('express');
const { ANIME } = require('@consumet/extensions');
const { compareTwoStrings } = require('string-similarity');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Function to get the best match from the AnimeKai API
async function getMappings(title) {
  if (!title) return null;
  if (!title?.english || !title?.romaji) return null;

  try {
    // Search for the anime using both English and Romaji titles
    const eng = await ANIME.AnimeKai.search(title?.english);
    const rom = await ANIME.AnimeKai.search(title?.romaji);

    const english_search = eng?.results || [];
    const romaji_search = rom?.results || [];

    // Combine the results from both searches and remove duplicates
    const combined = [...english_search, ...romaji_search];
    const uniqueResults = Array.from(new Set(combined.map(item => JSON.stringify(item))))
      .map(item => JSON.parse(item));

    let highestComp = 0;
    let similarity_id = "";

    // Compare each result and pick the best match
    uniqueResults.forEach((obj) => {
      const id = obj.id;
      const ob_title = obj.title;
      const ob_japaneseTitle = obj.japaneseTitle;

      const eng_comparison = compareTwoStrings(title?.english, ob_title);
      const jp_comparison = compareTwoStrings(title?.romaji, ob_japaneseTitle);

      const greatest_title = Math.max(eng_comparison, jp_comparison);

      if (highestComp < greatest_title) {
        highestComp = greatest_title;
        similarity_id = id;
      }
    });

    return similarity_id;
  } catch (error) {
    console.error("Error while searching anime:", error);
    return null;
  }
}

// API endpoint to map AniList title to AnimeKai ID
app.get('/api/map/:anilistId', async (req, res) => {
  const { anilistId } = req.params;

  try {
    // For simplicity, use a mock call to get the AniList title based on `anilistId`
    // You could replace this with an actual call to AniList's API if you prefer
    const title = {
      english: 'Sonic X',  // Mocked English title
      romaji: 'ソニックX',  // Mocked Romaji title
    };

    // Call the getMappings function with the title
    const kaiResult = await getMappings(title);

    if (kaiResult) {
      res.json({ kaiResult });
    } else {
      res.status(404).json({ error: 'No match found on KaiAnime.' });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
