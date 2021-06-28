import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"
import Logger from "../utils/logger"

interface TelegramApiData {
    apiId: number | string
    apiHash: string
}

interface GetTelegramClientProps extends TelegramApiData {
    session: string
}

export const getTelegramClient = async ({
    session,
    apiId,
    apiHash,
}: GetTelegramClientProps) =>
    new TelegramClient(new StringSession(session), +apiId, apiHash, {
        connectionRetries: 5,
    })

export const startTelegramClient = async (
    client: TelegramClient,
    phone: string
) => {
    await client.start({
        phoneNumber: phone,
        phoneCode: async () => "",
        password: async () => "",
        onError: Logger.error,
    })
    Logger.info(`${phone} client started`)
}
