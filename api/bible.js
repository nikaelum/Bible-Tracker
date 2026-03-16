// /api/bible.js — v2 with debugging + free fallback

const BOOK_ID_MAP = {
    "Genesis":"GEN","Exodus":"EXO","Leviticus":"LEV","Numbers":"NUM",
    "Deuteronomy":"DEU","Joshua":"JOS","Judges":"JDG","Ruth":"RUT",
    "1 Samuel":"1SA","2 Samuel":"2SA","1 Kings":"1KI","2 Kings":"2KI",
    "1 Chronicles":"1CH","2 Chronicles":"2CH","Ezra":"EZR","Nehemiah":"NEH",
    "Esther":"EST","Job":"JOB","Psalms":"PSA","Proverbs":"PRO",
    "Ecclesiastes":"ECC","Song of Solomon":"SNG","Isaiah":"ISA","Jeremiah":"JER",
    "Lamentations":"LAM","Ezekiel":"EZK","Daniel":"DAN","Hosea":"HOS",
    "Joel":"JOL","Amos":"AMO","Obadiah":"OBA","Jonah":"JON",
    "Micah":"MIC","Nahum":"NAM","Habakkuk":"HAB","Zephaniah":"ZEP",
    "Haggai":"HAG","Zechariah":"ZEC","Malachi":"MAL",
    "Matthew":"MAT","Mark":"MRK","Luke":"LUK","John":"JHN",
    "Acts":"ACT","Romans":"ROM","1 Corinthians":"1CO","2 Corinthians":"2CO",
    "Galatians":"GAL","Ephesians":"EPH","Philippians":"PHP","Colossians":"COL",
    "1 Thessalonians":"1TH","2 Thessalonians":"2TH","1 Timothy":"1TI",
    "2 Timothy":"2TI","Titus":"TIT","Philemon":"PHM","Hebrews":"HEB",
    "James":"JAS","1 Peter":"1PE","2 Peter":"2PE","1 John":"1JN",
    "2 John":"2JN","3 John":"3JN","Jude":"JUD","Revelation":"REV"
};

