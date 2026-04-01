export type { Problem } from "../api/backend";

export function getCategories(problems: { category: string }[]): string[] {
    return [...new Set(problems.map(p => p.category))];
}
