// vault.ts - handles loading of vault markdown content
// this uses Vite's glob import to bundle the markdown files directly
// so we don't need to fetch them over the network (which was causing 404s)

// Eagerly load all markdown files from the vault directory
// distinct from the rest of the app to keep main bundle size reasonable-ish
const vaultFiles = import.meta.glob('../vault/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/**
 * Get the content of a vault file by its filename
 * @param filename - The filename (e.g. 'food.md') relative to vault/
 * @returns The raw markdown content or null if not found
 */
export function getVaultContent(filename: string): string | null {
    // try to find the file key in the glob results
    // keys in glob are relative to this file, so '../vault/food.md'
    const key = `../vault/${filename}`;

    // if key exists, return the content
    if (vaultFiles[key]) {
        return vaultFiles[key];
    }

    // try with just filename if full path wasn't matched
    // this helps if we just pass 'food.md'
    const normalizedKey = Object.keys(vaultFiles).find(k => k.endsWith(`/${filename}`));
    if (normalizedKey) {
        return vaultFiles[normalizedKey];
    }

    console.warn(`Vault file not found: ${filename}`);
    return null;
}