// Mapping for the free fallback API (bible-api.com uses abbreviated names)
const FREE_API_BOOK_MAP = {
    "Genesis":"Genesis","Exodus":"Exodus","Leviticus":"Leviticus","Numbers":"Numbers",
    "Deuteronomy":"Deuteronomy","Joshua":"Joshua","Judges":"Judges","Ruth":"Ruth",
    "1 Samuel":"1 Samuel","2 Samuel":"2 Samuel","1 Kings":"1 Kings","2 Kings":"2 Kings",
    "1 Chronicles":"1 Chronicles","2 Chronicles":"2 Chronicles","Ezra":"Ezra",
    "Nehemiah":"Nehemiah","Esther":"Esther","Job":"Job","Psalms":"Psalms",
    "Proverbs":"Proverbs","Ecclesiastes":"Ecclesiastes","Song of Solomon":"Song of Solomon",
    "Isaiah":"Isaiah","Jeremiah":"Jeremiah","Lamentations":"Lamentations",
    "Ezekiel":"Ezekiel","Daniel":"Daniel","Hosea":"Hosea","Joel":"Joel","Amos":"Amos",
    "Obadiah":"Obadiah","Jonah":"Jonah","Micah":"Micah","Nahum":"Nahum",
    "Habakkuk":"Habakkuk","Zephaniah":"Zephaniah","Haggai":"Haggai",
    "Zechariah":"Zechariah","Malachi":"Malachi","Matthew":"Matthew","Mark":"Mark",
    "Luke":"Luke","John":"John","Acts":"Acts","Romans":"Romans",
    "1 Corinthians":"1 Corinthians","2 Corinthians":"2 Corinthians",
    "Galatians":"Galatians","Ephesians":"Ephesians","Philippians":"Philippians",
    "Colossians":"Colossians","1 Thessalonians":"1 Thessalonians",
    "2 Thessalonians":"2 Thessalonians","1 Timothy":"1 Timothy","2 Timothy":"2 Timothy",
    "Titus":"Titus","Philemon":"Philemon","Hebrews":"Hebrews","James":"James",
    "1 Peter":"1 Peter","2 Peter":"2 Peter","1 John":"1 John","2 John":"2 John",
    "3 John":"3 John","Jude":"Jude","Revelation":"Revelation"
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { version = 'NLT', book, chapter, debug } = req.query;

    // Debug mode: check if key is configured
    if (debug === 'true') {
        const key = process.env.BIBLE_API_KEY;
        return res.status(200).json({
            keyConfigured: !!key,
            keyLength: key ? key.length : 0,
            keyPreview: key ? key.substring(0, 4) + '...' + key.substring(key.length - 4) : 'NOT SET',
            nltId: process.env.NLT_BIBLE_ID || 'not set (using default)',
            nivId: process.env.NIV_BIBLE_ID || 'not set (using default)',
            kvjId: process.env.KJV_BIBLE_ID || 'not set (using default)',
            esvId: process.env.ESV_BIBLE_ID || 'not set (using default)',
            availableVersions: ['NLT', 'NIV', 'KJV', 'ESV', 'WEB (free fallback)'],
            tip: 'If keyConfigured is false, add BIBLE_API_KEY to Vercel env vars and redeploy.'
        });
    }

    if (!book || !chapter) {
        return res.status(400).json({ error: 'Missing required params: book and chapter' });
    }

    const BIBLE_API_KEY = process.env.BIBLE_API_KEY;

    // ============================================
    // STRATEGY: Try API.Bible first. If no key or 
    // it fails, fall back to free bible-api.com
    // ============================================

    // If we have an API key, try API.Bible (supports NLT, NIV, ESV, KJV)
    if (BIBLE_API_KEY && BIBLE_API_KEY.trim().length > 0) {
        const result = await tryApiBible(BIBLE_API_KEY.trim(), version, book, chapter);
        if (result.success) {
            return res.status(200).json(result.data);
        }
        // If API.Bible failed, log the error and try fallback
        console.error('API.Bible failed:', result.error);
        
        // For NLT/NIV specifically, we can't fall back to free APIs (copyrighted)
        if (version === 'NLT' || version === 'NIV' || version === 'ESV') {
            return res.status(result.status || 500).json({ 
                error: result.error,
                hint: `${version} requires a valid API.Bible key. Visit /api/bible?debug=true to check your configuration.`
            });
        }
    }

    // No API key or using a free version — use free fallback
    if (!BIBLE_API_KEY && (version === 'NLT' || version === 'NIV' || version === 'ESV')) {
        return res.status(400).json({
            error: `${version} is a copyrighted translation that requires an API.Bible key. Please configure BIBLE_API_KEY in your Vercel environment variables, or switch to KJV/WEB (free).`,
            setupUrl: 'https://scripture.api.bible',
            debugUrl: '/api/bible?debug=true'
        });
    }

    // Free fallback for KJV and WEB
    const freeResult = await tryFreeApi(version, book, chapter);
    if (freeResult.success) {
        return res.status(200).json(freeResult.data);
    }

    return res.status(500).json({ error: freeResult.error });
}

