import { Api, TelegramClient } from "telegram"
import bigInt from "big-integer"
import Entity, { EntityAttributes } from "../database/models/Entity"
import db from "../database"

export default class InputEntities {
    private readonly phone: string
    private readonly client: TelegramClient
    private entitiesCache = new Map<string, Api.TypeInputPeer>()

    constructor(phone: string, client: TelegramClient) {
        this.phone = phone
        this.client = client
    }

    async getInputEntity(username: string | Api.TypeInputPeer) {
        if (typeof username !== "string") {
            return username
        }

        if (this.entitiesCache.has(username)) {
            return this.entitiesCache.get(username)
        }

        const dbEntity = await Entity.getEntity(this.phone, username)
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
                [`${type}Id`]: Number(id),
                accessHash: bigInt(accessHash),
            } as any

            const entity = new constructor(props)

            this.entitiesCache.set(username, entity)

            return entity
        }

        const entity = await this.client.getInputEntity(username)
        const accessHash = (entity as any).accessHash?.toString() || ""
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

        this.entitiesCache.set(username, entity)

        await db.transaction(async (t) => {
            await Entity.saveEntity(
                {
                    phone: this.phone,
                    username,
                    id,
                    accessHash,
                    type,
                },
                t
            )
        })

        return entity
    }
}
