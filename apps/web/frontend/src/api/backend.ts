const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function executeJavaCode(code: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });

    if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.commands || data;
}
