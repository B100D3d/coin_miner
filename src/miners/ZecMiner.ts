import chalk from "chalk"
import BaseMiner, { MinerProps } from "./BaseMiner"
import MinerLogger from "../utils/miner_logger"

export default class ZecMiner extends BaseMiner {
    constructor(props: Omit<MinerProps, "logger">) {
        const coin = "ZEC"
        const logger = new MinerLogger({
            phone: props.session.phone,
            coinName: chalk.magentaBright(coin),
        })
        super({ ...props, logger })
        this.ENTITY = "Zcash_click_bot"
        this.COIN_NAME = coin
        this.MIN_WITHDRAW = 0.0002
        this.ADDRESS = process.env.ZEC_ADDRESS
    }
}
