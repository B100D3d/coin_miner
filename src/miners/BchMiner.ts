import chalk from "chalk"
import BaseMiner, { MinerProps } from "./BaseMiner"
import MinerLogger from "../utils/miner_logger"

export default class BchMiner extends BaseMiner {
    constructor(props: Omit<MinerProps, "logger">) {
        const coin = "BCH"
        const logger = new MinerLogger({
            phone: props.phone,
            coinName: chalk.yellowBright(coin),
        })
        super({ ...props, logger })
        this.ENTITY = "BCH_clickbot"
        this.COIN_NAME = coin
        this.MIN_WITHDRAW = 0.00005
        this.ADDRESS = process.env.BCH_ADDRESS
    }
}
