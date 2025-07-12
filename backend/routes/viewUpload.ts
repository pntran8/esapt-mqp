import { PrismaClient } from "../../.prisma/client";
const prisma = new PrismaClient();
import express, {Request, Response, Router} from "express";
//import zlib from "zlib";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    const userID = req.query.userID as string;

    if (!userID) {
        res.send("didn't pass in a user id.");
    }

    try {
        const uploads = await prisma.accounts.findMany({
            where: { userID },
        });

        const processed = uploads.map((entry) => ({
            ...entry,
            decodedImage: `data:image/jpeg;base64,${entry.imageFile}`,
        }));

        res.json(processed);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "error sending back db info" });
    }
});

export default router;