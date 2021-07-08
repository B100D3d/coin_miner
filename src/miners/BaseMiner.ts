import chalk from "chalk"
import { parse as parseHTML } from "node-html-parser"
import axios from "axios"
import moment from "moment"
import qs from "querystring"
import { TelegramClient, Api } from "telegram"
import { NewMessageEvent, NewMessage } from "telegram/events"
import { FloodWaitError } from "telegram/errors"
import { serializeError } from "serialize-error"
import { getFirstDigits, random, stringify, timeout } from "../utils"
import { notifyMinerUpdates } from "../websocket"
import db from "../database"
import MinerLogger from "../utils/miner_logger"
import TelegramLogger from "../utils/telegram_logger"
import FlareSolver from "../services/FlareSolver"
import Queue from "../utils/queue"
import JoinedChannels from "../database/models/JoinedChannels"
import Statistics from "../database/models/Statistics"
import { SessionAttributes } from "../database/models/Session"
import InputEntities from "../services/InputEntities"

type Job = "Visit sites" | "Message bots" | "Join chats"
type State = "working" | "sleep"

const START_REFERRAL_CODES = {
    LTC: process.env.LTC_START_REFERRAL_CODE,
    BCH: process.env.BCH_START_REFERRAL_CODE,
    ZEC: process.env.ZEC_START_REFERRAL_CODE,
}

const NO_ADS_PATTERN = /Sorry, there are no new ads available./g
const EARNED_PATTERN = /.*you earned.*/gi
const CANNOT_PATTERN = /We cannot/g
const NO_VALID_PATTERN = /Sorry, that task/g
const BALANCE_PATTERN = /Available balance/g
const WITHDRAW_ADDRESS_PATTERN = /To withdraw, enter/g
const WITHDRAW_AMOUNT_PATTERN = /Enter the amount to withdraw/g
const WITHDRAW_CONFIRM_PATTERN = /Are you sure you want to send/g
const AGREE_PATTERN = /you must agree to our/g

const ONE_HOUR = 1000 * 60 * 60
const FIVE_MINUTES = 1000 * 60 * 5

const BALANCE_GETTER = "💰 Balance"
const WITHDRAW_QUERY = "💵 Withdraw"
const MAX_AMOUNT_WITHDRAW = "💰 Max amount"
const WITHDRAW_CONFIRM = "✔️ Confirm"

const MAX_CHANNELS_PER_HOUR = 30
const JOBS: Array<Job> = ["Visit sites", "Message bots", "Join chats"]

export interface MinerProps {
    client: TelegramClient
    session: SessionAttributes
    channelsQueue: Queue
    logger: MinerLogger
}

export default class BaseMiner {
    client: TelegramClient
    session: SessionAttributes
    logger: MinerLogger
    channelsQueue: Queue

    ENTITY = ""
    COIN_NAME = ""
    MIN_WITHDRAW = 0
    ADDRESS = ""

    currentJob = JOBS[0]
    needCheckBalance = false
    balance = 0
    earned = 0
    completedTasks = 0
    skippedTasks = 0

    paused = true
    state: State = "working"
    startedAt = null
    balanceTimeout = null

    constructor({ client, session, channelsQueue, logger }: MinerProps) {
        this.client = client
        this.session = session
        this.logger = logger
        this.channelsQueue = channelsQueue

        this.client.addEventHandler(
            (event) => this.filterEvent(event),
            new NewMessage({})
        )
    }

    private getInputEntity(entity: string | Api.TypeInputPeer) {
        return InputEntities.getInputEntity(entity, this.client)
    }

    private setBalanceTimeout() {
        if (this.balanceTimeout) {
            clearTimeout(this.balanceTimeout)
        }
        this.balanceTimeout = setTimeout(
            () => (this.needCheckBalance = true),
            random(ONE_HOUR - FIVE_MINUTES, ONE_HOUR + FIVE_MINUTES)
        )
    }

    private async sendMessage(
        message: string,
        entity: string | Api.TypeInputPeer = this.ENTITY
    ) {
        const inputEntity = await this.getInputEntity(entity)
        await this.client.invoke(
            new Api.messages.SendMessage({
                peer: inputEntity,
                message,
            })
        )
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
        const markup = event.message.replyMarkup as Api.ReplyInlineMarkup
        const rows = markup.rows
        const buttons = rows.flatMap((row) => row.buttons)
        return buttons.find((b) => b.text.includes(pattern))
    }

