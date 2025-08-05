import createError, { HttpError } from "http-errors";
import express, { Express, NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

// Route imports
import examplePy from "./routes/examplePy";
import getHistory from "./routes/getHistory";
import insertUpload from "./routes/insertUpload";
import viewUpload from "./routes/viewUpload";
import SQLITE from "./routes/uploadSQL"


const app: Express = express();
const httpServer = createServer(app);

// Set up Socket.IO server
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000"],
        credentials: true,
    },
});

// Socket.IO event handlers
const sessionHosts = new Map(); // Maps sessionID to hostID (user.sub)
const socketToUser = new Map(); // Maps socket.id to user.sub

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-session", ({ sessionID, hostID }) => {
        socket.join(sessionID);

        // Store the mapping of socket to user
        if (hostID) {
            socketToUser.set(socket.id, hostID);
        }

        // Set host if this session doesn't have one yet and hostID is provided
        if (!sessionHosts.has(sessionID) && hostID) {
            sessionHosts.set(sessionID, hostID);
            console.log(`Set ${hostID} as host for session ${sessionID}`);
        }

        const sessionHost = sessionHosts.get(sessionID);

        // Send session info back to the client
        socket.emit("session-info", { hostID: sessionHost });
        console.log(`${socket.id} joined session ${sessionID}, host: ${sessionHost}`);
    });

    socket.on("update", ({ sessionID, fileName, responseText }) => {
        console.log(`Broadcasting update to session ${sessionID}: ${fileName}`);
        // Broadcast to all OTHER clients in the session (not the sender)
        socket.to(sessionID).emit("receive-update", { fileName, responseText });
    });

    socket.on("clear-image", (sessionID) => {
        console.log(`Broadcasting clear to session ${sessionID}`);
        // Broadcast to all OTHER clients in the session (not the sender)
        socket.to(sessionID).emit("image-cleared");
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);

        // Get the user ID for this socket
        const userID = socketToUser.get(socket.id);

        if (userID) {
            // Check if this user was hosting any sessions
            for (const [sessionID, hostID] of sessionHosts.entries()) {
                if (hostID === userID) {
                    sessionHosts.delete(sessionID);
                    io.to(sessionID).emit("host-disconnected");
                    console.log(`Host ${userID} disconnected from session ${sessionID}`);
                }
            }

            // Clean up the socket mapping
            socketToUser.delete(socket.id);
        }
    });
});

// Define the CORS options
const corsOptions = {
    credentials: true,
    origin: ["http://localhost:3000", "http://localhost:3001"],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use("/output", express.static("output"));

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
    PYTHON: "/api/examplePy",
    DB: "/api/getHistory",
    INSERT_DB: "/api/insertUpload",
    VIEW_DB: "/api/viewUpload",
    SQLITE: "/api/uploadSQL",
};

app.use(APP_ROUTES.INSERT_DB, insertUpload);
app.use(APP_ROUTES.VIEW_DB, viewUpload);
app.use(APP_ROUTES.PYTHON, examplePy);
app.use(APP_ROUTES.DB, getHistory);
app.use(APP_ROUTES.SQLITE, SQLITE);


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

// Start the HTTP + WebSocket server
const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;