import express, {Request, Response, Router} from "express";
import { PrismaClient } from "../../.prisma/client";
import multer from "multer";

const router: Router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/", upload.single("file"), async (req: Request, res: Response) => {
    try {
        const fileBuffer = req.file?.buffer;
        const { userID, textFile } = req.body;
        //console.log("userid: ", userID);
        //console.log("image file: ", fileBuffer);
        //console.log("text file: ", textFile);

        await prisma.accounts.create({
            data: {
                userID,
                "imageFile": fileBuffer?.toString("base64") || "No image",
                textFile,
                timeCreated: new Date().toISOString(),
            }
        });

        console.log("Successfully inserted.");
        res.status(200).send("Account created");
    } catch (error) {
        res.status(400).send(`error: ${error}`);
    }
});

export default router;
