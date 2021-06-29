import { TelegramClient } from "telegram"
import { SessionAttributes } from "../database/models/Session"
import { getTelegramClient, startTelegramClient } from "./TelegramClient"
import MinersState from "./MinersState"
import MinerBuilder from "../miners/MinerBuilder"

export default class TelegramMiner {
    static async launch(
        sessions: SessionAttributes | Array<SessionAttributes>
    ) {
        if (!Array.isArray(sessions)) sessions = [sessions]
        if (!sessions.length) return

        const clients = new Map<string, TelegramClient>()
        for (const session of sessions) {
            const client = await getTelegramClient({
                session: session.token,
                apiId: session.apiId,
                apiHash: session.apiHash,
            })
            await startTelegramClient(client, session.phone)
            clients.set(session.phone, client)
        }

        for (const [phone, client] of clients.entries()) {
            const miners = MinerBuilder.build(client, phone)
            MinersState.addBot(phone, miners)
            miners.forEach((miner) => miner.startMining())
        }
    }
}
