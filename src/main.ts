import "./init.ts"
import express from "express"
import cors from "cors"
import input from "input"
import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import { Logger as TelegramLogger } from "telegram/extensions"
import bodyParser from "body-parser"
import cookieParser from "cookie-parser"
import apiRouter from "./routes/api"
import db from "./database"
import { PORT, origin } from "./config"
import Logger from "./utils/logger"
import LtcMiner from "./miners/LtcMiner"

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

    const client = new TelegramClient(
        new StringSession(
            "1AQAOMTQ5LjE1NC4xNjcuNTEAUDE0E3ULpXV34JZ27eRHMiWU12gwS3ojTLIar3Xnle41SwOUoW7MKjZzFSj+AORLFHJkfVu/yUGv/VLyt9mh4wRVWgRHaN65nort/d7iQfQXXrlOyjaa3iXjpkk9v/doIAWq12/79P7tp5doGCCa8xgLLvTHfunrPkMiychGvWHh1/pth3EQhZkTbc+PfdOYrZ4rBL7P0jQKtMD77y2NgroH+r8swwktXDVIaSmRGpynO+mfduDBTLBlxPrCCp/MPNS11tZycqysSGagBIu76kUl+icElhrb3MInM/dsbB2ZWLMJSywn+CNPa2460c0hX+iTP+8f4qBxEQKqiLeV40c="
        ),
        account.apiId,
        account.apiHash,
        { connectionRetries: 5 }
    )

    await client.start({
        phoneNumber: account.phone,
        phoneCode: async () => input.text("Phone code: "),
        password: async () => input.text("Password: "),
        onError: Logger.error,
    })

    const isAuthorized = await client.checkAuthorization()
    const isUserAuthorized = await client.isUserAuthorized()
    const me = await client.getMe()

    console.log({
        client,
        isAuthorized,
        isUserAuthorized,
        session: client.session.save(),
        me,
    })

    const ltcMiner = new LtcMiner(client, account.phone)
    await ltcMiner.startMining()
})
