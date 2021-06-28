import chalk from "chalk"
import BaseMiner from "./BaseMiner"

export default class ZecMiner extends BaseMiner {
    ENTITY = "@Zcash_click_bot"
    COIN_NAME = chalk.magentaBright("ZEC")
    MIN_WITHDRAW = 0.0002
    ADDRESS = process.env.ZEC_ADDRESS
}
