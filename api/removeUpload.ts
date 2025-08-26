import { PrismaClient } from "../.prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

//export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//const deleteUpload: RequestHandler = async (req, res) => {
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const idParam = req.query.id as string | undefined;
        if (!idParam) {
            res.status(400).json({ error: "Missing id" });
            return;
        }

        const id = Number(idParam); // use directly if your id is a string
        if (!Number.isInteger(id)) {
            res.status(400).json({ error: "Invalid id" });
            return;
        }

        await prisma.accounts.delete({ where: { id } });
        res.sendStatus(204);
    } catch (err) {
        res.status(404).json({ error: "Not found" });
    }
};