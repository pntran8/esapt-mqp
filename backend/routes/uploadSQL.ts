import express, { Router, Request, Response } from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { create } from "xmlbuilder2";


const router: Router = express.Router();

function generateDrawioXML(schema: Record<string, any[]>): string {
    const doc = create({ version: "1.0", encoding: "UTF-8" })
        .ele("mxGraphModel")
        .ele("root");

    doc.ele("mxCell", { id: "0" });
    doc.ele("mxCell", { id: "1", parent: "0" });

    let idCounter = 2;
    Object.entries(schema).forEach(([tableName, columns], index) => {
        const id = (++idCounter).toString();
        const columnStr = columns
            .map((col) => `${col.name}${col.pk ? " (PK)" : ""}`)
            .join("\n");

        doc
            .ele("mxCell", {
                id,
                value: `${tableName}\n${columnStr}`,
                style: "shape=swimlane;whiteSpace=wrap;html=1;",
                vertex: "1",
                parent: "1",
            })
            .ele("mxGeometry", {
                x: index * 180,
                y: 100,
                width: 160,
                height: 100,
                as: "geometry",
            });
    });

    return doc.end({ prettyPrint: true });
}

router.post("/", async (req: Request, res: Response) => {
    const { sql } = req.body;

    if (!sql) {
        return res.status(400).json({ error: "Missing SQL" });
    }

    try {
        const db = await open({ filename: ":memory:", driver: sqlite3.Database });
        await db.exec(sql);

        const tables = await db.all(
            `SELECT name FROM sqlite_master WHERE type='table'`
        );
        const schema: Record<string, any[]> = {};

        for (const { name } of tables) {
            const columns = await db.all(`PRAGMA table_info(${name})`);
            schema[name] = columns;
        }

        const xml = generateDrawioXML(schema);
        res.setHeader("Content-Type", "text/xml");
        res.send(xml);
    } catch (err) {
        console.error("SQL processing error:", err);
        res.status(500).json({ error: "Invalid SQL or server error" });
    }
});


export default router;

