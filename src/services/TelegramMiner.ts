import { TelegramClient } from "telegram"
import { SessionAttributes } from "../database/models/Session"
import { getTelegramClient, startTelegramClient } from "./TelegramClient"
import MinersState from "./MinersState"
import MinerBuilder from "../miners/MinerBuilder"
import TelegramLogger from "../utils/telegram_logger"
import { stringify } from "../utils"
import { serializeError } from "serialize-error"

export default class TelegramMiner {
    static async launch(
        sessions: SessionAttributes | Array<SessionAttributes>
    ) {
        if (!Array.isArray(sessions)) sessions = [sessions]
        if (!sessions.length) return

        const clients = new Map<SessionAttributes, TelegramClient>()
        for (const session of sessions) {
            try {
                const client = await getTelegramClient({
                    session: session.token,
                    apiId: session.apiId,
                    apiHash: session.apiHash,
                })
                await startTelegramClient(client, session.phone)
                clients.set(session, client)
            } catch (e) {
                console.error(e)
                TelegramLogger.error(
                    `Error starting ${session.phone} client:\n${stringify(
                        serializeError(e)
                    )}`
                )
            }
        }

        for (const [session, client] of clients.entries()) {
            const miners = MinerBuilder.build(client, session)
            MinersState.addBot(session.phone, miners)
            miners.forEach((miner) => miner.startMining())
        }
    }
}
