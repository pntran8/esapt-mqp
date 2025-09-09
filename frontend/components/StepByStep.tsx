import * as React from "react";
import {LineType, splitRegExp} from "../src/common/types.ts"

interface Props { items: string; }

type Pair = { step?: LineType; explanation?: LineType; stepNo: number };

function makePairs(items: LineType[]): Pair[] {
    const pairs: Pair[] = [];
    let stepNo = 0;
    let open: Pair | null = null;

    for (const it of items) {
        const t = it.title.toUpperCase();

        if (t === "STEP") {
            if (open && (open.step || open.explanation)) pairs.push(open);
            stepNo += 1;
            open = { step: it, stepNo };
        } else if (t.startsWith("EXPLANATION")) {
            if (!open) {
                stepNo += 1;
                open = { stepNo };
            }
            open.explanation = it;
        }
    }
    if (open && (open.step || open.explanation)) pairs.push(open);
    return pairs;
}

const stripSqlFences = (text?: string) => {
    if (!text) return "";
    const parts = text.split("```sql");
    if (parts.length > 1) {
        const afterSql = parts[1].split("```")[0];
        return afterSql.trim();
    }
    return text;
};

function renderExplanation(text?: string) {
    if (!text) return null;

    const regex = /`([^`]+)`/g;
    const parts: React.ReactNode[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        // push text before this match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        // push code span
        parts.push(
            <code
                key={parts.length}
            >
                {match[1]}
            </code>
        );
        lastIndex = regex.lastIndex;
    }

    // push any remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
}

const LineTypeRenderer: React.FC<Props> = ({ items }) => {
    const allLines = splitRegExp(items);
    const pairs = React.useMemo(() => makePairs(allLines), [allLines]);

    return (
        <div className="space-y-6">
            <table className="min-w-full border-collapse border border-gray-300">
                <colgroup>
                    <col className="w-[45%]" />
                    <col />
                </colgroup>
                <thead>
                <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left">Step</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Explanation</th>
                </tr>
                </thead>
                <tbody>
                {pairs.map((p, idx) => (
                    <tr key={idx}>
                        <td className="border border-gray-300 px-3 py-2"><pre
                            style={{
                                margin: 0,
                                fontSize: '20px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {stripSqlFences(p.step?.line)}
                    </pre></td>
                        <td className="border border-gray-300 px-3 py-2 whitespace-pre-line">
                            {renderExplanation(p.explanation?.line)}
                        </td>

                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default LineTypeRenderer;