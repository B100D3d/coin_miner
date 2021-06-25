import moment from "moment"
import chalk from "chalk"

interface MinerLoggerSettings {
    phone: string
    coinName: string
}

const time = () => moment().format("hh:mm:ss")

class MinerLogger {
    private readonly phone
    private readonly name
    constructor({ phone, coinName }: MinerLoggerSettings) {
        this.phone = phone
        this.name = coinName
    }

    log(msg: string) {
        console.log(
            `${chalk.cyan(`[${time()}]`)} (${this.name} | ${this.phone}) ${msg}`
        )
    }

    error(msg: string) {
        this.log(chalk.red(`Error: ${msg}`))
    }

    warning(msg: string) {
        this.log(chalk.yellow(msg))
    }
}

export default MinerLogger
