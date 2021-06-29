import { RequestHandler } from "express"
import { serverError } from "../utils/error"
import Statistics, { StatisticsAttributes } from "../database/models/Statistics"
import { parseAccount, parseMiner } from "../utils/miner"
import MinersState from "../services/MinersState"
import MinerLogger from "../utils/miner_logger"

export const getMiners: RequestHandler = async (req, res) => {
    try {
        const bots = MinersState.bots

        const statistics = (await Statistics.getFullStatistics()).map(
            (s) => s.toJSON() as StatisticsAttributes
        )

        const accounts = Array.from(bots.entries()).map(([phone, miners]) => {
            const accountStatistics = statistics.find((s) => s.phone === phone)
            const parsedMiners = miners.map(parseMiner)
            return parseAccount(phone, parsedMiners, accountStatistics)
        })

        res.status(200).json({ accounts })
    } catch (e) {
        await serverError(res, e)
    }
}

export const getLogs: RequestHandler = async (req, res) => {
    try {
        const logs = MinerLogger.getLogs()

        res.status(200).json({ logs })
    } catch (e) {
        await serverError(res, e)
    }
}
