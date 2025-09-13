import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import "./gem.css";

interface Shape {
    type: "Entity" | "Attribute" | "Relationship" | "Edge" | "Unknown";
    label?: string;
}

// def the possible shape of a style entry
interface StyleEntry {
    end_style?: string;
    start_style?: string;
    value?: string;
    remove_value?: boolean;
}

interface Example {
    label: string;
    chen: string;
    crow: string;
    uml: string;
}

const examples: Example[] = [
    {
        label: "Exactly One",
        chen: "endArrow=open;endFill=0;",
        crow: "endArrow=ERmandOne;endFill=0;",
        uml: "endArrow=none;endFill=0; (no label)"
    },
    {
        label: "Optional (0 or 1)",
        chen: "endArrow=block;endFill=1;",
        crow: "endArrow=ERzeroToOne;endFill=0;",
        uml: "endArrow=none;endFill=0; (label: 0..1)"
    },
    {
        label: "Zero or More",
        chen: "endArrow=none;endFill=0;",
        crow: "endArrow=ERoneToMany;endFill=0;",
        uml: "endArrow=none;endFill=0; (label: *)"
    },
    {
        label: "One or More",
        chen: "endArrow=none;endFill=0; (label: 1..*)",
        crow: "endArrow=ERmany;endFill=0;",
        uml: "endArrow=none;endFill=0; (label: 1..*)"
    }
];

// chen mappings
const chenHashMap: Map<string, StyleEntry> = new Map([
    ["1", {
        end_style: "endArrow=open;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=open;startFill=0",
        remove_value: true
    }],
    ["0..1", {
        end_style: "endArrow=block;endFill=1;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=block;startFill=1",
        remove_value: true
    }],
    ["*", {
        end_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        remove_value: true
    }],
    ["1..*", {
        end_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        value: "1..*"
    }]
]);

// crow's foot mappings
const crowHashMap: Map<string, StyleEntry> = new Map([
    ["1", {
        end_style: "endArrow=ERmandOne;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=ERmandOne;startFill=0",
        remove_value: true
    }],
    ["0..1", {
        end_style: "endArrow=ERzeroToOne;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=ERzeroToOne;startFill=0",
        remove_value: true
    }],
    ["*", {
        end_style: "endArrow=ERoneToMany;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=ERoneToMany;startFill=0",
        remove_value: true
    }],
    ["1..*", {
        end_style: "endArrow=ERmany;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=ERmany;startFill=0",
        remove_value: true
    }]
]);

// uml mappings
const umlHashMap: Map<string, StyleEntry> = new Map([
    ["1", {
        end_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        value: "1"
    }],
    ["0..1", {
        end_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        value: "0..1"
    }],
    ["*", {
        end_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        value: "*"
    }],
    ["1..*", {
        end_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        start_style: "endArrow=none;endFill=0;startArrow=none;startFill=0",
        value: "1..*"
    }]
]);

const styleHashmap: Map<string, Map<string, StyleEntry>> = new Map([
    ["Chen", chenHashMap],
    ["Crow's Foot", crowHashMap],
    ["UML", umlHashMap]
]);

