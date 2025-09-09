// parseXMLExample.tsx
import React, { useState } from "react";

interface Shape {
    type: "Entity" | "Attribute" | "Relationship" | "Edge" | "Unknown";
    label?: string; // optional
}

// Define the possible shape of a style entry
interface StyleEntry {
    end_style?: string;
    start_style?: string;
    value?: string;
}

interface Example {
    label: string;
    original: string;
    chen: string;
    crow: string;
}

const examples: Example[] = [
    {
        label: "Exactly One",
        original: `<mxCell ... value="1" ... />`,
        chen: `<mxCell ... endArrow=open; ... />`,
        crow: `<mxCell ... endArrow=ERmandOne; ... />`
    },
    {
        label: "One or More",
        original: `<mxCell ... value="N" ... />`,
        chen: `<mxCell ... value="1..*" ... />`,
        crow: `<mxCell ... endArrow=ERmany; ... />`
    }
];


const chenHashMap: Map<string, StyleEntry>= new Map<string, StyleEntry>([
    ["1", {
        end_style: "endArrow=open;endFill=1;startArrow=none;startFill=0;",
        start_style: "endArrow=none;endFill=0;startArrow=open;startFill=1;",
    }],
    ["N", {
        value: "1..*",
    }],
    ["M", {
        value: "1..*",
    }],
]);

const crowHashMap: Map<string, StyleEntry>= new Map<string, StyleEntry>([
    ["1", {
        end_style: "endArrow=ERmandOne;endFill=0;startArrow=none;startFill=0;",
        start_style: "endArrow=none;endFill=0;startArrow=ERmandOne;startFill=0;",
    }],
    ["N", {
        end_style: "endArrow=ERmany;endFill=0;startArrow=none;startFill=0;",
        start_style: "endArrow=none;endFill=0;startArrow=ERmany;startFill=0;",
    }],
    ["M", {
        end_style: "endArrow=ERmany;endFill=0;startArrow=none;startFill=0;",
        start_style: "endArrow=none;endFill=0;startArrow=ERmany;startFill=0;",
    }],
]);

const styleHashmap: Map<string, Map<string, StyleEntry>> = new Map<string, Map<string, StyleEntry>>();
styleHashmap.set("chen(adapted)",chenHashMap)
styleHashmap.set("crow",crowHashMap)



