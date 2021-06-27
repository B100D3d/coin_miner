import WebSocket from "ws"
import Logger from "../utils/logger"

export const users = new Set()

export async function handleJoin(user, token) {
    if (!token) {
        user.close()
        return
    }

    users.add(user)
}

export function handleClose(user) {
    users.delete(user)
}

export function createWebsocketServer(server) {
    const wss = new WebSocket.Server({ server, path: "/api/ws" })

    wss.on("connection", (user) => {
        user.on("message", async (message) => {
            try {
                const data = JSON.parse(message)
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