const ConvertXMLNotation: React.FC = () => {
    const [shapes, setShapes] = useState<Map<string, Shape>>();
    const [convertedDocs, setConvertedDocs] = useState<Map<string, Document>>(new Map());
    const [selectedNot, setSelectedNot] = useState<string>("");
    const [fileName, setFileName] = useState<string>("");

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

    const detectShapeType = (style: string, value: string): Shape => {
        if (style.includes("shape=rectangle") ||
            style.includes("shape=ext") ||
            style === "whiteSpace=wrap;html=1;align=center;" ||
            (style.includes("whiteSpace=wrap") && style.includes("html=1") && style.includes("align=center") && !style.includes("rhombus"))) {
            return { type: "Entity", label: value };
        } else if (style.includes("shape=rhombus") ||
            style.includes("rhombus") ||
            style.includes("rhombusPerimeter")) {
            return { type: "Relationship", label: value };
        }
        return { type: "Unknown", label: value };
    };

    // normalize as much as possible all the styles
    const detectCardinalityFromStyle = (style: string, value: string): string => {
        const trimmedValue = value.trim();

        // check the value attribute
        if (trimmedValue) {
            if (trimmedValue === "1" || trimmedValue.toLowerCase() === "one") return "1";
            if (trimmedValue === "*" || trimmedValue === "0..*") return "*";
            if (trimmedValue === "1..*" || trimmedValue === "1..n" || trimmedValue === "1..m") return "1..*";
            if (trimmedValue === "0..1" || trimmedValue === "0,1") return "0..1";
            if (/^\d+\.\.\d+$/.test(trimmedValue) && trimmedValue !== "0..*" && trimmedValue !== "0..1") return "1..*";
        }

        // check the style for arrow types
        if (style.includes("endArrow=open") || style.includes("startArrow=open")) return "1";
        if (style.includes("endArrow=block") || style.includes("startArrow=block") ||
            style.includes("endArrow=blockThin") || style.includes("startArrow=blockThin")) return "0..1";
        if (style.includes("endArrow=ERmandOne") || style.includes("startArrow=ERmandOne")) return "1";
        if (style.includes("endArrow=ERzeroToOne") || style.includes("startArrow=ERzeroToOne")) return "0..1";
        if (style.includes("endArrow=ERoneToMany") || style.includes("startArrow=ERoneToMany")) return "*";
        if (style.includes("endArrow=ERmany") || style.includes("startArrow=ERmany")) return "1..*";
        if (style.includes("endArrow=none") && style.includes("endFill=0")) {
            // can be Chen * or 1..*, or UML - need to check value
            return trimmedValue || "*";
        }

        return "";
    };

    const applyArrowStyles = (allCells: Element[], notation: string, shapeMap: Map<string, Shape>) => {
        const styleMap = styleHashmap.get(notation);
        if (!styleMap) return;

        for (const cell of allCells) {
            if (cell.getAttribute("edge") === "1") {
                const style = cell.getAttribute("style") || "";
                const rawValue = cell.getAttribute("value") || "";

                // get cardinality from both style and value
                const cardinality = detectCardinalityFromStyle(style, rawValue);

                if (cardinality && styleMap.has(cardinality)) {
                    const styleEntry = styleMap.get(cardinality)!;
                    const source = cell.getAttribute("source") || "";
                    const target = cell.getAttribute("target") || "";

                    let newStyle = style;

                    // use styles based on connection direction
                    const sourceShape = shapeMap.get(source);
                    const targetShape = shapeMap.get(target);

                    if (targetShape?.type === "Relationship" && sourceShape?.type === "Entity" && styleEntry.start_style) {
                        newStyle = setArrows(newStyle, styleEntry.start_style);
                    } else if (targetShape?.type === "Entity" && sourceShape?.type === "Relationship" && styleEntry.end_style) {
                        newStyle = setArrows(newStyle, styleEntry.end_style);
                    } else if (styleEntry.end_style) {
                        // default end_style if direction is unclear
                        newStyle = setArrows(newStyle, styleEntry.end_style);
                    }

                    // value changes
                    if (styleEntry.remove_value) {
                        cell.removeAttribute("value");
                    } else if (styleEntry.value) {
                        cell.setAttribute("value", styleEntry.value);
                    }

                    cell.setAttribute("style", newStyle);
                }
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name.replace(/\.(xml|drawio)$/i, ""));
        setConvertedDocs(new Map());
        setShapes(new Map());

        //AHHHHHHHHHHHHHHHHHHHHHHHH FUCK U DANIEL

        const reader = new FileReader();
        reader.onload = (event) => {
            const xmlText = event.target?.result as string;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // get shape info
            const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"));
            const shapeMap: Map<string, Shape> = new Map();

            for (const cell of cells) {
                const id = cell.getAttribute("id") || "";
                const style = cell.getAttribute("style") || "";
                const value = cell.getAttribute("value") || "";

                if (cell.getAttribute("edge") === "1") {
                    shapeMap.set(id, { type: "Edge", label: value });
                } else {
                    const shape = detectShapeType(style, value);
                    shapeMap.set(id, shape);
                }
            }

            setShapes(shapeMap);

            // create docs for all notations except the one user selected
            const newConvertedDocs = new Map<string, Document>();
            const notations = ["Chen", "Crow's Foot", "UML"]; //only 3 nots

            for (const notation of notations) {
                if (notation !== selectedNot) { //make the doc
                    const convertedDoc = xmlDoc.cloneNode(true) as Document;
                    const convertedCells = Array.from(convertedDoc.getElementsByTagName("mxCell"));
                    applyArrowStyles(convertedCells, notation, shapeMap);
                    newConvertedDocs.set(notation, convertedDoc);
                }
            }

            setConvertedDocs(newConvertedDocs);
        };

        reader.readAsText(file);
    };

    const handleClear = () => {
        setConvertedDocs(new Map());
        setShapes(new Map());
        setSelectedNot("");
        setFileName("");
    };

    return (
        <>
            <Header />

            <header className="text-center text-4xl mt-8 font-bold">Notation Converter</header>

            <div id="input-container" style={{border: "1vh light grey", borderRadius:"2vh", marginTop:"3vh"}}>
                <div style={{display: 'inline-block'}} className="mr-5">
                    <select
                        aria-label="Choose your notation"
                        className="border-1 border-[#ddd] p-3 rounded-md"
                        style={{ width: "auto", fontSize: "small" }}
                        value={selectedNot}
                        onChange={(e) => setSelectedNot(e.target.value)}
                    >
                        <option value="" disabled>
                            Your ERD notation
                        </option>
                        <option value="infix">Chen</option>
                        <option value="prefix">Crow's Foot</option>
                        <option value="postfix">UML</option>
                    </select>
                    <p className="text-[10px] text-gray-600 font-bold">Select your ERD notation</p>
                </div>

                <div style={{display: 'inline-block'}}>
                    <input
                        type="file"
                        accept=".xml,.drawio"
                        onChange={handleFileUpload}
                        className="chat-input"
                        disabled={!selectedNot}
                        multiple
                        style={{fontSize:'2vh', width: '100vh', marginRight: '2vh'}}
                    />
                    {!selectedNot && (
                        <p className="text-[10px] text-gray-600 font-bold">
                            Select your current notation first.
                        </p>
                    )}
                </div>

                <div style={{display: 'inline-block'}}>
                    <button className="cursor-pointer clear-btn bg-[#BD0A0A] hover:bg-[#700606] text-white" onClick={() => {
                        handleClear();
                        window.location.reload();
                    }}>
                        Clear
                    </button>
                    <p className="text-[10px] text-white font-bold">,</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-xl font-semibold mb-4">Notation Conversion Examples</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                        <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Cardinality</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Chen</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Crow's Foot</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">UML</th>
                        </tr>
                        </thead>
                        <tbody>
                        {examples.map((ex) => (
                            <tr key={ex.label} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2 font-medium">{ex.label}</td>
                                <td className="border border-gray-300 px-4 py-2">
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{ex.chen}</code>
                                </td>
                                <td className="border border-gray-300 px-4 py-2">
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{ex.crow}</code>
                                </td>
                                <td className="border border-gray-300 px-4 py-2">
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{ex.uml}</code>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* download btns */}
            {convertedDocs.size > 0 && (
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-semibold mb-4">Download Converted Files</h3>
                    <div className="space-x-4">
                        {Array.from(convertedDocs.entries()).map(([notation, doc]) => (
                            <button
                                key={notation}
                                onClick={() => downloadXml(doc, `${fileName}-${notation.toLowerCase().replace("'", "").replace(" ", "-")}.drawio`)}
                                className={`px-6 py-3 rounded-md text-white font-medium transition-colors ${
                                    notation === "Chen"
                                        ? "bg-[#da627d] hover:bg-[#a53860]"
                                        : notation === "Crow's Foot"
                                            ? "bg-[#ad2831] hover:bg-[#800e13]"
                                            : "bg-[#f27059] hover:bg-[#f25c54]"
                                }`}
                            >
                                Download {notation}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
};

export default ConvertXMLNotation;