const ConvertXMLNotation: React.FC = () => {
    const [shapes, setShapes] = useState<Map<string,Shape>>();
    const [chenDoc, setChenDoc] = useState<Document | null>(null);
    const [crowDoc, setCrowDoc] = useState<Document | null>(null);

    const downloadXml = (doc: Document, filename: string) => {
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(doc);
        const blob = new Blob([xmlString], { type: "text/xml" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url); // cleanup
    };


    const setArrows = (original: string, newArrows: string): string => {
        // remove old startArrow / endArrow
        const parts = original.split(";").filter(
            (p) =>
                p &&
                !p.startsWith("startArrow=") &&
                !p.startsWith("endArrow=") &&
                !p.startsWith("startFill=") &&
                !p.startsWith("endFill=")
        );

        // add the new arrow definitions
        parts.push(newArrows);

        return parts.join(";") + ";";
    };

    const applyArrowStyles = (allCells: Element[], notation: string, shapeMap: Map<string, Shape>) => {
        for (const cell of allCells) {
            if (cell.getAttribute("edge") === "1") {
                const value = (cell.getAttribute("value") || "").trim();

                if (["1", "M", "N"].includes(value)) {
                    const styleEntry = styleHashmap.get(notation)?.get(value);
                    if (!styleEntry) continue;

                    const source = cell.getAttribute("source") || "";
                    const target = cell.getAttribute("target") || "";
                    let style = cell.getAttribute("style") || "";

                    // If source is Entity → apply start style
                    if (shapeMap.get(target)?.type === "Relationship" && shapeMap.get(source)?.type === "Entity" && styleEntry.start_style) {
                        style = setArrows(style, styleEntry.start_style);
                    }

                    // If target is Entity → apply end style
                    if (shapeMap.get(target)?.type === "Entity" && shapeMap.get(source)?.type === "Relationship" && styleEntry.end_style) {
                        style = setArrows(style, styleEntry.end_style);
                    }

                    // Optional: store cardinality separately
                    if (styleEntry.value) {
                        cell.setAttribute("value", styleEntry.value);
                    }else {
                        cell.removeAttribute("value");
                    }

                    cell.setAttribute("style", style);
                }
            }
        }
    };


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setChenDoc(null);
        setCrowDoc(null);
        setShapes(new Map());

        const reader = new FileReader();
        reader.onload = (event) => {
            const xmlText = event.target?.result as string;

            // Step 1: Parse XML into DOM
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const chenXmlDoc = xmlDoc.cloneNode(true) as Document;
            const crowXmlDoc = xmlDoc.cloneNode(true) as Document;

            // Step 2: Extract mxCells
            const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"));

            // Step 3: Create copies for each Notation
            const chenCells = Array.from(chenXmlDoc.getElementsByTagName("mxCell"));
            const crowCells = Array.from(crowXmlDoc.getElementsByTagName("mxCell"));

            const shapeMap: Map<string,Shape> = new Map<string,Shape>();
            //Store Shape Info In newShapes
            for (const cell of cells) {
                const id = cell.getAttribute("id") || "";
                const style = cell.getAttribute("style") || "";
                const value = cell.getAttribute("value") || "";

                if (
                    style.includes("shape=rectangle") ||
                    style.includes("shape=ext") ||
                    style === "whiteSpace=wrap;html=1;align=center;"
                ) {
                    shapeMap.set(id, { type: "Entity", label: value });
                }
                else if (style.includes("shape=rhombus")||style.includes("rhombus")) {
                    shapeMap.set(id,{type: "Relationship", label: value})
                } else if (cell.getAttribute("edge") === "1") {
                    shapeMap.set(id,{type: "Edge", label: value})
                } else {
                    shapeMap.set(id,{type: "Unknown", label: value})
                }
            }

            setShapes(shapeMap);

            applyArrowStyles(chenCells, "chen(adapted)",shapeMap)
            applyArrowStyles(crowCells, "crow",shapeMap)

            setChenDoc(chenXmlDoc);
            setCrowDoc(crowXmlDoc);

        };

        reader.readAsText(file);
    };

    return (
        <div className="p-4">
            <h2 className="font-bold mb-2">Notation Converter</h2>

            <input type="file" accept=".xml,.drawio" multiple onChange={handleFileUpload} />


              {/*                      {shapes && (
                            <div className="mt-4">
                                <h3 className="font-semibold">Shapes:</h3>
                                <ul>
                                    {Array.from(shapes.entries())
                                        .filter(([id, s]) => s.type !== "Unknown")
                                        .map(([id, s]) => (
                                            <li key={id}>
                                                {id}: type = {s.type}, label = {s.label ?? "N/A"}
                                            </li>

                                        ))}
                                </ul>
                            </div>

                        )}*/}
            <table className="border-collapse border border-gray-400 mt-4">
                <thead>
                <tr>
                    <th className="border px-2 py-1">Cardinality</th>
                    <th className="border px-2 py-1">Chen (Original)</th>
                    <th className="border px-2 py-1">Chen (Adapted)</th>
                    <th className="border px-2 py-1">Crows</th>
                </tr>
                </thead>
                <tbody>
                {examples.map((ex) => (
                    <tr key={ex.label}>
                        <td className="border px-2 py-1">{ex.label}</td>
                        <td className="border px-2 py-1">
                            <pre className="text-xs whitespace-pre-wrap">{ex.original}</pre>
                        </td>
                        <td className="border px-2 py-1">
                            <pre className="text-xs whitespace-pre-wrap">{ex.chen}</pre>
                        </td>
                        <td className="border px-2 py-1">
                            <pre className="text-xs whitespace-pre-wrap">{ex.crow}</pre>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>


            {chenDoc && (
                <button
                    onClick={() => downloadXml(chenDoc, "chen-styled.drawio")}
                    className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
                >
                    Download Chen
                </button>
            )}

            {crowDoc && (
                <button
                    onClick={() => downloadXml(crowDoc, "crow-styled.drawio")}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    Download Crow
                </button>
            )}



        </div>
    );
};

export default ConvertXMLNotation;
