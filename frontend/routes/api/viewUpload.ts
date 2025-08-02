import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userID = req.query.userID as string;

    if (!userID) {
        res.status(400).send("didn't pass in a user id.");
        return;
    }

    try {
        const uploads = await prisma.accounts.findMany({ where: { userID } });

        const processed = uploads.map((entry) => ({
            ...entry,
            decodedImage: `data:image/jpeg;base64,${entry.imageFile}`,
        }));

        res.status(200).json(processed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "error sending back db info" });
    }
}
