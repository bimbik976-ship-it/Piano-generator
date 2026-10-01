import { PIANO_TYPES, CATEGORIES, GENRES, MOODS, isDepressionReliefContext } from '../config/options';

export interface TitleAnalysisResult {
  pianoType: string;
  genre: string;
  categories: string[];
  moods: string[];
  detectedKeywords: string[];
}

/**
 * PETA PIANO AI — Semantic Title Analysis Engine
 *
 * Automatically analyzes a user-provided title and maps it accurately to:
 * 1. Jenis Piano Instrumental (Single-select, strictly 1 from 15)
 * 2. Genre Musik (Single-select, strictly 1 from 13)
 * 3. Kategori Penggunaan (Multi-select, strictly from 24)
 * 4. Mood & Suasana Emosional (Multi-select, strictly from 20)
 *
 * Preserves strict separation between Kategori Penggunaan (listening intent)
 * and Mood (emotional atmosphere), enforces Zero Medical Claims, and avoids
 * weak keyword associations (e.g. water sounds != nature/rain; relaxing != healing).
 */
export function analyzeTitleToParameters(title: string): TitleAnalysisResult {
  if (!title || typeof title !== 'string' || !title.trim()) {
    return {
      pianoType: 'Relaxing Piano',
      genre: 'Ambient Piano',
      categories: ['Relaxation', 'Sleep', 'Peaceful'],
      moods: ['Calm', 'Peaceful', 'Relaxing'],
      detectedKeywords: [],
    };
  }

  const cleanTitle = title.trim();
  const lower = cleanTitle.toLowerCase();
  const detectedKeywords: string[] = [];

  // Helper word boundary check
  const hasWord = (wordOrPhrase: string): boolean => {
    const escaped = wordOrPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  };

  const hasAny = (list: string[]): boolean => {
    return list.some((term) => hasWord(term));
  };

  // ==================================================
  // 1. JENIS PIANO (Single Select — 15 Options)
  // ==================================================
  // Priority: Choose the one that best describes the piano character.
  // Explicit "X piano" phrases take first precedence.
  let selectedPianoType = '';

  if (hasAny(['felt piano', 'felt upright', 'felted piano', 'soft felt'])) {
    selectedPianoType = 'Felt Piano';
    detectedKeywords.push('felt piano');
  } else if (hasAny(['relaxing piano', 'relaxing piano music'])) {
    selectedPianoType = 'Relaxing Piano';
    detectedKeywords.push('relaxing piano');
  } else if (hasAny(['sleep piano', 'sleeping piano', 'slumber piano'])) {
    selectedPianoType = 'Sleep Piano';
    detectedKeywords.push('sleep piano');
  } else if (hasAny(['meditation piano', 'meditative piano', 'zen piano'])) {
    selectedPianoType = 'Meditative Piano';
    detectedKeywords.push('meditative piano');
  } else if (hasAny(['study piano', 'studying piano', 'homework piano'])) {
    selectedPianoType = 'Study Piano';
    detectedKeywords.push('study piano');
  } else if (hasAny(['peaceful piano'])) {
    selectedPianoType = 'Peaceful Piano';
    detectedKeywords.push('peaceful piano');
  } else if (hasAny(['healing piano'])) {
    selectedPianoType = 'Healing Piano';
    detectedKeywords.push('healing piano');
  } else if (hasAny(['focus piano', 'deep focus piano', 'concentration piano'])) {
    selectedPianoType = 'Focus Piano';
    detectedKeywords.push('focus piano');
  } else if (hasAny(['cinematic piano', 'movie piano', 'soundtrack piano'])) {
    selectedPianoType = 'Cinematic Piano';
    detectedKeywords.push('cinematic piano');
  } else if (hasAny(['romantic piano', 'love piano'])) {
    selectedPianoType = 'Romantic Piano';
    detectedKeywords.push('romantic piano');
  } else if (hasAny(['emotional piano', 'sad piano', 'heartfelt piano'])) {
    selectedPianoType = 'Emotional Piano';
    detectedKeywords.push('emotional piano');
  } else if (hasAny(['background piano', 'bgm piano'])) {
    selectedPianoType = 'Background Piano';
    detectedKeywords.push('background piano');
  } else if (hasAny(['ambient piano'])) {
    selectedPianoType = 'Ambient Piano';
    detectedKeywords.push('ambient piano');
  } else if (hasAny(['solo piano'])) {
    selectedPianoType = 'Solo Piano';
    detectedKeywords.push('solo piano');
  } else if (hasAny(['acoustic piano', 'grand piano', 'baby grand', 'upright piano'])) {
    selectedPianoType = 'Acoustic Piano';
    detectedKeywords.push('acoustic piano');
  }

  // If no explicit "X piano" phrase was found, infer dominant piano character
  if (!selectedPianoType) {
    if (hasAny(['felt', 'felted', 'intimate felt', 'muffled pedal'])) {
      selectedPianoType = 'Felt Piano';
    } else if (hasAny(['cinematic', 'film score', 'trailer', 'epic soundtrack'])) {
      selectedPianoType = 'Cinematic Piano';
    } else if (hasAny(['deep sleep', 'fall asleep', 'sleeping', 'bedtime', 'insomnia', 'tidur lelap'])) {
      selectedPianoType = 'Sleep Piano';
    } else if (hasAny(['meditation', 'meditate', 'zen', 'chakra', 'mindfulness', 'meditasi'])) {
      selectedPianoType = 'Meditative Piano';
    } else if (hasAny(['study', 'studying', 'exam', 'reading music', 'belajar'])) {
      selectedPianoType = 'Study Piano';
    } else if (hasAny(['deep focus', 'concentration', 'focus', 'fokus'])) {
      selectedPianoType = 'Focus Piano';
    } else if (hasAny(['healing', 'self-healing', 'emotional recovery', 'pemulihan'])) {
      selectedPianoType = 'Healing Piano';
    } else if (hasAny(['peaceful', 'inner peace', 'kedamaian'])) {
      selectedPianoType = 'Peaceful Piano';
    } else if (hasAny(['romantic', 'romance', 'love story', 'candlelight'])) {
      selectedPianoType = 'Romantic Piano';
    } else if (hasAny(['emotional', 'sad', 'heartbreak', 'sorrow', 'tears', 'crying'])) {
      selectedPianoType = 'Emotional Piano';
    } else if (hasAny(['background music', 'bgm', 'background ambience'])) {
      selectedPianoType = 'Background Piano';
    } else if (hasAny(['ambient', 'atmospheric', 'soundscape'])) {
      selectedPianoType = 'Ambient Piano';
    } else if (hasAny(['solo', 'pure piano'])) {
      selectedPianoType = 'Solo Piano';
    } else if (hasAny(['relaxing', 'relaxation', 'calming', 'santai'])) {
      selectedPianoType = 'Relaxing Piano';
    } else {
      selectedPianoType = 'Relaxing Piano';
    }
  }

  // Ensure validity against PIANO_TYPES
  if (!PIANO_TYPES.includes(selectedPianoType)) {
    selectedPianoType = 'Relaxing Piano';
  }

  // ==================================================
  // 2. GENRE MUSIK (Single Select — 13 Options)
  // ==================================================
  let selectedGenre = '';

  if (hasAny(['lo-fi', 'lofi', 'chillhop', 'lo fi'])) {
    selectedGenre = 'Lo-Fi Piano';
    detectedKeywords.push('lo-fi');
  } else if (hasAny(['jazz', 'smooth jazz', 'bossa', 'swing'])) {
    selectedGenre = 'Jazz Piano';
    detectedKeywords.push('jazz');
  } else if (hasAny(['blues', 'bluesy'])) {
    selectedGenre = 'Blues Piano';
    detectedKeywords.push('blues');
  } else if (hasAny(['neo soul', 'neo-soul'])) {
    selectedGenre = 'Neo Soul Piano';
    detectedKeywords.push('neo soul');
  } else if (hasAny(['soul piano', 'soul music', 'soulful'])) {
    selectedGenre = 'Soul Piano';
    detectedKeywords.push('soul');
  } else if (hasAny(['minimal', 'minimalist', 'minimalism', 'sparse'])) {
    selectedGenre = 'Minimal Piano';
    detectedKeywords.push('minimal');
  } else if (hasAny(['cinematic', 'soundtrack', 'film score', 'movie', 'orchestral'])) {
    selectedGenre = 'Cinematic Piano';
    detectedKeywords.push('cinematic');
  } else if (hasAny(['new age', 'new-age', 'spiritual'])) {
    selectedGenre = 'New Age';
    detectedKeywords.push('new age');
  } else if (hasAny(['atmospheric', 'ethereal', 'reverb washed', 'airy'])) {
    selectedGenre = 'Atmospheric Piano';
    detectedKeywords.push('atmospheric');
  } else if (hasAny(['meditative piano', 'guided meditation', 'zen meditation'])) {
    selectedGenre = 'Meditative Piano';
    detectedKeywords.push('meditative');
  } else if (hasAny(['ambient piano', 'ambient', 'water sounds', 'bamboo water', 'calming water', 'nature sounds', 'white noise', 'pink noise', 'soundscape'])) {
    selectedGenre = 'Ambient Piano';
    detectedKeywords.push('ambient');
  } else if (hasAny(['modern piano', 'modern classical', 'contemporary classical', 'neoclassical'])) {
    selectedGenre = 'Modern Piano';
    detectedKeywords.push('modern');
  } else if (hasAny(['acoustic piano', 'pure piano', 'unplugged'])) {
    selectedGenre = 'Acoustic Piano';
    detectedKeywords.push('acoustic');
  }

  // Fallback based on overall title context
  if (!selectedGenre) {
    if (hasAny(['sleep', 'deep sleep', 'water sounds', 'bamboo', 'rain', 'soundscape', 'peaceful ambience'])) {
      selectedGenre = 'Ambient Piano';
    } else if (hasAny(['meditation', 'zen', 'chakra', 'mindfulness'])) {
      selectedGenre = 'Meditative Piano';
    } else if (hasAny(['film', 'cinematic', 'story', 'journey'])) {
      selectedGenre = 'Cinematic Piano';
    } else if (hasAny(['simple', 'clean', 'pure', 'minimal'])) {
      selectedGenre = 'Minimal Piano';
    } else {
      selectedGenre = 'Ambient Piano';
    }
  }

  if (!GENRES.includes(selectedGenre)) {
    selectedGenre = 'Ambient Piano';
  }

  // ==================================================
  // 3. KATEGORI PENGGUNAAN (Multi Select — 24 Options)
  // ==================================================
  // Rule: Choose ALL categories clearly supported by context.
  // DO NOT add solely due to weak word associations!
  // - No "Nature" solely because of "Water Sounds"
  // - No "Rain" because of water sounds
  // - No "Healing" because music is relaxing
  // - No "Anxiety Relief" without anxiety context
  // - No "Depression Relief" without depression context
  const selectedCategories: string[] = [];

  // Relaxation
  if (hasAny(['relax', 'relaxing', 'relaxation', 'santai', 'relaxar', 'unwind'])) {
    selectedCategories.push('Relaxation');
    detectedKeywords.push('relaxation');
  }

  // Sleep
  if (hasAny(['sleep', 'sleeping', 'sleep music', 'deep sleep', 'fall asleep', 'insomnia', 'tidur', 'bedtime', 'slumber'])) {
    selectedCategories.push('Sleep');
    detectedKeywords.push('sleep');
  }

  // Meditation
  if (hasAny(['meditation', 'meditate', 'meditative', 'zen', 'chakra', 'meditasi'])) {
    selectedCategories.push('Meditation');
    detectedKeywords.push('meditation');
  }

  // Healing (EXPLICIT ONLY: do not select just because it's relaxing!)
  if (hasAny(['healing', 'heal', 'self-healing', 'curative', 'pemulihan', 'penyembuhan'])) {
    selectedCategories.push('Healing');
    detectedKeywords.push('healing');
  }

  // Stress Relief (EXPLICIT ONLY)
  if (hasAny(['stress relief', 'anti stress', 'de-stress', 'destress', 'relieve stress', 'stress reduction', 'redakan stres', 'anti-stress'])) {
    selectedCategories.push('Stress Relief');
    detectedKeywords.push('stress relief');
  }

  // Anxiety Relief (EXPLICIT ONLY)
  if (hasAny(['anxiety', 'anxiety relief', 'anti anxiety', 'panic attack', 'calm anxiety', 'redakan cemas', 'anti-anxiety'])) {
    selectedCategories.push('Anxiety Relief');
    detectedKeywords.push('anxiety relief');
  }

  // Depression Relief (Strict Section 5 rule: only explicit depression/emotional recovery/healing)
  if (isDepressionReliefContext(cleanTitle)) {
    selectedCategories.push('Depression Relief');
    detectedKeywords.push('depression relief');
  }

  // Study
  if (hasAny(['study', 'studying', 'study music', 'belajar', 'exam', 'school', 'college', 'homework', 'tugas'])) {
    selectedCategories.push('Study');
    detectedKeywords.push('study');
  }

  // Deep Focus
  if (hasAny(['deep focus', 'focus music', 'focus', 'hyperfocus', 'fokus mendalam', 'fokus'])) {
    selectedCategories.push('Deep Focus');
    detectedKeywords.push('deep focus');
  }

  // Concentration
  if (hasAny(['concentration', 'concentrate', 'konsentrasi'])) {
    selectedCategories.push('Concentration');
    detectedKeywords.push('concentration');
  }

  // Romantic
  if (hasAny(['romantic', 'romance', 'candlelight dinner', 'date night', 'love story', 'valentine', 'romantis'])) {
    selectedCategories.push('Romantic');
    detectedKeywords.push('romantic');
  }

  // Emotional (Category intent)
  if (hasAny(['emotional journey', 'emotional release', 'deeply emotional', 'emotional depth', 'perjalanan emosional'])) {
    selectedCategories.push('Emotional');
    detectedKeywords.push('emotional');
  }

  // Nature (MUST be explicit nature theme, NOT just "water sounds" or water FX!)
  if (hasAny(['nature', 'forest', 'woodland', 'mountain', 'wild nature', 'alam liar', 'suasana alam', 'nature ambience'])) {
    selectedCategories.push('Nature');
    detectedKeywords.push('nature');
  }

  // Rain (MUST explicitly mention rain, NOT just "water sounds"!)
  if (hasAny(['rain', 'rainy', 'rainfall', 'rainstorm', 'hujan', 'rain sounds'])) {
    selectedCategories.push('Rain');
    detectedKeywords.push('rain');
  }

  // Peaceful
  if (hasAny(['peaceful', 'peace of mind', 'inner peace', 'kedamaian', 'peaceful piano'])) {
    selectedCategories.push('Peaceful');
    detectedKeywords.push('peaceful');
  }

  // Morning
  if (hasAny(['morning', 'sunrise', 'wake up', 'pagi', 'good morning', 'dawn'])) {
    selectedCategories.push('Morning');
    detectedKeywords.push('morning');
  }

  // Night
  if (hasAny(['night', 'late night', 'midnight', 'malam', 'evening', 'good night'])) {
    selectedCategories.push('Night');
    detectedKeywords.push('night');
  }

  // Deep Rest
  if (hasAny(['deep rest', 'restful', 'restoration', 'istirahat total', 'istirahat lelap'])) {
    selectedCategories.push('Deep Rest');
    detectedKeywords.push('deep rest');
  }

  // Spa
  if (hasAny(['spa', 'massage', 'salon', 'pijat', 'sauna'])) {
    selectedCategories.push('Spa');
    detectedKeywords.push('spa');
  }

  // Wellness
  if (hasAny(['wellness', 'well-being', 'kebugaran batin', 'wellbeing'])) {
    selectedCategories.push('Wellness');
    detectedKeywords.push('wellness');
  }

  // Mindfulness
  if (hasAny(['mindfulness', 'mindful', 'mindful breathing', 'kesadaran penuh'])) {
    selectedCategories.push('Mindfulness');
    detectedKeywords.push('mindfulness');
  }

  // Reading
  if (hasAny(['reading', 'read a book', 'library', 'membaca', 'bookworm'])) {
    selectedCategories.push('Reading');
    detectedKeywords.push('reading');
  }

  // Work
  if (hasAny(['work', 'working', 'office', 'coding', 'programming', 'bekerja'])) {
    selectedCategories.push('Work');
    detectedKeywords.push('work');
  }

  // Background Ambience
  if (hasAny(['background music', 'background ambience', 'bgm', 'ambient background', 'musik latar'])) {
    selectedCategories.push('Background Ambience');
    detectedKeywords.push('background ambience');
  }

  // Final category filter against CATEGORIES
  const filteredCategories = selectedCategories.filter((c) => CATEGORIES.includes(c));
  const finalCategories = filteredCategories.length > 0 ? filteredCategories : ['Relaxation'];

  // ==================================================
  // 4. MOOD & SUASANA EMOSIONAL (Multi Select — 20 Options)
  // ==================================================
  // Rule: Choose moods based on the emotional atmosphere genuinely conveyed.
  // Negative rules:
  // - No Romantic without romance
  // - No Melancholic without melancholy/sadness
  // - No Emotional just because of piano
  // - No Healing just because of relaxing
  // - No Uplifting without positive/bright context
  // - No Nostalgic without nostalgia/memories
  const selectedMoods: string[] = [];

  // Calm
  if (hasAny(['calm', 'calming', 'tenang', 'tranquil', 'tranquility', 'stillness'])) {
    selectedMoods.push('Calm');
  }

  // Peaceful (calm water sounds + sleep/meditation conveys peaceful mood)
  if (
    hasAny(['peaceful', 'peace', 'kedamaian', 'inner peace', 'peace of mind']) ||
    (hasAny(['calming water', 'water sounds']) && hasAny(['sleep', 'meditation']))
  ) {
    selectedMoods.push('Peaceful');
  }

  // Relaxing
  if (hasAny(['relaxing', 'relax', 'relaxation', 'santai', 'relaxed'])) {
    selectedMoods.push('Relaxing');
  }

  // Soothing
  if (hasAny(['soothing', 'sooth', 'menenangkan', 'calming water', 'water sounds', 'gentle water'])) {
    selectedMoods.push('Soothing');
  }

  // Sleepy
  if (hasAny(['sleep', 'sleepy', 'deep sleep', 'fall asleep', 'slumber', 'bedtime', 'lullaby', 'insomnia', 'tidur'])) {
    selectedMoods.push('Sleepy');
  }

  // Meditative
  if (hasAny(['meditation', 'meditative', 'meditate', 'zen', 'mindful', 'chakra'])) {
    selectedMoods.push('Meditative');
  }

  // Deep
  if (hasAny(['deep emotion', 'deep thought', 'deep reflection', 'profound', 'dalam', 'deeply introspective'])) {
    selectedMoods.push('Deep');
  }

  // Gentle
  if (hasAny(['gentle', 'soft', 'delicate', 'lembut', 'whisper', 'soft pedal'])) {
    selectedMoods.push('Gentle');
  }

  // Serene
  if (hasAny(['serene', 'serenity', 'placid', 'hening'])) {
    selectedMoods.push('Serene');
  }

  // Warm
  if (hasAny(['warm', 'warmth', 'cozy', 'fireplace', 'hangat', 'comforting'])) {
    selectedMoods.push('Warm');
  }

  // Dreamy
  if (hasAny(['dreamy', 'dream', 'floating', 'ethereal', 'clouds', 'mimpi', 'lucid'])) {
    selectedMoods.push('Dreamy');
  }

  // Healing (EXPLICIT ONLY)
  if (hasAny(['healing', 'heal', 'restorative', 'pemulihan', 'terapi emosional'])) {
    selectedMoods.push('Healing');
  }

  // Melancholic (EXPLICIT ONLY)
  if (hasAny(['melancholic', 'melancholy', 'sad', 'sorrow', 'grief', 'heartbreak', 'crying', 'tears', 'sedih'])) {
    selectedMoods.push('Melancholic');
  }

  // Emotional (EXPLICIT ONLY)
  if (hasAny(['emotional', 'touching', 'heartfelt', 'tearjerker', 'sentimental', 'terharu', 'mengharukan'])) {
    selectedMoods.push('Emotional');
  }

  // Romantic (EXPLICIT ONLY)
  if (hasAny(['romantic', 'romance', 'love', 'passion', 'cinta', 'sweetheart', 'valentine'])) {
    selectedMoods.push('Romantic');
  }

  // Nostalgic (EXPLICIT ONLY)
  if (hasAny(['nostalgic', 'nostalgia', 'memories', 'childhood', 'kenangan', 'remembering', 'old times'])) {
    selectedMoods.push('Nostalgic');
  }

  // Hopeful (EXPLICIT ONLY)
  if (hasAny(['hopeful', 'hope', 'optimistic', 'harapan', 'new beginning', 'rising'])) {
    selectedMoods.push('Hopeful');
  }

  // Uplifting (EXPLICIT ONLY)
  if (hasAny(['uplifting', 'inspirational', 'inspiring', 'bright', 'semangat', 'joyful', 'happy'])) {
    selectedMoods.push('Uplifting');
  }

  // Intimate
  if (hasAny(['intimate', 'felt piano', 'closeness', 'personal', 'dekat', 'intimacy'])) {
    selectedMoods.push('Intimate');
  }

  // Reflective
  if (hasAny(['reflective', 'reflection', 'contemplation', 'thoughtful', 'renungan', 'introspective'])) {
    selectedMoods.push('Reflective');
  }

  // Final mood filter against MOODS
  const filteredMoods = selectedMoods.filter((m) => MOODS.includes(m));
  const finalMoods = filteredMoods.length > 0 ? filteredMoods : ['Calm', 'Peaceful', 'Relaxing'];

  return {
    pianoType: selectedPianoType,
    genre: selectedGenre,
    categories: finalCategories,
    moods: finalMoods,
    detectedKeywords: Array.from(new Set(detectedKeywords)),
  };
}
