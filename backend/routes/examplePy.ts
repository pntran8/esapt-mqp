import express, { Router, Request, Response } from "express";

const router: Router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
    try {
        console.log("hello????? form backend")
        const msg = await fetch("http://localhost:8080/api/examplePy");
        const data = await msg.text();
        res.status(200).json({message: data});
    } catch (error) {
        res.status(400).send("UH OHHHHHHH...");
    }
});


export default router;