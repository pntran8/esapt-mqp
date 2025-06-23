import { PrismaClient } from "../../.prisma/client";
const client = new PrismaClient();
import express, {Request, Response, Router} from "express";


const router: Router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        console.log("isthis working")
        const allData = await client.accounts.findMany();
        console.log(allData);
    } catch (error) {
        res.status(400).send("hi yara :)");
    }
});


export default router;
