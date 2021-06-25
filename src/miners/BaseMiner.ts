import chalk from "chalk"
import crypto from "crypto"
import { parse as parseHTML } from "node-html-parser"
import { TelegramClient, Api } from "telegram"
import { NewMessageEvent, NewMessage } from "telegram/events"
import { FloodWaitError } from "telegram/errors"
import { random, stringify, timeout } from "../utils"
import MinerLogger from "../utils/miner_logger"
import Logger from "../utils/logger"
import * as FlareSolver from "../services/FlareSolver"
import axios from "axios"

type Job = "Visit sites" | "Message bots" | "Join chats"

const START_REFERRAL_CODE = process.env.START_REFERRAL_CODE

const NO_ADS_PATTERS = "Sorry, there are no new ads available."
const EARNED_PATTERN = /.*you earned.*/gi
const CANNOT_PATTERN = "We cannot"
const NO_VALID_PATTERN = "Sorry, that task"
const BALANCE_PATTERN = "Available balance"
const WITHDRAW_PATTERN = "To withdraw, enter"

const ONE_HOUR = 1000 * 60 * 60
const FIVE_MINUTES = 1000 * 60 * 5

const BALANCE_GETTER = "💰 Balance"
const WITHDRAW_QUERY = "💵 Withdraw"

const START_COMMAND = "/start"

const MAX_CHANNELS_PER_HOUR = 10
const JOBS: Array<Job> = ["Visit sites", "Message bots", "Join chats"]

export default class BaseMiner {
    client: TelegramClient
    phone: string
    logger: MinerLogger

    ENTITY = ""
    COIN_NAME = ""
    MIN_WITHDRAW = 0
    ADDRESS = ""

    currentJob = JOBS[0]
    needCheckBalance = false
    joinedChannels = 0
    balance = 0
    earned = 0

    constructor(client: TelegramClient, phone: string) {
        this.client = client
        this.phone = phone
        this.logger = new MinerLogger({ phone, coinName: this.COIN_NAME })
    }

    private setBalanceTimeout() {
        setTimeout(
            () => (this.needCheckBalance = !this.needCheckBalance),
            random(ONE_HOUR - FIVE_MINUTES, ONE_HOUR + FIVE_MINUTES)
        )
    }

    private async sendMessage(message: string) {
        await this.client.sendMessage(this.ENTITY, { message })
    }

    private async startJob() {
        await this.sendMessage(this.currentJob)
    }

    private async checkBalance() {
        await this.sendMessage(BALANCE_GETTER)
    }

    private async sleep(seconds: number) {
        this.logger.log(`Sleep ${seconds} seconds...`)
        await timeout(seconds * 1000)
    }

    private getButton(event: NewMessageEvent, pattern: string) {
        const markup = event.message.replyMarkup as Api.ReplyKeyboardMarkup
        const rows = markup.rows
        const buttons = rows.flatMap((row) => row.buttons)
        const button = buttons.find((b) => b.text.includes(pattern))
        if (!button) return null

        const index = buttons.indexOf(button)
        return { button, index }
    }

    private async skipTask(event) {
        this.logger.log("Skip task")
        const skipButton = this.getButton(event, "Skip")
        if (skipButton) {
            await this.sleep(2)
            await event.message.click(skipButton.index)
        }
    }

    private async switchJob() {
        const currentIndex = JOBS.indexOf(this.currentJob)
        if (currentIndex === JOBS.length - 1) {
            this.currentJob = JOBS[0]

            if (this.needCheckBalance) {
                await this.checkBalance()
                this.needCheckBalance = !this.needCheckBalance
                this.setBalanceTimeout()
            }

            this.logger.log(chalk.magenta("All jobs completed. Waiting now..."))
            await this.sleep(120)
            await this.startJob()
            return
        }

        this.currentJob = JOBS[currentIndex + 1]
        this.logger.log(chalk.blue(`Switch to ${this.currentJob} job`))
        await this.sleep(2)
        await this.startJob()
    }

    private async trySkip(func, event) {
        try {
            await func()
        } catch (e) {
            if (e instanceof FloodWaitError) {
                this.logger.warning(`Waiting flood wait error...${e}`)
                await this.sleep(e.seconds)
                this.trySkip(func, event)
                return
            }

            this.logger.error(e)
            await this.skipTask(event)
        }
    }

    private async startBot(entity: string, startParam?: string) {
        await this.client.invoke(new Api.contacts.Unblock({ id: entity }))
        if (startParam) {
            await this.client.invoke(
                new Api.messages.StartBot({
                    bot: entity,
                    peer: entity,
                    startParam,
                })
            )
        } else {
            await this.client.sendMessage(entity, { message: "/start" })
        }
    }

    private async startClickBot() {
        await this.startBot(this.ENTITY, START_REFERRAL_CODE)
    }

    private async websiteHandler(event: NewMessageEvent, url) {
        this.logger.log(`Visit site ${url}`)

        const req = await FlareSolver.get(url)
        const html = parseHTML(req.response)

        const bar = html.querySelector("#headbar")
        if (!bar) return

        const barCode = bar.getAttribute("data-code")
        const barTime = +bar.getAttribute("data-timer")
        const barToken = bar.getAttribute("data-token")
        if (!barCode || !barToken) {
            this.logger.warning("Site with headbar has no code or token")
            await this.skipTask(event)
        }

        this.logger.log(`Waiting for a headbar timer: ${barTime} seconds...`)
        await this.sleep(barTime)
        const parsedUrl = new URL(url)
        const rewardUrl = `${parsedUrl.protocol}://${parsedUrl.hostname}/reward`
        await axios.post(rewardUrl, { code: barCode, token: barToken })
    }

    private async mainHandler(event: NewMessageEvent) {
        if (event.originalUpdate instanceof Api.UpdateNewMessage) return
        if (event.message.replyMarkup instanceof Api.ReplyInlineMarkup) return

        const markup = event.message.replyMarkup as Api.ReplyKeyboardMarkup
        const buttons = markup.rows.flatMap((row) => row.buttons)
        const firstButton = buttons[0]

        if (!(firstButton instanceof Api.KeyboardButtonUrl)) return

        const text = firstButton.text
        const url = firstButton.url

        const handlers = {
            website: this.websiteHandler.bind(this),
            bot: (event, url) => {},
            channel: (event, url) => {},
            group: (event, url) => {},
        }

        const type = Object.keys(handlers).find(([t]) => text.includes(t))
        if (!type) return
        const handler = handlers[type]

        this.logger.log(
            chalk.cyan(
                `Got message, ${type} handler will start after 2 seconds...`
            )
        )
        await this.sleep(2)
        await this.trySkip(() => handler(event, url), event)
    }

    async startMining() {
        Logger.log(chalk.cyan(`Start mining with ${this.COIN_NAME} miner...`))
        const chats = [this.ENTITY]

        this.client.addEventHandler(
            (event) => this.mainHandler(event),
            new NewMessage({ chats })
        )

        this.setBalanceTimeout()
        await this.startClickBot()
        await this.checkBalance()
        await this.startJob()
    }
}
