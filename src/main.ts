import "./init.ts"
import express from "express"
import cors from "cors"
import { Logger as TelegramLogger } from "telegram/extensions"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import apiRouter from "./routes/api"
import db from "./database"
import { PORT, origin } from "./config"
import Logger from "./utils/logger"

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

app.listen(PORT, async () => {
    console.log(`🚀 started on port ${PORT}`)

    try {
        await db.authenticate()
    } catch (e) {
        Logger.error("Unable to connect to the database", e)
    }

    TelegramLogger.setLevel("error")

    const account = {
        phone: "89286668739",
        apiId: 1054053,
        apiHash: "66ff7a067bb13c9b2319de56103249c0",
    }
})
