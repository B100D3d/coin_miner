import moment from "moment"
import chalk from "chalk"
import { notifyNewMinerLog } from "../websocket"

interface MinerLoggerSettings {
    phone: string
    coinName: string
}

type LogType = "info" | "warning" | "error"
export interface LogItem {
    id: number
    type: LogType
    message: string
    date: Date
}

const MAX_LOGS_COUNT = 100000
const time = () => moment().format("hh:mm:ss")
const getLogId = (logs: Array<LogItem>) => {
    return logs.length ? logs[logs.length - 1].id + 1 : 0
}

class MinerLogger {
    private readonly phone: string
    private readonly name: string
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
        const logItem: LogItem = {
            id: getLogId(MinerLogger.logsList),
            type,
            message,
            date: new Date(),
        }
        if (MinerLogger.logsList.length === MAX_LOGS_COUNT) {
            MinerLogger.logsList.shift()
        }
        MinerLogger.logsList.push(logItem)
        notifyNewMinerLog(logItem)
    }

    error(msg: string) {
        this.log(chalk.red(`Error: ${msg}`), "error")
    }

    warning(msg: string) {
        this.log(chalk.yellow(msg), "warning")
    }
}

export default MinerLogger
