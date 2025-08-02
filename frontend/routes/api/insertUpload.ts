import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import { IncomingMessage, ServerResponse } from "http";
import { promises as fs } from "fs";

// Disable Next.js’s default body parser to handle multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

const prisma = new PrismaClient();

const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("Method Not Allowed");
        return;
    }

    const form = formidable({ maxFileSize: 5 * 1024 * 1024 }); // 5MB

    form.parse(req, async (err, fields, files) => {
        if (err) {
            res.statusCode = 400;
            res.end(`Error parsing form: ${err}`);
            return;
        }

        const userID = fields.userID?.[0];
        if (!userID || typeof userID !== "string") {
            res.statusCode = 400;
            res.end("Missing or invalid userID");
            return;
        }
        const textFile = fields.textFile?.[0];
        const file = files.file?.[0];
        const fileBuffer = file ? await fs.readFile(file.filepath) : undefined;

        try {
            await prisma.accounts.create({
                data: {
                    userID,
                    imageFile: fileBuffer?.toString("base64") || "No image",
                    textFile,
                    timeCreated: new Date().toISOString(),
                },
            });

            res.statusCode = 200;
            res.end("Account created");
        } catch (e) {
            res.statusCode = 400;
            res.end(`error: ${e}`);
        }
    });
};

export default handler;