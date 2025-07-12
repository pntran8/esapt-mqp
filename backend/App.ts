import createError, { HttpError } from "http-errors";
import express, { Express, NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
//import dotenv from "dotenv";
import examplePy from "./routes/examplePy";
import getHistory from "./routes/getHistory";
import insertUpload from "./routes/insertUpload";
import viewUpload from "./routes/viewUpload";

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

const APP_ROUTES = {
    PYTHON: "/api/examplePy",
    DB: "/api/getHistory",
    INSERT_DB: "/api/insertUpload",
    VIEW_DB: "/api/viewUpload",
};

app.use(APP_ROUTES.INSERT_DB, insertUpload);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(APP_ROUTES.VIEW_DB, viewUpload);
app.use(APP_ROUTES.PYTHON, examplePy);
app.use(APP_ROUTES.DB, getHistory);

// Setup generic middlewear
app.use(
    logger("dev", {
        stream: {
            // This is a "hack" that gets the output to appear in the remote debugger :)
            write: (msg) => console.info(msg),
        },
    }),
); // This records all HTTP requests

// auth0 domain key
app.get(
    "/api/authodom/key",
    (_req: Request, res: Response, next: NextFunction) => {
        const authDomain = process.env.REACT_APP_AUTH0_DOMAIN;

        if (!authDomain) {
            console.error(
                "Auth0 Domain API Key not found in backend environment variables.",
            );
            return next(
                createError(500, "Auth0 Domain API Key configuration error :("),
            );
        }
        res.json({ authDomain });
    },
);

// auth0 client key
app.get(
    "/api/authocli/key",
    (_req: Request, res: Response, next: NextFunction) => {
        const authCli = process.env.REACT_APP_AUTH0_CLIENT_ID;

        if (!authCli) {
            console.error(
                "Auth0 Client API Key not found in backend environment variables.",
            );
            return next(
                createError(500, "Auth0 Client API Key configuration error :("),
            );
        }
        res.json({ authCli });
    },
);


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