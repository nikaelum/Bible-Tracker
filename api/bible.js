// /api/bible.js - v4
// Fixed: live key test in debug mode, better key sanitization, correct NLT ID

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

    // ==== DEBUG MODE ====
    // Visit /api/bible?debug=true to diagnose your key
    if (debug === 'true') {
        const rawKey = process.env.BIBLE_API_KEY;
        const trimmedKey = rawKey ? rawKey.trim() : null;

        // Show first 8 chars so you can verify the leading character
        const keyStart = trimmedKey ? trimmedKey.substring(0, 8) : 'NOT SET';
        const keyEnd   = trimmedKey ? trimmedKey.substring(trimmedKey.length - 4) : '';

        // Live test against API.Bible - tells you right away if the key works
        let liveApiTest = 'skipped - no key configured';
        if (trimmedKey) {
            try {
                const testRes = await fetch(
                    'https://api.scripture.api.bible/v1/bibles?language=eng',
                    { headers: { 'api-key': trimmedKey } }
                );
                const body = await testRes.text();
                if (testRes.ok) {
                    liveApiTest = 'SUCCESS ' + testRes.status + ' - key is valid and working!';
                } else {
                    liveApiTest = 'FAILED ' + testRes.status + ' - ' + body.substring(0, 300);
                }
            } catch (e) {
                liveApiTest = 'Network error: ' + e.message;
            }
        }

        return res.status(200).json({
            keyConfigured: !!trimmedKey,
            rawKeyLength: rawKey ? rawKey.length : 0,
            trimmedKeyLength: trimmedKey ? trimmedKey.length : 0,
            keyStart: keyStart,
            keyEnd: keyEnd,
            liveApiTest: liveApiTest,
            nltId: process.env.NLT_BIBLE_ID || 'using default: d6e14a625393b4da-01',
            nivId: process.env.NIV_BIBLE_ID || 'using default: 78a9f6124f344018-01',
            kjvId: process.env.KJV_BIBLE_ID || 'using default: de4e12af7f28f599-02',
            esvId: process.env.ESV_BIBLE_ID || 'using default: 01b29f4b342acc35-01',
            endpoint: 'https://api.scripture.api.bible/v1',
            tip: 'If liveApiTest shows FAILED 401: delete BIBLE_API_KEY in Vercel and re-enter it manually. Your key starts with a dash (-) which is valid but can be dropped when copy-pasting.'
        });
    }

    if (!book || !chapter) {
        return res.status(400).json({ error: 'Missing required params: book and chapter' });
    }

    // Sanitize key - trim whitespace, quotes that might sneak in
    const BIBLE_API_KEY = process.env.BIBLE_API_KEY
        ? process.env.BIBLE_API_KEY.trim().replace(/^["']|["']$/g, '')
        : null;

    const requiresKey = ['NLT', 'NIV', 'ESV'].includes(version);

    if (requiresKey && !BIBLE_API_KEY) {
        return res.status(400).json({
            error: version + ' is a copyrighted translation that requires an API.Bible key. Please configure BIBLE_API_KEY in your Vercel environment variables, or switch to KJV/WEB (free).',
            setupUrl: 'https://scripture.api.bible',
            hint: 'Visit /api/bible?debug=true to check your configuration.'
        });
    }

    // Try API.Bible for licensed versions
    if (BIBLE_API_KEY) {
        const result = await tryApiBible(BIBLE_API_KEY, version, book, chapter);
        if (result.success) return res.status(200).json(result.data);

        console.error('API.Bible failed:', result.error);

        if (requiresKey) {
            return res.status(result.status || 500).json({
                error: result.error,
                hint: version + ' requires a valid API.Bible key. Visit /api/bible?debug=true to check your configuration.'
            });
        }
        // KJV failed via API.Bible - fall through to free
    }

    // Free fallback for KJV and WEB
    const freeResult = await tryFreeApi(version, book, chapter);
    if (freeResult.success) return res.status(200).json(freeResult.data);

    return res.status(500).json({ error: freeResult.error });
}

// ==== API.Bible (licensed translations) ====
async function tryApiBible(apiKey, version, book, chapter) {
    // NLT ID default updated to match the ID shown in your Vercel dashboard
    const versionMap = {
        'NLT': process.env.NLT_BIBLE_ID || 'd6e14a625393b4da-01',
        'NIV': process.env.NIV_BIBLE_ID || '78a9f6124f344018-01',
        'KJV': process.env.KJV_BIBLE_ID || 'de4e12af7f28f599-02',
        'ESV': process.env.ESV_BIBLE_ID || '01b29f4b342acc35-01',
    };

    const bibleId = versionMap[version];
    if (!bibleId) {
        return { success: false, status: 400, error: 'Unsupported version for API.Bible: ' + version };
    }

    const bookId = BOOK_ID_MAP[book];
    if (!bookId) {
        return { success: false, status: 400, error: 'Unknown book: ' + book };
    }

    const chapterId = bookId + '.' + chapter;
    const apiUrl = 'https://api.scripture.api.bible/v1/bibles/' + bibleId + '/chapters/' + chapterId + '?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true';

    try {
        const response = await fetch(apiUrl, {
            headers: { 'api-key': apiKey }
        });

        if (!response.ok) {
            let parsedError = '';
            try {
                const errorBody = await response.json();
                parsedError = errorBody.message || errorBody.error || JSON.stringify(errorBody);
            } catch (_) {
                parsedError = await response.text();
            }

            if (response.status === 401) {
                return {
                    success: false, status: 401,
                    error: 'API key rejected (401). Go to scripture.api.bible -> My Apps -> copy your key exactly -> update BIBLE_API_KEY in Vercel -> redeploy. Server said: ' + parsedError
                };
            }
            if (response.status === 403) {
                return {
                    success: false, status: 403,
                    error: 'Access denied to ' + version + ' (403). Your account may not have access to Bible ID: ' + bibleId + '. Log in to scripture.api.bible -> your app -> Bibles to find your available IDs, then set ' + version + '_BIBLE_ID in Vercel env vars.'
                };
            }
            if (response.status === 404) {
                return {
                    success: false, status: 404,
                    error: book + ' chapter ' + chapter + ' not found (404) using Bible ID: ' + bibleId + '. Set the correct ID via ' + version + '_BIBLE_ID in Vercel env vars.'
                };
            }
            return { success: false, status: response.status, error: 'API.Bible returned ' + response.status + ': ' + parsedError };
        }

        const data = await response.json();

        return {
            success: true,
            data: {
                content: data.data.content || '',
                reference: data.data.reference || book + ' ' + chapter,
                copyright: data.data.copyright || version + ' via API.Bible',
                version: version,
                bookId: bookId,
                chapter: chapter,
                source: 'api.bible'
            }
        };

    } catch (err) {
        return { success: false, status: 500, error: 'Network error calling API.Bible: ' + err.message };
    }
}

// ==== Free fallback: bible-api.com (KJV, WEB - public domain) ====
async function tryFreeApi(version, book, chapter) {
    const freeVersionMap = { 'KJV': 'kjv', 'WEB': 'web', 'ASV': 'asv' };
    const freeVersion = freeVersionMap[version] || 'web';
    const displayVersion = freeVersion.toUpperCase();

    const bookName = FREE_API_BOOK_MAP[book] || book;
    const apiUrl = 'https://bible-api.com/' + encodeURIComponent(bookName) + '+' + chapter + '?translation=' + freeVersion;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return { success: false, error: 'Free Bible API error: ' + response.status };
        }

        const data = await response.json();
        if (data.error) {
            return { success: false, error: 'Free API: ' + data.error };
        }

        let htmlContent = '';
        if (data.verses && data.verses.length > 0) {
            htmlContent = data.verses.map(function(v) {
                return '<p><span class="v">' + v.verse + '</span>' + v.text.trim() + '</p>';
            }).join('');
        } else if (data.text) {
            htmlContent = '<p>' + data.text + '</p>';
        }

        const copyrightNote = freeVersion === 'kjv'
            ? 'King James Version (KJV) - Public Domain.'
            : 'World English Bible (WEB) - Public Domain.';

        return {
            success: true,
            data: {
                content: htmlContent,
                reference: data.reference || book + ' ' + chapter,
                copyright: copyrightNote,
                version: displayVersion,
                bookId: BOOK_ID_MAP[book] || '',
                chapter: chapter,
                source: 'bible-api.com (free)'
            }
        };

    } catch (err) {
        return { success: false, error: 'Free Bible API network error: ' + err.message };
    }
}
