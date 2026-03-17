const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function executeJavaCode(code: string): Promise<{ commands: any[]; code?: string }> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
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
