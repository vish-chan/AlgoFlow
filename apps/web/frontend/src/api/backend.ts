const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Problem {
    id: number;
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    category: string;
    description: string;
    examples: string[];
    leetcodeUrl: string;
    starterCode: string;
}

let problemsCache: Problem[] | null = null;

export async function fetchProblems(): Promise<Problem[]> {
    if (problemsCache) return problemsCache;
    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}/problems`);
    } catch {
        throw new Error('Backend unreachable — try again in ~30s');
    }
    if (!response.ok) throw new Error('Failed to fetch problems');
    problemsCache = await response.json();
    return problemsCache!;
}

export async function executeCode(code: string, language: string = 'java'): Promise<{ commands: any[]; code?: string }> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language }),
        });
    } catch {
        throw new Error('Backend\'s taking a nap 😴 — it runs on Railway free tier so it may be down or overloaded. Please try again in ~30s, or reach out via GitHub: https://github.com/vish-chan/AlgoFlow');
    }

    const data = await response.json();
    if (!response.ok || data.error) {
        throw new Error(data.error || `Execution failed: ${response.statusText}`);
    }
    return { commands: data.commands || data, code: data.code };
}

/** @deprecated Use executeCode instead */
export const executeJavaCode = executeCode;
