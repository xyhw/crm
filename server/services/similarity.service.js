import { query } from '../db.js';

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们'
]);

function tokenize(text) {
  const clean = text.toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = clean.split(' ');
  const bigrams = [];
  
  for (const token of tokens) {
    if (token.length >= 2 && !STOP_WORDS.has(token)) {
      bigrams.push(token);
    }
  }

  for (const token of tokens) {
    for (let i = 0; i < token.length - 1; i++) {
      const bigram = token.substring(i, i + 2);
      if (bigram.length === 2 && !STOP_WORDS.has(bigram)) {
        bigrams.push(bigram);
      }
    }
  }

  return bigrams;
}

function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }
  return dp[m][n];
}

function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const key in vec1) {
    const v2 = vec2[key] || 0;
    dotProduct += vec1[key] * v2;
    mag1 += vec1[key] * vec1[key];
  }
  for (const key in vec2) {
    mag2 += vec2[key] * vec2[key];
  }

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

function buildTFVector(tokens) {
  const vec = {};
  for (const t of tokens) {
    vec[t] = (vec[t] || 0) + 1;
  }
  return vec;
}

function calculateSimilarity(text1, text2) {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;

  const vec1 = buildTFVector(tokens1);
  const vec2 = buildTFVector(tokens2);
  const tfidfScore = cosineSimilarity(vec1, vec2);

  const maxLen = Math.max(text1.length, text2.length);
  const editDistance = levenshteinDistance(text1, text2);
  const editScore = 1 - editDistance / maxLen;

  return tfidfScore * 0.6 + editScore * 0.4;
}

export async function detectSimilar(title, city, hotelName, categoryId, excludeId = null) {
  try {
    const { query, queryOne } = await import('../db.js');

    const [thresholdConfig] = await query(
      "SELECT config_value FROM system_configs WHERE config_key = 'similarity_threshold'"
    );
    const threshold = parseFloat(thresholdConfig?.config_value || '0.80');

    const filters = ['status = "active"'];
    const params = [];

    if (excludeId) {
      filters.push('id != ?');
      params.push(excludeId);
    }

    let existing = [];
    if (categoryId) {
      const categoryFilter = filters.concat(['category_id = ?']);
      existing = await query(
        `SELECT id, title, city, hotel_name, category_id, description_public, price
         FROM opportunities WHERE ${categoryFilter.join(' AND ')}
         ORDER BY created_at DESC LIMIT 100`,
        [...params, categoryId]
      );
    }
    
    if (existing.length === 0) {
      existing = await query(
        `SELECT id, title, city, hotel_name, category_id, description_public, price
         FROM opportunities WHERE ${filters.join(' AND ')}
         ORDER BY created_at DESC LIMIT 100`,
        params
      );
    }

    const searchText = [title, hotelName, ''].filter(Boolean).join(' ');
    const results = [];

    for (const opp of existing) {
      let similarityScore = 0;
      const reasons = [];

      const titleSim = calculateSimilarity(title, opp.title);
      if (titleSim > 0.5) {
        similarityScore = Math.max(similarityScore, titleSim);
        reasons.push(`标题相似度 ${Math.round(titleSim * 100)}%`);
      }

      if (city && opp.city && city === opp.city) {
        const cityScore = 0.3;
        similarityScore = Math.max(similarityScore, cityScore);
        reasons.push('同城市');
      }

      if (hotelName && opp.hotel_name) {
        const hotelSim = calculateSimilarity(hotelName, opp.hotel_name);
        if (hotelSim > 0.6) {
          similarityScore = Math.max(similarityScore, hotelSim);
          reasons.push(`酒店名相似度 ${Math.round(hotelSim * 100)}%`);
        }
      }

      if (similarityScore >= threshold) {
        results.push({
          id: opp.id,
          title: opp.title,
          city: opp.city,
          hotelName: opp.hotel_name,
          price: opp.price,
          similarityScore: Math.round(similarityScore * 100) / 100,
          reasons,
          isExact: similarityScore >= 0.9
        });
      }
    }

    results.sort((a, b) => b.similarityScore - a.similarityScore);
    return {
      similar: results.length > 0,
      count: results.length,
      items: results.slice(0, 5),
      threshold
    };
  } catch (error) {
    console.error('[Similarity] Detection error:', error.message);
    return { similar: false, count: 0, items: [], error: error.message };
  }
}