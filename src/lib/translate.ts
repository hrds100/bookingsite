const cache = new Map<string, string>();

function cacheKey(text: string, targetLang: string): string {
  return `${targetLang}::${text}`;
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (targetLang === 'en') return text;

  const key = cacheKey(text, targetLang);
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) return text;

    const data = await res.json();
    const translated: string = data?.[0]
      ?.map((chunk: [string]) => chunk[0])
      .join('') ?? text;

    cache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang === 'en') return texts;
  return Promise.all(texts.map(t => translateText(t, targetLang)));
}
