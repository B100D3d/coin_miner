import chalk from "chalk"
import moment from "moment"

const date = () => moment().format("DD.MM.YYYY hh:mm:ss")
class Logger {
    static log(...text: Array<any>): void {
        console.log(chalk.cyan(`[${date()}]`), ...text)
    }

    static info(...text: Array<any>): void {
        Logger.log(chalk.white.bold("✏️ INFO: "), ...text)
    }

    static error(...text: Array<any>): void {
        Logger.log(chalk.red.bold("💥 ERROR: "), ...text)
    }

    static database(msg: any): void {
        Logger.log(chalk.blueBright.bold("🗃 DB: "), msg)
    }
}

export default Logger
