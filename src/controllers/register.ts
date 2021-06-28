import { RequestHandler } from "express"
import { error, serverError } from "../utils/error"
import TelegramApiReg from "../services/TelegramApiReg"
import db from "../database"
import Session from "../database/models/Session"
import Statistics from "../database/models/Statistics"
import TelegramMiner from "../services/TelegramMiner"
import MinersState from "../services/MinersState"
import { parseAccount, parseMiner } from "../utils/miner"

export const getCode: RequestHandler = async (req, res) => {
    try {
        const phone = req.body.phone
        const hash = await TelegramApiReg.sendCode(phone)

        res.status(200).json({
            hash,
        })
    } catch (e) {
        await serverError(res, e)
    }
}

export const registerApi: RequestHandler = async (req, res) => {
    try {
        const { phone, code, hash } = req.body

        const api = await TelegramApiReg.createApi(phone, code, hash)
        if (!api) return error(res, 400, "Empty result")

        res.status(200).json({
            apiId: api.apiId,
            apiHash: api.apiHash,
        })
    } catch (e) {
        await serverError(res, e)
    }
}

export const addBot: RequestHandler = async (req, res) => {
    try {
        const { phone, apiId, apiHash, token } = req.body

        await db.transaction(async (t) => {
            const session = await Session.createSession(
                { phone, apiId, apiHash, token },
                t
            )
            const statistics = await Statistics.getAccountStatistics(phone, t)

            await TelegramMiner.launch(session)

            const bots = MinersState.bots
            const miners = bots.get(phone)
            const parsedMiners = miners.map(parseMiner)

            const account = parseAccount(phone, parsedMiners, statistics)
            res.status(200).json({ account })
        })
    } catch (e) {
        await serverError(res, e)
    }
}
