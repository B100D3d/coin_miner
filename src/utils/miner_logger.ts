import moment from "moment"
import chalk from "chalk"

interface MinerLoggerSettings {
    phone: string
    coinName: string
}

type LogType = "info" | "warning" | "error"
interface LogItem {
    type: LogType
    message: string
    date: Date
}

const time = () => moment().format("hh:mm:ss")

class MinerLogger {
    private readonly phone
    private readonly name
    constructor({ phone, coinName }: MinerLoggerSettings) {
        this.phone = phone
        this.name = coinName
    }

    static logsList: Array<LogItem> = []
    static getLogs(): Array<LogItem> {
        return MinerLogger.logsList
    }

    log(msg: string, type: LogType = "info") {
        const message = `${chalk.cyan(`[${time()}]`)} (${this.name} | ${
            this.phone
        }) ${msg}`
        console.log(message)
        MinerLogger.logsList.push({
            type,
            message,
            date: new Date(),
        })
    }

    error(msg: string) {
        this.log(chalk.red(`Error: ${msg}`), "error")
    }

    warning(msg: string) {
        this.log(chalk.yellow(msg), "warning")
    }
}

export default MinerLogger
