import { TelegramClient } from "telegram"
import { StringSession } from "telegram/sessions"

interface TelegramApiData {
    apiId: number
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
    new TelegramClient(new StringSession(session), apiId, apiHash, {
        connectionRetries: 5,
    })
