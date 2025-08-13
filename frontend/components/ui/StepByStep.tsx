import * as React from "react";

interface LineType { line: string; title: string; }
interface Props { items: LineType[]; }

type Pair = { step?: LineType; explanation?: LineType; stepNo: number };

function makePairs(items: LineType[]): Pair[] {
  const pairs: Pair[] = [];
  let stepNo = 0;
  let open: Pair | null = null;

  for (const it of items) {
    const t = it.title.toUpperCase();

    if (t === "STEP") {
      // close previous pair if any
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
  if (!text) return ""; // handle undefined/null gracefully
  const parts = text.split("```sql");
  if (parts.length > 1) {
    const afterSql = parts[1].split("```")[0];
    return afterSql.trim();
  }
  return text;
};


const LineTypeRenderer: React.FC<Props> = ({ items }) => {
  const pairs = React.useMemo(() => makePairs(items), [items]);

  // Optional: show RECOGNIZED full width above
  const recognized = items.filter(i => i.title.toUpperCase() === "RECOGNIZED");

  return (
      <div className="space-y-6">
        {recognized.map((r, i) => (
            <section key={`rec-${i}`}>
              <h4>RECOGNIZED FROM IMAGE</h4>
              <pre><code>{r.line}</code></pre>
            </section>
        ))}

        {pairs.map((p) => (
            <div
                key={p.stepNo}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  alignItems: "start",
                }}
            >
              <section>
                <h4>STEP {p.stepNo}</h4>
                <pre><code>{stripSqlFences(p.step?.line) ?? "—"}</code></pre>
              </section>

              <section>
                <h4>EXPLANATION {p.stepNo}</h4>
                <pre><code>{p.explanation?.line ?? "No explanation provided."}</code></pre>
              </section>
            </div>
        ))}
      </div>
  );
};

export default LineTypeRenderer;
