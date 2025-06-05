import React, { useState } from "react";

function App() {
    const [shapes, setShapes] = useState<{ type: string; label: string }[]>([]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const xmlText = event.target?.result as string;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const cells = xmlDoc.getElementsByTagName("mxCell");
            const results: { type: string; label: string }[] = [];

            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                const style = cell.getAttribute("style") || "";
                const value = cell.getAttribute("value") || "";

                if (style.includes("ellipse")) {
                    results.push({ type: "Attribute (Oval)", label: value });
                } else if (style.includes("rectangle")) {
                    results.push({ type: "Entity (Rectangle)", label: value });
                } else if (style.includes("rhombus")) {
                    results.push({ type: "Relationship (Diamond)", label: value });
                }
            }

            setShapes(results);
        };

        reader.readAsText(file);
    };

    return (
        <>
            <h1>??</h1>
            <input type="file" accept=".drawio,.xml" onChange={handleFileUpload} />
            <ul>
                {shapes.map((shape, idx) => (
                    <li key={idx}>
                        <strong>{shape.type}</strong>: {shape.label}
                    </li>
                ))}
            </ul>
        </>
    );
}

export default App;
