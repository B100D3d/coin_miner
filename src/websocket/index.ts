import WebSocket from "ws"
import Logger from "../utils/logger"
import BaseMiner from "../miners/BaseMiner"
import { stringify } from "../utils"
import { parseMiner } from "../utils/miner"
import { LogItem } from "../utils/miner_logger"

export const users = new Set<WebSocket>()

async function handleJoin(user, token) {
    if (token !== process.env.SERVER_PASSWORD) {
        user.close()
        return
    }

    users.add(user)
}

function handleClose(user) {
    users.delete(user)
}

export function createWebsocketServer(server) {
    const wss = new WebSocket.Server({ server, path: "/api/ws" })

    wss.on("connection", (user) => {
        user.on("message", async (message) => {
            try {
                const data = JSON.parse(message as string)
                switch (data.type) {
                    case "join":
                        await handleJoin(user, data.token)
                        break
                    default:
                        Logger.error("Unexpected websocket data type")
                        break
                }
            } catch (e) {
                Logger.error("Websocket message parse error", e)
            }
        })

        user.on("close", () => handleClose(user))
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
        phone: miner.phone,
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
