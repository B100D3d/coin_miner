import TelegramBot from "node-telegram-bot-api"
import Logger from "./logger"

const token = process.env.TELEGRAM_BOT_TOKEN
const chatId = "-1001307882428"
const bot = new TelegramBot(token)

class TelegramLogger {
    static async send(message) {
        try {
            let sendingMessage = `@a13xb\n${message}\n----------\n${new Date().toLocaleString()}`
            if (sendingMessage.length > 4096)
                sendingMessage = sendingMessage.slice(0, 4096)
            await bot.sendMessage(chatId, sendingMessage)
        } catch (e) {
            Logger.error("Can't send telegram log: ", e)
        }
    }

    static info(message: string) {
        TelegramBot.send(`✏️ INFO:\n----------\n${message}`)
    }

    static error(message: string) {
        TelegramBot.send(`💥 ERROR:\n----------\n${message}`)
    }
}

export default TelegramLogger