    private async clickButton(
        messageId: number,
        button: Api.KeyboardButtonCallback
    ) {
        const inputEntity = await this.getInputEntity(this.ENTITY)
        await this.client.invoke(
            new Api.messages.GetBotCallbackAnswer({
                peer: inputEntity,
                msgId: messageId,
                data: button.data,
            })
        )
    }

    private async skipTask(event: NewMessageEvent) {
        this.logger.log("Skip task")
        const skipButton = this.getButton(event, "Skip")
        if (skipButton instanceof Api.KeyboardButtonCallback) {
            await this.sleep(2)
            await this.clickButton(event.message.id, skipButton)
        }
    }

    private async switchJob() {
        const currentIndex = JOBS.indexOf(this.currentJob)
        if (currentIndex === JOBS.length - 1) {
            this.currentJob = JOBS[0]

            if (this.needCheckBalance) {
                await this.checkBalance()
                this.needCheckBalance = false
                this.setBalanceTimeout()
            }

            this.logger.log(chalk.magenta("All jobs completed. Waiting now..."))
            this.state = "sleep"
            await this.sleep(120)
            this.state = "working"
            await this.startJob()
            return
        }

        this.currentJob = JOBS[currentIndex + 1]
        this.logger.log(chalk.blue(`Switch to ${this.currentJob} job`))
        await this.sleep(2)
        await this.startJob()
    }

    private async catchFlood(func: CallableFunction) {
        try {
            await func()
        } catch (e) {
            if (e instanceof FloodWaitError) {
                this.logger.warning(`Waiting flood wait error...${e}`)
                TelegramLogger.error(
                    `Flood error on ${this.session.phone} | ${
                        this.COIN_NAME
                    }.\n${stringify(serializeError(e))}`
                )
                await this.sleep(e.seconds)
                await this.catchFlood(func)
            } else {
                throw e
            }
        }
    }

    /**
     * executes function inside try/catch block and skip task on error
     * @param func
     * @param event
     * @returns {boolean} true if function completed and false on error
     */
    private async trySkip(func: CallableFunction, event: NewMessageEvent) {
        try {
            await this.catchFlood(func)
            return true
        } catch (e) {
            this.logger.error(e)
            await this.skipTask(event)
            return false
        }
    }

    private async startBot(
        entity: string | Api.TypeInputPeer,
        startParam?: string
    ) {
        const inputEntity = await this.getInputEntity(entity)
        await this.client.invoke(new Api.contacts.Unblock({ id: inputEntity }))
        if (startParam) {
            await this.client.invoke(
                new Api.messages.StartBot({
                    bot: inputEntity,
                    peer: inputEntity,
                    startParam,
                })
            )
        } else {
            await this.sendMessage("/start", entity)
        }
    }

    private async startClickBot() {
        await this.startBot(this.ENTITY, START_REFERRAL_CODES[this.COIN_NAME])
    }

    private async blockBot(entity: string | Api.TypeInputPeer) {
        const inputEntity = await this.getInputEntity(entity)
        await this.client.invoke(new Api.contacts.Block({ id: inputEntity }))
        await this.client.invoke(
            new Api.messages.DeleteHistory({
                maxId: 0,
                peer: inputEntity,
            })
        )
    }

    private async leaveChannels() {
        this.logger.log(chalk.magenta("Leaving channels..."))
        const dialogs = await this.client.getDialogs({})
        const entities = dialogs.map((dialog) => dialog.entity)
        const channels = entities.filter(
            (entity) => entity instanceof Api.Channel
        ) as Array<Api.Channel>

        const dayAgo = moment().subtract(1, "day").toDate()
        const filteredChannels = channels.filter(
            (channel) => new Date(channel.date) < dayAgo
        )

        const leave = async (channel: Api.TypeEntityLike) => {
            await this.client.invoke(new Api.channels.LeaveChannel({ channel }))
        }
        for (const channel of filteredChannels) {
            await this.catchFlood(() => leave(channel))
        }
        await this.sleep(2)
    }

    private async joinChannel(channel: string) {
        const inputEntity = await this.getInputEntity(channel)
        await this.client.invoke(
            new Api.channels.JoinChannel({ channel: inputEntity })
        )
    }

