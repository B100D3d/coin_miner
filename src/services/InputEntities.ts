import Entity, { EntityAttributes } from "../database/models/Entity"
import db from "../database"
import { Api, TelegramClient } from "telegram"
import bigInt from "big-integer"

export default class InputEntities {
    static async getInputEntity(username: string, client: TelegramClient) {
        let dbEntity = await Entity.getEntity(username)
        if (dbEntity) {
            const { type, id, accessHash } =
                dbEntity.toJSON() as EntityAttributes
            const constructor =
                type === "user"
                    ? Api.InputPeerUser
                    : type === "chat"
                    ? Api.InputPeerChat
                    : Api.InputPeerChannel

            const props = {
                [`${type}Id`]: id,
                accessHash: bigInt(accessHash),
            } as any

            return new constructor(props)
        }

        const entity = await client.getInputEntity(username)
        const accessHash = (entity as any).accessHash
        let id = null
        let type = null
        if (entity instanceof Api.InputPeerUser) {
            id = entity.userId
            type = "user"
        } else if (entity instanceof Api.InputPeerChannel) {
            id = entity.channelId
            type = "channel"
        } else if (entity instanceof Api.InputPeerChat) {
            id = entity.chatId
            type = "chat"
        }

        if (!id) throw new Error("Entity have no id")

        await db.transaction(async (t) => {
            await Entity.saveEntity({ username, id, accessHash, type }, t)
        })

        return entity
    }
}
