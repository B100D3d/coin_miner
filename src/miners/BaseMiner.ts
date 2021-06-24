import chalk from "chalk"
import crypto from "crypto"
import { TelegramClient, Api } from "telegram"
import { NewMessageEvent, NewMessage } from "telegram/events"
import { FloodWaitError } from "telegram/errors"
import { random, stringify, timeout } from "../utils"
import MinerLogger from "../utils/miner_logger"

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

        this.setBalanceTimeout()
    }

    private setBalanceTimeout() {
        setTimeout(
            () => (this.needCheckBalance = !this.needCheckBalance),
            random(ONE_HOUR - FIVE_MINUTES, ONE_HOUR + FIVE_MINUTES)
        )
    }

    private async trySkip(func, event) {
        try {
            await func()
        } catch (e) {
            if (e instanceof FloodWaitError) {
                this.logger.warning(`Waiting flood wait error...${e}`)
                await this.sleep(e.seconds)
                await this.trySkip(func, event)
                return
            }

            this.logger.error(e)
            await this.skipTask(event)
        }
    }

    private async startClickBot() {
        await this.client.invoke(new Api.contacts.Unblock({ id: this.ENTITY }))
        await this.client.invoke(
            new Api.messages.StartBot({
                bot: this.ENTITY,
                peer: this.ENTITY,
                startParam: START_REFERRAL_CODE,
            })
        )
    }

    private async startJob() {
        await this.client.sendMessage(this.ENTITY, { message: this.currentJob })
    }

    private async sleep(seconds: number) {
        this.logger.log(`Sleep ${seconds} seconds...`)
        await timeout(seconds * 1000)
    }

    private getButton(event: any, pattern: string) {
        const markup = event.message.replyMarkup
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

    private async showEvent(event) {
        if (event.originalUpdate.className !== "UpdateNewMessage") return
        if (event.message.replyMarkup?.className !== "ReplyInlineMarkup") return

        const markup = event.message.replyMarkup
        const firstButton = markup.rows?.[0].buttons?.[0]
        const text = firstButton?.text
        const url = firstButton?.url

        const handlers = {
            website: (event, url) => {},
            bot: (event, url) => {},
            channel: (event, url) => {},
            group: (event, url) => {},
        }

        for (const [type, handler] of Object.entries(handlers)) {
            if (text.includes(type)) {
                this.logger.log(
                    chalk.cyan(
                        `Got message, ${type} handler will start after 2 seconds...`
                    )
                )
                await this.sleep(2)

                await this.trySkip(() => handler(event, url), event)
                return
            }
        }
    }

    async startMining() {
        console.log(chalk.cyan(`Start mining with ${this.COIN_NAME} miner...`))
        const chats = [this.ENTITY]

        this.client.addEventHandler(
            (event) => this.showEvent(event),
            new NewMessage({ chats })
        )

        await this.startClickBot()
        await this.startJob()
    }
}