    private async channelsHandler(event: NewMessageEvent, url: string) {
        const req = await FlareSolver.get(url)
        const reqUrl = new URL(req.url)
        const channel = reqUrl.pathname.replace(/\//g, "")
        const job = Symbol(channel)
        try {
            await this.channelsQueue.wait(job)

            const joinedChannels = await JoinedChannels.getJoinedCount(
                this.session.phone
            )
            if (joinedChannels >= MAX_CHANNELS_PER_HOUR) {
                return this.switchJob()
            }

            const join = async () => {
                this.logger.log(`Join channel ${channel}`)
                try {
                    await this.catchFlood(() => this.joinChannel(channel))
                    await db.transaction(async (t) => {
                        await JoinedChannels.incrementJoinedCount(
                            this.session.phone,
                            t
                        )
                    })
                    const joinedButton = this.getButton(event, "Joined")
                    if (joinedButton instanceof Api.KeyboardButtonCallback) {
                        await this.sleep(random(40, 50))
                        await this.clickButton(event.message.id, joinedButton)
                        this.logger.log(
                            `Channel ${channel} successfully joined`
                        )
                    } else {
                        await this.skipTask(event)
                    }
                } catch (e) {
                    this.logger.error(`Join channel ${channel} error: ${e}`)
                    console.log(e.message)
                    if (e.message === "CHANNELS_TOO_MUCH") {
                        await this.leaveChannels()
                        await join()
                    } else {
                        await this.skipTask(event)
                    }
                }
            }
            await join()
        } finally {
            this.channelsQueue.end(job)
        }
    }

    private async botsHandler(event: NewMessageEvent, url: string) {
        const req = await FlareSolver.get(url)
        const reqUrl = new URL(req.url)
        const startParam = reqUrl.searchParams.get("start")
        const bot = reqUrl.pathname.replace(/\//g, "")
        const inputEntity = await this.getInputEntity(bot)
        const currentEntity = await this.getInputEntity(this.ENTITY)

        await this.startBot(inputEntity, startParam)

        this.logger.log(`Messaged to bot ${bot}, waiting for answer...`)
        await this.sleep(10)

        const messages = await this.client
            .getMessages(inputEntity, {
                fromUser: inputEntity,
            })
            .catch(() => [])

        if (messages.length === 0) {
            this.logger.error(`Bot ${bot} didn't answer`)
            await this.blockBot(inputEntity)
            await this.skipTask(event)
            return
        }

        const message = messages[0]
        await this.client.forwardMessages(currentEntity, {
            messages: [message.id],
            fromPeer: inputEntity,
        })
        await this.blockBot(inputEntity)
    }

    private async websiteHandler(event: NewMessageEvent, url: string) {
        this.logger.log(`Visit site ${url}`)

        const { url: reqUrl, userAgent, response } = await FlareSolver.get(url)
        const html = parseHTML(response)

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
        const parsedUrl = new URL(reqUrl)
        const rewardUrl = `${parsedUrl.origin}/reward`
        const { data } = await axios.post(
            rewardUrl,
            qs.stringify({
                code: barCode,
                token: barToken,
            }),
            {
                headers: {
                    origin: parsedUrl.origin,
                    referer: reqUrl,
                    "user-agent": userAgent,
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8",
                },
            }
        )
        if (data.error) {
            throw new Error(`Reward error: ${data.error}`)
        }
    }

    private async mainHandler(event: NewMessageEvent) {
        if (!(event.message.replyMarkup instanceof Api.ReplyInlineMarkup))
            return

        const markup = event.message.replyMarkup
        const buttons = markup.rows.flatMap((row) => row.buttons)
        const firstButton = buttons[0]

        if (!(firstButton instanceof Api.KeyboardButtonUrl)) return

        const text = firstButton.text
        const url = firstButton.url

        const handlers = {
            website: this.websiteHandler.bind(this),
            bot: this.botsHandler.bind(this),
            channel: this.channelsHandler.bind(this),
            group: this.channelsHandler.bind(this),
        }

        const type = Object.keys(handlers).find((t) => text.includes(t))
        if (!type) return
        const handler = handlers[type]

        this.logger.log(
            chalk.cyan(
                `Got message, ${type} handler will start after 2 seconds...`
            )
        )
        await this.sleep(2)
        const completed = await this.trySkip(() => handler(event, url), event)
        await db.transaction(async (t) => {
            if (completed) {
                this.completedTasks += 1
                await Statistics.incrementCompletedTasks(this.session.phone, t)
            } else {
                this.skippedTasks += 1
                await Statistics.incrementSkippedTasks(this.session.phone, t)
            }
        })
        notifyMinerUpdates(this)
    }

    private async switchHandler() {
        this.logger.warning("No ads, switch")
        await this.switchJob()
    }

    private async earnedHandler(event: NewMessageEvent) {
        this.logger.log(chalk.greenBright(event.message.rawText))
        try {
            const earned = getFirstDigits(event.message.rawText)
            if (!earned) return
            this.earned += earned
            this.balance += earned
            await db.transaction(async (t) => {
                await Statistics.incrementEarnedAmount(
                    this.session.phone,
                    this.COIN_NAME,
                    earned,
                    t
                )
            })
            notifyMinerUpdates(this)
        } catch (e) {
            this.logger.error(`Earned Error: ${e}`)
        }
    }

    private async balanceHandler(event: NewMessageEvent) {
        this.logger.log(chalk.green(event.message.rawText))
        try {
            const balance = getFirstDigits(event.message.rawText)
            if (!balance) return
            this.balance = balance
            if (balance > this.MIN_WITHDRAW) {
                this.logger.log(
                    `Balance greater than min withdraw ${this.MIN_WITHDRAW}`
                )
                await this.sleep(2)
                await this.sendMessage(WITHDRAW_QUERY)
            }
            notifyMinerUpdates(this)
        } catch (e) {
            this.logger.error(`Balance Error: ${e}`)
        }
    }

    private async withdrawAddressHandler() {
        this.logger.log(chalk.magentaBright("Sending address to withdraw..."))
        await this.sleep(3)
        await this.sendMessage(this.ADDRESS)
    }

    private async withdrawAmountHandler() {
        this.logger.log(chalk.magentaBright("Sending amount to withdraw..."))
        await this.sleep(3)
        await this.sendMessage(MAX_AMOUNT_WITHDRAW)
    }

    private async withdrawConfirmHandler() {
        this.logger.log(chalk.magentaBright("Withdraw..."))
        await this.sleep(3)
        await this.sendMessage(WITHDRAW_CONFIRM)
        TelegramLogger.info(
            `${this.session.phone} ${this.COIN_NAME} has withdrew with balance ${this.balance}`
        )
    }

    private async skipHandler(event: NewMessageEvent) {
        this.logger.error(`${event.message.rawText}. Skip task`)
        await this.skipTask(event)
    }

    private async noValidHandler(event: NewMessageEvent) {
        this.logger.error(event.message.rawText)
        await this.startJob()
    }

    private async agreeHandler(event: NewMessageEvent) {
        if (!(event.message.replyMarkup instanceof Api.ReplyInlineMarkup)) {
            return
        }

        const termsButton = this.getButton(event, "Terms of Service")
        const privacyButton = this.getButton(event, "Privacy Policy")
        const agreeButton = this.getButton(event, "I agree")

        if (
            !(termsButton instanceof Api.KeyboardButtonUrl) ||
            !(privacyButton instanceof Api.KeyboardButtonUrl)
        ) {
            this.logger.error(
                "Terms or privacy buttons without url, can't agree"
            )
            return
        }

        if (!(agreeButton instanceof Api.KeyboardButtonCallback)) {
            this.logger.error("Have no callback agree button, can't agree")
            return
        }

        const termsUrl = termsButton.url
        const privacyUrl = privacyButton.url
        await FlareSolver.get(termsUrl)
        await FlareSolver.get(privacyUrl)

        await this.clickButton(event.message.id, agreeButton)
        await this.startJob()
    }

    private async filterEvent(event: NewMessageEvent) {
        if (this.paused) return
        let sender = event.message.sender
        if (!sender) {
            sender = await event.message.getSender()
        }
        if ((sender as any)?.username !== this.ENTITY) return

        const text = event.message.rawText
        const handlers = new Map<RegExp, CallableFunction>([
            [AGREE_PATTERN, (e) => this.agreeHandler(e)],
            [NO_ADS_PATTERN, () => this.switchHandler()],
            [CANNOT_PATTERN, (e) => this.skipHandler(e)],
            [NO_VALID_PATTERN, (e) => this.noValidHandler(e)],
            [EARNED_PATTERN, (e) => this.earnedHandler(e)],
            [BALANCE_PATTERN, (e) => this.balanceHandler(e)],
            [WITHDRAW_ADDRESS_PATTERN, () => this.withdrawAddressHandler()],
            [WITHDRAW_AMOUNT_PATTERN, () => this.withdrawAmountHandler()],
            [WITHDRAW_CONFIRM_PATTERN, () => this.withdrawConfirmHandler()],
        ])

        for (const [pattern, handler] of handlers.entries()) {
            const match = text.match(pattern)
            if (match) {
                handler(event)
                return
            }
        }
        /* in default case */
        this.mainHandler(event)
    }

    async stopMining() {
        this.logger.log("Paused")
        this.paused = true
    }

    async startMining() {
        this.logger.log(chalk.cyan(`Start mining...`))
        this.paused = false
        this.startedAt = new Date()

        this.setBalanceTimeout()
        await this.startClickBot()
        await this.checkBalance()
        await this.startJob()
    }
}
