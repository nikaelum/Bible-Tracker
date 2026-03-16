// /api/bible.js
// Fetches Bible text from API.Bible (scripture.api.bible)
// Required env vars: BIBLE_API_KEY
// Optional env vars: NLT_BIBLE_ID, NIV_BIBLE_ID, KJV_BIBLE_ID, ESV_BIBLE_ID

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

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { version = 'NLT', book, chapter } = req.query;

    if (!book || !chapter) {
        return res.status(400).json({ error: 'Missing required params: book, chapter' });
    }

    const BIBLE_API_KEY = process.env.BIBLE_API_KEY;
    if (!BIBLE_API_KEY) {
        return res.status(500).json({ 
            error: 'BIBLE_API_KEY not configured. Sign up at https://scripture.api.bible and add your key to Vercel environment variables.' 
        });
    }

    // Bible version IDs for API.Bible
    // Users MUST verify these IDs match their API.Bible account permissions.
    // Log in to https://scripture.api.bible/admin/applications to find your available Bible IDs.
    const versionMap = {
        'NLT': process.env.NLT_BIBLE_ID || '65eec8e0b60e656b-01',
        'NIV': process.env.NIV_BIBLE_ID || '78a9f6124f344018-01',
        'KJV': process.env.KJV_BIBLE_ID || 'de4e12af7f28f599-02',
        'ESV': process.env.ESV_BIBLE_ID || '01b29f4b342acc35-01',
    };

    const bibleId = versionMap[version];
    if (!bibleId) {
        return res.status(400).json({ error: `Unsupported version: ${version}. Available: ${Object.keys(versionMap).join(', ')}` });
    }

    const bookId = BOOK_ID_MAP[book];
    if (!bookId) {
        return res.status(400).json({ error: `Unknown book: ${book}` });
    }

    const chapterId = `${bookId}.${chapter}`;

    try {
        const apiUrl = `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`;
        
        const response = await fetch(apiUrl, {
            headers: { 'api-key': BIBLE_API_KEY }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API.Bible error (${response.status}):`, errorBody);
            
            if (response.status === 401) {
                return res.status(401).json({ error: 'Invalid BIBLE_API_KEY. Check your API key at https://scripture.api.bible' });
            }
            if (response.status === 403) {
                return res.status(403).json({ 
                    error: `Access denied for ${version}. This translation may not be available on your API.Bible plan. Check your available Bibles at https://scripture.api.bible/admin/applications` 
                });
            }
            if (response.status === 404) {
                return res.status(404).json({ 
                    error: `${book} ${chapter} not found for ${version}. The Bible ID may be incorrect. Current ${version} ID: ${bibleId}. Update via Vercel env var ${version}_BIBLE_ID.` 
                });
            }
            return res.status(response.status).json({ error: `API.Bible returned status ${response.status}` });
        }

        const data = await response.json();

        return res.status(200).json({
            content: data.data.content,
            reference: data.data.reference,
            copyright: data.data.copyright || '',
            version: version,
            bookId: bookId,
            chapter: chapter
        });

    } catch (err) {
        console.error('Bible API fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch Bible text. Check server logs.' });
    }
}
