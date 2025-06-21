import createError, { HttpError } from "http-errors";
import express, { Express, NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
//import dotenv from "dotenv";
import examplePy from "./routes/examplePy";

//dotenv.config();
const app: Express = express(); // Set up the backend
var cors = require("cors");

// Define the CORS options
const corsOptions = {
    credentials: true,
    origin: [
        "http://localhost:3001",
        "http://localhost:3000",
    ], // Whitelist the domains you want to allow
};
app.use(cors(corsOptions));
app.use(express.json());

const APP_ROUTES = {
    PYTHON: "/api/examplePy"
};

app.use(APP_ROUTES.PYTHON, examplePy);

// Setup generic middlewear
app.use(
    logger("dev", {
        stream: {
            // This is a "hack" that gets the output to appear in the remote debugger :)
            write: (msg) => console.info(msg),
        },
    }),
); // This records all HTTP requests

app.use(express.json()); // This processes requests as JSON
app.use(express.urlencoded({ extended: false })); // URL parser
app.use(cookieParser()); // Cookie parser

//set up routes here

app.use((_req: Request, _res: Response, next: NextFunction) => {
    // Have the next (generic error handler) process a 404 error
    next(createError(404));
});

/**
 * Generic error handler
 */
app.use((err: HttpError, req: Request, res: Response) => {
    // Provide the error message
    res.statusMessage = err.message;

    res.locals.error = req.app.get("env") === "development" ? err : {};

    // Reply with the error
    res.status(err.status || 500);
});

app.listen(3001, () => {
    console.log("App listening on port 3001");
})

// Export the backend, so that www.ts can start it
export default app;