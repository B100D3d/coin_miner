import "./init.ts"
import express from "express"
import http from "http"
import cors from "cors"
import { Logger as TelegramLogger } from "telegram/extensions"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import apiRouter from "./routes/api"
import db from "./database"
import { PORT, origin } from "./config"
import Logger from "./utils/logger"
import { createWebsocketServer } from "./websocket"
import Session, { SessionAttributes } from "./database/models/Session"
import TelegramMiner from "./services/TelegramMiner"
import FlareSolver from "./services/FlareSolver"

const app = express()

app.use(
    cors({
        origin,
        credentials: true,
        methods: ["GET", "POST"],
        allowedHeaders:
            "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Origin, Authorization",
    })
)
    .use(bodyParser())
    .use(cookieParser())
    .use("/api", apiRouter)

const server = http.createServer(app)

server.listen(PORT, async () => {
    console.log(`🚀 started on port ${PORT}`)

    try {
        await db.authenticate()
    } catch (e) {
        Logger.error("Unable to connect to the database", e)
    }

    await createWebsocketServer(server)

    TelegramLogger.setLevel("error")

    await FlareSolver.createSession()

    const sessions = await Session.getSessions()
    await TelegramMiner.launch(
        sessions.map((s) => s.toJSON() as SessionAttributes)
    )
})
