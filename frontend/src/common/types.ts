export interface LineType { line: string; title: string; }

export function splitRegExp(explanation: string): LineType[] {
    const lines = explanation.split(/\r?\n/);
    const allLines: LineType[] = [];

    let currentTitle: LineType["title"] = "UNKNOWN TITLE";
    let currentSection: string[] = [];

    const flush = () => {
        const text = currentSection.join("\n").trim();
        if (text) allLines.push({ line: text, title: currentTitle });
        currentSection = [];
    };

    for (const raw of lines) {
        if (raw.startsWith("===")) {
            flush();
            if (/^===\s*RECOGNIZED/.test(raw)) currentTitle = "RECOGNIZED";
            else if (/^===\s*EXPLANATION/.test(raw)) currentTitle = "EXPLANATION";
            else if (/^===\s*STEP/.test(raw)) currentTitle = "STEP";
            else currentTitle = "UNKNOWN TITLE";
            continue;
        }
        currentSection.push(raw);
    }
    flush();
    return allLines;
}