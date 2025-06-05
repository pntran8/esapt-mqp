import React, { useState } from "react";

type ShapeType = "Entity" | "Attribute" | "Relationship" | "Unknown";

interface Shape {
    id: string;
    label: string;
    type: ShapeType;
    isKey?: boolean;
}

interface Connection {
    from: string;
    to: string;
}

function App() {
    const [entities, setEntities] = useState<Record<string, Shape>>({});
    const [attributesByEntity, setAttributesByEntity] = useState<Record<string, {label: string, isKey: boolean}[]>>({});
    const [relationships, setRelationships] = useState<
        { name: string; entities: string[] }[]
    >([]);
    const [debugInfo, setDebugInfo] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const parseLabel = (rawLabel: string) => {
        // only get text content
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = rawLabel;

        // check if has underline
        const hasUnderline = rawLabel.includes("<u>") || rawLabel.includes("<U>");

        // clean text
        const cleanText = tempDiv.textContent || tempDiv.innerText || "";

        return {
            text: cleanText.trim(),
            isKey: hasUnderline
        };
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setDebugInfo("Processing file...");

        try {
            const reader = new FileReader();
            reader.onload = (event) => {
                const xmlText = event.target?.result as string;

                setDebugInfo(`File loaded, size: ${xmlText.length} characters`);

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                // errs?
                const parseError = xmlDoc.getElementsByTagName("parsererror");
                if (parseError.length > 0) {
                    setDebugInfo("XML parsing error: " + parseError[0].textContent);
                    setIsLoading(false);
                    return;
                }

                const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"));
                setDebugInfo(`Found ${cells.length} cells`);

                const shapeMap: Record<string, Shape> = {};
                const edges: Connection[] = [];

                for (const cell of cells) {
                    const id = cell.getAttribute("id");
                    const style = cell.getAttribute("style") || "";
                    let value = cell.getAttribute("value") || "";

                    // parse text to get info
                    const labelInfo = parseLabel(value);
                    value = labelInfo.text;

                    // check if key (check for <u> tag or wtv the underline is)
                    const isKey = labelInfo.isKey ||
                        style.includes("text-decoration-line:underline") ||
                        style.includes("textDecoration=underline") ||
                        style.includes("fontStyle=4") ||
                        style.includes("text-decoration:underline");

                    if (!id) continue;

                    let type: ShapeType = "Unknown";

                    if (style.includes("ellipse") || style.includes("oval")) {
                        type = "Attribute";
                    } else if (style.includes("rhombus") || style.includes("diamond") ||
                        style.includes("shape=rhombus") || style.includes("shape=diamond") ||
                        style.includes("points=") || style.includes("rotation=45")) {
                        type = "Relationship";
                    } else if (style.includes("rectangle") || style.includes("rounded=0") ||
                        style.includes("whiteSpace=wrap") || style.includes("shape=rectangle")) {
                        type = "Entity";
                    }

                    // only add if there's a value in it
                    if (type !== "Unknown" && value.trim()) {
                        shapeMap[id] = { id, label: value.trim(), type, isKey };
                    }
                }

                // get lines (the edges)
                for (const cell of cells) {
                    if (cell.getAttribute("edge") === "1") {
                        const source = cell.getAttribute("source");
                        const target = cell.getAttribute("target");
                        if (source && target) {
                            edges.push({ from: source, to: target });
                        }
                    }
                }

                setDebugInfo(`Found ${Object.keys(shapeMap).length} shapes and ${edges.length} edges`);

                // stores attribute with key
                const entityAttributeDetails: Record<string, {label: string, isKey: boolean}[]> = {};
                const relationshipLinks: Record<string, string[]> = {};

                for (const edge of edges) {
                    const from = shapeMap[edge.from];
                    const to = shapeMap[edge.to];

                    if (!from || !to) continue;

                    // entitty attributes
                    if (from.type === "Entity" && to.type === "Attribute") {
                        if (!entityAttributeDetails[from.label]) entityAttributeDetails[from.label] = [];
                        entityAttributeDetails[from.label].push({label: to.label, isKey: to.isKey || false});
                    } else if (to.type === "Entity" && from.type === "Attribute") {
                        if (!entityAttributeDetails[to.label]) entityAttributeDetails[to.label] = [];
                        entityAttributeDetails[to.label].push({label: from.label, isKey: from.isKey || false});
                    }

                    // entity relationships
                    if (from.type === "Entity" && to.type === "Relationship") {
                        if (!relationshipLinks[to.label]) relationshipLinks[to.label] = [];
                        relationshipLinks[to.label].push(from.label);
                    } else if (to.type === "Entity" && from.type === "Relationship") {
                        if (!relationshipLinks[from.label]) relationshipLinks[from.label] = [];
                        relationshipLinks[from.label].push(to.label);
                    }
                }

                // store results
                setEntities(shapeMap);
                setAttributesByEntity(entityAttributeDetails);

                const relationshipArray = Object.entries(relationshipLinks).map(([name, ents]) => ({
                    name,
                    entities: ents,
                }));
                setRelationships(relationshipArray);

                setDebugInfo(`Processed: ${Object.keys(entityAttributeDetails).length} entities with attributes, ${relationshipArray.length} relationships`);
                setIsLoading(false);
            };

            reader.readAsText(file);
        } catch (error) {
            setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsLoading(false);
        }
    };

    const entityCount = Object.keys(attributesByEntity).length;
    const relationshipCount = relationships.length;
    const totalShapes = Object.keys(entities).length;

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">???</h1>

            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ONLY A .DRAWIO FILE (it should be XML if you export it, BUT CAN'T BE COMPRESSED)
                </label>
                <input
                    type="file"
                    accept=".drawio,.xml"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {isLoading && <p className="mt-2 text-blue-600">laoding...</p>}
            </div>

            {debugInfo && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-2">hello???</h3>
                    <p className="text-sm text-gray-600">{debugInfo}</p>
                </div>
            )}

            {totalShapes > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">summary</h3>
                    <p className="text-sm text-blue-700">
                        {totalShapes} total shapes, {entityCount} entities, {relationshipCount} relationships
                    </p>
                </div>
            )}

            {entityCount > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">ENTITIES AND ATTRIBUTES</h2>
                    <div className="space-y-3">
                        {Object.entries(attributesByEntity).map(([entity, attrs]) => {
                            const keys = attrs.filter(attr => attr.isKey);
                            const regularAttrs = attrs.filter(attr => !attr.isKey);

                            return (
                                <div key={entity} className="p-4 border border-gray-200 rounded-lg">
                                    <h3 className="font-bold text-lg text-blue-600 mb-3">{entity}</h3>

                                    {keys.length > 0 && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-yellow-800">Key: </span>
                                            <span className="text-gray-700">
                                                {keys.map(key => key.label).join(', ')}
                                            </span>
                                        </div>
                                    )}

                                    {regularAttrs.length > 0 && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-gray-800">Attributes: </span>
                                            <span className="text-gray-700">
                                                {regularAttrs.map(attr => attr.label).join(', ')}
                                            </span>
                                        </div>
                                    )}

                                    {attrs.length === 0 && (
                                        <p className="text-gray-500 text-sm">No attributes found</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {relationshipCount > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Relationships</h2>
                    <div className="space-y-3">
                        {relationships.map((rel, i) => (
                            <div key={i} className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="font-bold text-lg text-green-600 mb-2">{rel.name}</h3>
                                <p className="text-gray-700">
                                    {rel.entities.join(" <--> ")}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {totalShapes === 0 && !isLoading && (
                <div className="text-center py-12">
                    <p className="text-gray-500">ONLY A .DRAWIO FILE</p>
                </div>
            )}

            {totalShapes > 0 && entityCount === 0 && relationshipCount === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-2">no elements found</h3>
                    <p className="text-yellow-700 text-sm">
                        {totalShapes} shapes, but no entities or relationships were detected. MAKE SURE IT'S ALL PROPERLY CONNECTED
                    </p>
                </div>
            )}
        </div>
    );
}

export default App;