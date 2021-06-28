import chalk from "chalk"
import BaseMiner from "./BaseMiner"

export default class BchMiner extends BaseMiner {
    ENTITY = "@BCH_clickbot"
    COIN_NAME = chalk.yellowBright("BCH")
    MIN_WITHDRAW = 0.00005
    ADDRESS = process.env.BCH_ADDRESS
}
