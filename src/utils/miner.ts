import BaseMiner from "../miners/BaseMiner"
import { StatisticsAttributes } from "../database/models/Statistics"

export const parseMiner = (miner: BaseMiner) => ({
    entity: miner.ENTITY,
    coin: miner.COIN_NAME,
    minWithdraw: miner.MIN_WITHDRAW,
    address: miner.ADDRESS,
    currentJob: miner.jobs.currentJob,
    state: miner.state,
    paused: miner.paused,
    completedTasks: miner.completedTasks,
    skippedTasks: miner.skippedTasks,
    balance: miner.balance,
    earned: miner.earned,
    startedAt: miner.startedAt,
    createdAt: miner.session.createdAt,
})

export const parseAccount = (
    phone: string,
    miners: Array<ReturnType<typeof parseMiner>>,
    accountStatistics?: StatisticsAttributes
) => ({
    phone,
    miners,
    allTimeCompletedTasks: accountStatistics?.completedTasks,
    allTimeSkippedTasks: accountStatistics?.skippedTasks,
    allTimeEarned: {
        LTC: accountStatistics.ltcEarned,
        ZEC: accountStatistics.zecEarned,
        BCH: accountStatistics.bchEarned,
    },
})
