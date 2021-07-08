import { Api, TelegramClient } from "telegram"
import bigInt from "big-integer"
import Entity, { EntityAttributes } from "../database/models/Entity"
import db from "../database"

export default class InputEntities {
    private static entitiesCache = new Map<string, Api.TypeInputPeer>()

    static async getInputEntity(
        username: string | Api.TypeInputPeer,
        client: TelegramClient
    ) {
        console.log("get entity", { username })
        if (typeof username !== "string") {
            return username
        }

        if (InputEntities.entitiesCache.has(username)) {
            console.log(
                "InputEntities has username: ",
                InputEntities.entitiesCache.get(username)
            )
            return InputEntities.entitiesCache.get(username)
        }

        const dbEntity = await Entity.getEntity(username)
        if (dbEntity) {
            const { type, id, accessHash } =
                dbEntity.toJSON() as EntityAttributes
            console.log("Has db entity: ", { type, id, accessHash })
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

            console.log({ constructor, props })

            const entity = new constructor(props)
            InputEntities.entitiesCache.set(username, entity)

            return entity
        }

        const entity = await client.getInputEntity(username)
        console.log("Get input entity from client: ", { entity })
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

        InputEntities.entitiesCache.set(username, entity)

        await db.transaction(async (t) => {
            await Entity.saveEntity({ username, id, accessHash, type }, t)
        })

        return entity
    }
}
