import WebSocket from "ws"
import Logger from "../utils/logger"
import BaseMiner from "../miners/BaseMiner"
import { stringify } from "../utils"
import { parseMiner } from "../utils/miner"
import { LogItem } from "../utils/miner_logger"

export const users = new Set<WebSocket>()

export function createWebsocketServer(server) {
    const wss = new WebSocket.Server({ server, path: "/api/ws" })

    wss.on("connection", (user) => {
        users.add(user)
        user.on("close", () => users.delete(user))
    })
}

const broadcast = (payload) => {
    for (const user of users) {
        user.send(stringify(payload))
    }
}

export function notifyMinerUpdates(miner: BaseMiner) {
    const message = {
        type: "miner:update",
        phone: miner.session.phone,
        miner: parseMiner(miner),
    }
    broadcast(message)
}

export function notifyNewMinerLog(log: LogItem) {
    const message = {
        type: "new:log",
        log,
    }
    broadcast(message)
}
