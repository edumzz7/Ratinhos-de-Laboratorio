export function generateImagePath(title: string, explicitUrl?: string | null): string {
    if (explicitUrl && explicitUrl.trim() !== '') {
        return explicitUrl.trim();
    }

    const slug = title
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
        .replace(/(^-|-$)/g, '');        // Trim hyphens from ends

    return `/posters/${slug}.jpg`;
}

