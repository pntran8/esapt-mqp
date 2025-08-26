import createError, { HttpError } from "http-errors";
import express, { Express, NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";

// Route imports
import getHistory from "../api/getHistory.ts";
import insertUpload from "../api/insertUpload.ts";
import viewUpload from "../api/viewUpload.ts";
import removeUpload from "../api/removeUpload.ts";

const app: Express = express();

// Define the CORS options
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests from localhost and your Vercel subdomains
        if (
            !origin ||
            origin.startsWith("http://localhost") ||
            /^https:\/\/esapt2025-.*-pntran8s-projects\.vercel\.app$/.test(origin)
        ) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// HTTP logging
app.use(
    logger("dev", {
        stream: {
            write: (msg) => console.info(msg),
        },
    })
);

// Routes
const APP_ROUTES = {
    DB: "/api/getHistory",
    INSERT_DB: "/api/insertUpload",
    VIEW_DB: "/api/viewUpload",
    REMOVE: "/api/removeUpload",
};

app.use(APP_ROUTES.INSERT_DB, insertUpload);
app.use(APP_ROUTES.VIEW_DB, viewUpload);
app.use(APP_ROUTES.DB, getHistory);
app.use(APP_ROUTES.REMOVE, removeUpload);

// Auth0 domain key
app.get("/api/authodom/key", (_req: Request, res: Response, next: NextFunction) => {
    const authDomain = process.env.REACT_APP_AUTH0_DOMAIN;
    if (!authDomain) {
        console.error("Auth0 Domain API Key not found.");
        return next(createError(500, "Auth0 Domain API Key configuration error :("));
    }
    res.json({ authDomain });
});

// Auth0 client key
app.get("/api/authocli/key", (_req: Request, res: Response, next: NextFunction) => {
    const authCli = process.env.REACT_APP_AUTH0_CLIENT_ID;
    if (!authCli) {
        console.error("Auth0 Client API Key not found.");
        return next(createError(500, "Auth0 Client API Key configuration error :("));
    }
    res.json({ authCli });
});

// 404 handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createError(404));
});

// Error handler
app.use((err: HttpError, req: Request, res: Response) => {
    res.statusMessage = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    res.status(err.status || 500).json({ error: err.message });
});

export default app;