import BaseMiner from "../miners/BaseMiner"
import { StatisticsAttributes } from "../database/models/Statistics"

export const parseMiner = (miner: BaseMiner) => ({
    entity: miner.ENTITY,
    coin: miner.COIN_NAME,
    minWithdraw: miner.MIN_WITHDRAW,
    address: miner.ADDRESS,
    currentJob: miner.currentJob,
    state: miner.state,
    completedTasks: miner.completedTasks,
    skippedTasks: miner.skippedTasks,
    balance: miner.balance,
    earned: miner.earned,
    startedAt: miner.startedAt,
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
    allTimeEarned: accountStatistics?.earned,
})
