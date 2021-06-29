import { RequestHandler } from "express"
import { error, serverError } from "../utils/error"
import TelegramApiReg from "../services/TelegramApiReg"
import db from "../database"
import Session, { SessionAttributes } from "../database/models/Session"
import Statistics, { StatisticsAttributes } from "../database/models/Statistics"
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

        const existedSession = await Session.getSession(phone)

        if (existedSession) {
            return error(res, 400, "Session for this number already exists")
        }

        const account = await db.transaction(async (t) => {
            const session = await Session.createSession(
                { phone, apiId, apiHash, token },
                t
            )
            const statistics = await Statistics.getAccountStatistics(phone, t)

            await TelegramMiner.launch(session.toJSON() as SessionAttributes)

            const bots = MinersState.bots
            const miners = bots.get(phone)
            const parsedMiners = miners.map(parseMiner)

            return parseAccount(
                phone,
                parsedMiners,
                statistics.toJSON() as StatisticsAttributes
            )
        })

        res.status(200).json({ account })
    } catch (e) {
        await serverError(res, e)
    }
}
