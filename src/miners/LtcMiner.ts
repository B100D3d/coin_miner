import chalk from "chalk"
import BaseMiner, { MinerProps } from "./BaseMiner"
import MinerLogger from "../utils/miner_logger"

export default class LtcMiner extends BaseMiner {
    constructor(props: Omit<MinerProps, "logger">) {
        const coin = "LTC"
        const logger = new MinerLogger({
            phone: props.phone,
            coinName: chalk.blueBright(coin),
        })
        super({ ...props, logger })
        this.ENTITY = "Litecoin_click_bot"
        this.COIN_NAME = coin
        this.MIN_WITHDRAW = 0.001
        this.ADDRESS = process.env.LTC_ADDRESS
    }
}
