import chalk from "chalk"
import BaseMiner from "./BaseMiner"

export default class LtcMiner extends BaseMiner {
    ENTITY = "@Litecoin_click_bot"
    COIN_NAME = chalk.blueBright("LTC")
    MIN_WITHDRAW = 0.001
    ADDRESS = process.env.LTC_ADDRESS
}