// ===== API.Bible (paid/licensed translations) =====
async function tryApiBible(apiKey, version, book, chapter) {
    const versionMap = {
        'NLT': process.env.NLT_BIBLE_ID || '65eec8e0b60e656b-01',
        'NIV': process.env.NIV_BIBLE_ID || '78a9f6124f344018-01',
        'KJV': process.env.KJV_BIBLE_ID || 'de4e12af7f28f599-02',
        'ESV': process.env.ESV_BIBLE_ID || '01b29f4b342acc35-01',
    };

    const bibleId = versionMap[version];
    if (!bibleId) {
        return { success: false, status: 400, error: `Unsupported version for API.Bible: ${version}` };
    }

    const bookId = BOOK_ID_MAP[book];
    if (!bookId) {
        return { success: false, status: 400, error: `Unknown book: ${book}` };
    }

    const chapterId = `${bookId}.${chapter}`;
    const apiUrl = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`;

    try {
        const response = await fetch(apiUrl, {
            headers: { 'api-key': apiKey }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let parsedError = '';
            try { parsedError = JSON.parse(errorText).message || errorText; } catch { parsedError = errorText; }

            if (response.status === 401) {
                return { 
                    success: false, 
                    status: 401, 
                    error: `API key is invalid. Go to scripture.api.bible → My Apps → copy the correct key → paste into Vercel env var BIBLE_API_KEY → redeploy. Raw error: ${parsedError}` 
                };
            }
            if (response.status === 403) {
                return { 
                    success: false, 
                    status: 403, 
                    error: `Your API.Bible account doesn't have access to ${version}. Log in to scripture.api.bible → your app → check which Bibles are available. The ${version} ID being used is: ${bibleId}` 
                };
            }
            if (response.status === 404) {
                return { 
                    success: false, 
                    status: 404, 
                    error: `${book} chapter ${chapter} not found in ${version} (Bible ID: ${bibleId}). This ID may be wrong. Set the correct one via ${version}_BIBLE_ID env var.` 
                };
            }
            return { success: false, status: response.status, error: `API.Bible error ${response.status}: ${parsedError}` };
        }

        const data = await response.json();

        return {
            success: true,
            data: {
                content: data.data.content || '',
                reference: data.data.reference || `${book} ${chapter}`,
                copyright: data.data.copyright || `${version} — via API.Bible`,
                version: version,
                bookId: bookId,
                chapter: chapter,
                source: 'api.bible'
            }
        };

    } catch (err) {
        return { success: false, status: 500, error: `Network error calling API.Bible: ${err.message}` };
    }
}

// ===== Free fallback: bible-api.com (KJV, ASV, WEB) =====
async function tryFreeApi(version, book, chapter) {
    // bible-api.com supports: KJV, ASV, BBE, DARBY, WEB, YLT, OEB (and more)
    // Map our version names to theirs
    const freeVersionMap = {
        'KJV': 'kjv',
        'WEB': 'web',       // World English Bible (modern, readable, free)
        'ASV': 'asv',
        'BBE': 'bbe',       // Bible in Basic English
    };

    // Default to WEB if version not available in free API
    const freeVersion = freeVersionMap[version] || 'web';
    const actualVersionName = freeVersion === 'web' ? 'WEB' : version;
    
    const bookName = FREE_API_BOOK_MAP[book] || book;
    const apiUrl = `https://bible-api.com/${encodeURIComponent(bookName)}+${chapter}?translation=${freeVersion}`;

    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            return { success: false, error: `Free Bible API error: ${response.status}` };
        }

        const data = await response.json();

        if (data.error) {
            return { success: false, error: `Free API: ${data.error}` };
        }

        // Convert the verse array to HTML
        let htmlContent = '';
        if (data.verses && data.verses.length > 0) {
            htmlContent = data.verses.map(v => 
                `<p><span class="v">${v.verse}</span>${v.text.trim()}</p>`
            ).join('');
        } else if (data.text) {
            htmlContent = `<p>${data.text}</p>`;
        }

        const copyrightNote = freeVersion === 'web' 
            ? 'World English Bible (WEB) — Public Domain. Free fallback; configure API.Bible key for NLT/NIV.'
            : freeVersion === 'kjv'
            ? 'King James Version (KJV) — Public Domain.'
            : `${actualVersionName} — Public Domain.`;

        return {
            success: true,
            data: {
                content: htmlContent,
                reference: data.reference || `${book} ${chapter}`,
                copyright: copyrightNote,
                version: actualVersionName,
                bookId: BOOK_ID_MAP[book] || '',
                chapter: chapter,
                source: 'bible-api.com (free)'
            }
        };

    } catch (err) {
        return { success: false, error: `Free Bible API network error: ${err.message}` };
    }
}
