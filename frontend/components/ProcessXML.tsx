import React from "react";

type ShapeType = "Entity" | "Attribute" | "Relationship" | "Unknown";

interface Shape {
    id: string;
    label: string;
    type: ShapeType;
    isKey?: boolean;
    isWeak?: boolean;
}

interface ProcessImgProps {
    entities: Record<string, Shape>;
    setEntities: React.Dispatch<React.SetStateAction<Record<string, Shape>>>;
    attributesByEntity: Record<string, {label: string, isKey: boolean}[]>;
    setAttributesByEntity: React.Dispatch<React.SetStateAction<Record<string, {label: string, isKey: boolean}[]>>>;
    relationships: { name: string; entities: string[]; isWeak?: boolean }[];
    setRelationships: React.Dispatch<React.SetStateAction<{ name: string; entities: string[]; isWeak?: boolean }[]>>;
    debugInfo: string;
    setDebugInfo: React.Dispatch<React.SetStateAction<string>>;
    parsedXML: Document | null;
    setParsedXML: React.Dispatch<React.SetStateAction<Document | null>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

function sanitizeName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, '_')        // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9_]/g, '') // Remove all non-alphanum/underscore
        .replace(/^(\d)/, '_$1');    // Prefix leading digits with underscore
}

function ProcessXML({
                        setEntities,
                        attributesByEntity,
                        setAttributesByEntity,
                        relationships,
                        setRelationships,
                        setDebugInfo,
                        setParsedXML,
                        isLoading,
                        setIsLoading
                    }: ProcessImgProps) {

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

                setParsedXML(xmlDoc);

                const cells = Array.from(xmlDoc.getElementsByTagName("mxCell"));
                setDebugInfo(`Found ${cells.length} cells`);
                console.log("CELLS:");
                cells.forEach((cell, i) => {
                    const id = cell.getAttribute("id");
                    const style = cell.getAttribute("style") || "";
                    const value = cell.getAttribute("value") || "";
                    const isEdge = cell.getAttribute("edge") === "1";
                    const source = cell.getAttribute("source");
                    const target = cell.getAttribute("target");

                    const isWeak =
                        !isEdge && (
                            style.includes("strokeWidth=2") ||
                            style.includes("dashed=1") ||
                            value.toLowerCase().includes("weak")
                        );

                    // Only log edges or cells that have a visible label
                    if (isEdge || value.trim()) {
                        console.log(`[${i}] ID: ${id}`);
                        console.log(`   Value: ${value}`);
                        console.log(`   Style: ${style}`);
                        console.log(`   IsEdge: ${isEdge}`);
                        console.log(`   isWeak: ${isWeak}`);
                        if (isEdge) {
                            console.log(`   Source: ${source}, Target: ${target}`);
                        }
                    }
                });

                const shapeMap: Record<string, Shape> = {};
                const edges: { from: string; to: string; isWeak?: boolean }[] = [];

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
                    let isWeak = false;

                    if (style.includes("shape=doubleEllipse")) {
                        type = "Attribute";
                        isWeak = true;
                    } else if (style.includes("ellipse")) {
                        type = "Attribute";
                    } else if (style.includes("shape=rhombus") && style.includes("double=1")) {
                        type = "Relationship";
                        isWeak = true;
                    } else if (style.includes("shape=rhombus")) {
                        type = "Relationship";
                    } else if (style.includes("shape=ext") && style.includes("double=1")) {
                        type = "Entity";
                        isWeak = true;
                    } else if (style.includes("rounded=1") && style.includes("arcSize=10")) {
                        type = "Entity";
                    } else if (
                        style.includes("shape=rectangle") ||
                        style.includes("rounded=1") ||
                        style.includes("arcSize=10") ||
                        style.includes("whiteSpace=wrap")
                    ) {
                        type = "Entity";
                    } else if (
                        style.includes("whiteSpace=wrap") &&
                        style.includes("html=1") &&
                        style.includes("align=center")
                    ) {
                        type = "Entity";
                    }

                    // only add if there's a value in it
                    if (type !== "Unknown" && value.trim()) {
                        shapeMap[id] = { id, label: value.trim(), type, isKey, isWeak };
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

                console.log("Expanded Edges with Labels:");
                edges.forEach((edge, index) => {
                    const fromShape = shapeMap[edge.from];
                    const toShape = shapeMap[edge.to];

                    const fromLabel = fromShape ? `${fromShape.label} (${fromShape.type})` : `Unknown (${edge.from})`;
                    const toLabel = toShape ? `${toShape.label} (${toShape.type})` : `Unknown (${edge.to})`;

                    console.log(`[${index}] ${fromLabel} ---> ${toLabel}`);
                });

                for (const edge of edges) {
                    const from = shapeMap[edge.from];
                    const to = shapeMap[edge.to];

                    if (!from || !to) continue;

                    // entity attributes
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
                console.log("Shape Map:", shapeMap);
                setAttributesByEntity(entityAttributeDetails);
                console.log("Attributes by Entity:");
                Object.entries(entityAttributeDetails).forEach(([entity, attrs]) => {
                    console.log(`Entity: ${entity}`);
                    attrs.forEach(attr => {
                        console.log(`  - Attribute: ${attr.label}, isKey: ${attr.isKey}`);
                    });
                });

                console.log("Relationships:", relationshipLinks);

                const relationshipArray = Object.entries(relationshipLinks).map(([name, ents]) => {
                    const shape = Object.values(shapeMap).find((s) => s.label === name && s.type === "Relationship");
                    return { name, entities: ents, isWeak: shape?.isWeak };
                });

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

    const generateSQLSchema = () => {
        let sql = "";
        const definedTables = new Set<string>();

        // 1. Define all tables for entities
        for (const [entityName, attributes] of Object.entries(attributesByEntity)) {
            const tableName = sanitizeName(entityName);
            definedTables.add(tableName);

            sql += `CREATE TABLE ${tableName} (\n`;

            const lines: string[] = [];
            for (const attr of attributes) {
                const fieldName = sanitizeName(attr.label);
                const fieldType = attr.isKey ? "INT" : "VARCHAR(255)";
                let line = `  ${fieldName} ${fieldType}`;
                if (attr.isKey) line += " PRIMARY KEY";
                lines.push(line);
            }

            sql += lines.join(",\n") + `\n);\n\n`;
        }

        // 2. Relationships
        const addedConstraints = new Set<string>();

        for (const rel of relationships) {
            if (rel.entities.length === 2) {
                const [a, b] = rel.entities;
                const tableA = sanitizeName(a);
                const tableB = sanitizeName(b);

                const constraintId = [tableA, tableB].sort().join("_");

                if (!addedConstraints.has(constraintId)) {
                    sql += `-- Relationship: ${a} <--> ${b} via ${rel.name}\n`;
                    sql += `ALTER TABLE ${tableA}\n  ADD COLUMN ${tableB.toLowerCase()}_id INT,\n  ADD FOREIGN KEY (${tableB.toLowerCase()}_id) REFERENCES ${tableB}(id);\n\n`;
                    sql += `ALTER TABLE ${tableB}\n  ADD COLUMN ${tableA.toLowerCase()}_id INT,\n  ADD FOREIGN KEY (${tableA.toLowerCase()}_id) REFERENCES ${tableA}(id);\n\n`;
                    addedConstraints.add(constraintId);
                }
            } else {
                // Relationship with >2 entities → join table
                const joinTable = sanitizeName(rel.name);
                if (!definedTables.has(joinTable)) {
                    sql += `-- Join table for relationship: ${rel.name}\n`;
                    sql += `CREATE TABLE ${joinTable} (\n`;

                    const lines: string[] = [];
                    rel.entities.forEach((ent) => {
                        const colName = sanitizeName(ent.toLowerCase() + "_id");
                        const refTable = sanitizeName(ent);
                        lines.push(`  ${colName} INT,\n  FOREIGN KEY (${colName}) REFERENCES ${refTable}(id)`);
                    });

                    sql += lines.join(",\n") + `\n);\n\n`;
                    definedTables.add(joinTable);
                }
            }
        }

        return sql;
    };

    const entityCount = Object.keys(attributesByEntity).length;
    const handleExamplePy = () => {
        console.log("hello???");
        fetch("http://localhost:3001/api/examplePy")
            .then(res => res.text())
            .then(data => {
                console.log("Response from backend:", data);
            })
            .catch(err => {
                console.error("Fetch error:", err);
            });
    };

    const handleDB = () => {
        console.log("i <3 soobin");
        fetch("http://localhost:3001/api/getHistory")
            .then(res => res.text())
            .then(data => {
                console.log("Response from backend:", data);
            })
            .catch(err => {
                console.error("Fetch error:", err);
            });
    };
    return (
        <div>
            <button
                onClick={() => {
                    handleExamplePy();
                }}
                className = "p-6 bg-amber-400 hover:bg-amber-500 transition duration-150"
            >
                click here to run example py
            </button>
            <button
                onClick={() => {
                    handleDB();
                }}
                className = "p-6 bg-amber-400 hover:bg-amber-500 transition duration-150"
            >
                is db working
            </button>
            <div className={"relative mx-auto p-1 flex items-center justify-between h-15"}>
                <div className="my-3 mb-1 mx-10 flex w-[45%] relative">
                    <label className="text-sm font-medium  text-gray-700 my-2">
                        ONLY A .DRAWIO FILE
                    </label>

                    <input
                        type="file"
                        accept=".drawio,.xml"
                        onChange={handleFileUpload}
                        className="absolute right-0 ml-10 block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {isLoading && <p className="mt-2 text-blue-600">loading...</p>}
                </div>

                {entityCount > 0 && (
                    <div className="my-3 mb-1 mx-10 flex">
                        <button
                            className=" px-4 py-2 bg-[#c53a52] text-white rounded hover:bg-[#c31534]"
                            onClick={() => {
                                const sql = generateSQLSchema();
                                const blob = new Blob([sql], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = "schema.sql";
                                link.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            Download SQL Schema
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProcessXML;