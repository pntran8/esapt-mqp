import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const client = new PrismaClient();

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    try {
        const allData = await client.accounts.findMany();
        res.status(200).json(allData);
    } catch (error) {
        console.error(error);
        res.status(400).send("Failed to retrieve data.");
    }
}