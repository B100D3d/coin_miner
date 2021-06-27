import chalk from "chalk"
import { parse as parseHTML } from "node-html-parser"
import axios from "axios"
import moment from "moment"
import { TelegramClient, Api } from "telegram"
import { NewMessageEvent, NewMessage } from "telegram/events"
import { FloodWaitError } from "telegram/errors"
import { getFirstDigits, random, timeout } from "../utils"
import MinerLogger from "../utils/miner_logger"
import Logger from "../utils/logger"
import FlareSolver from "../services/FlareSolver"
import Queue from "../utils/queue"

type Job = "Visit sites" | "Message bots" | "Join chats"

const START_REFERRAL_CODE = process.env.START_REFERRAL_CODE

const NO_ADS_PATTERS = /Sorry, there are no new ads available./g
const EARNED_PATTERN = /.*you earned.*/gi
const CANNOT_PATTERN = /We cannot/g
const NO_VALID_PATTERN = /Sorry, that task/g
const BALANCE_PATTERN = /Available balance/g
const WITHDRAW_PATTERN = /To withdraw, enter/g
const AGREE_PATTERN = /you must agree to our/g

const ONE_HOUR = 1000 * 60 * 60
const FIVE_MINUTES = 1000 * 60 * 5

const BALANCE_GETTER = "💰 Balance"
const WITHDRAW_QUERY = "💵 Withdraw"

const MAX_CHANNELS_PER_HOUR = 10
const JOBS: Array<Job> = ["Visit sites", "Message bots", "Join chats"]

interface MinerProps {
    client: TelegramClient
    phone: string
    channelsQueue: Queue
}

export default class BaseMiner {
    client: TelegramClient
    phone: string
    logger: MinerLogger
    channelsQueue: Queue

    ENTITY = ""
    COIN_NAME = ""
    MIN_WITHDRAW = 0
    ADDRESS = ""

    currentJob = JOBS[0]
    needCheckBalance = false
    joinedChannels = 0
    balance = 0
    earned = 0

    constructor({ client, phone, channelsQueue }: MinerProps) {
        this.client = client
        this.phone = phone
        this.logger = new MinerLogger({ phone, coinName: this.COIN_NAME })
        this.channelsQueue = channelsQueue
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
        return buttons.find((b) => b.text.includes(pattern))
    }

    private async clickButton(
        messageId: number,
        button: Api.KeyboardButtonCallback
    ) {
        await this.client.invoke(
            new Api.messages.GetBotCallbackAnswer({
                peer: this.ENTITY,
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

    private async startBot(entity: Api.TypeEntityLike, startParam?: string) {
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

    private async blockBot(entity: string) {
        await this.client.invoke(new Api.contacts.Block({ id: entity }))
        await this.client.invoke(
            new Api.contacts.DeleteContacts({ id: [entity] })
        )
    }

    private async leaveChannels() {
        const dialogs = await this.client.getDialogs({})
        const entities = dialogs.map((dialog) => dialog.entity)
        const channels = entities.filter(
            (entity) => entity instanceof Api.Channel
        ) as Array<Api.Channel>

        const twelveHoursAgo = moment().subtract(12, "hours").toDate()
        const filteredChannels = channels.filter(
            (channel) => new Date(channel.date) >= twelveHoursAgo
        )

        const leave = async (channel: Api.TypeEntityLike) => {
            await this.client.invoke(new Api.channels.LeaveChannel({ channel }))
        }
        for (const channel of filteredChannels) {
            try {
                await leave(channel)
            } catch (e) {
                if (e instanceof FloodWaitError) {
                    this.logger.warning("Flood error")
                    await this.sleep(e.seconds)
                    await leave(channel)
                }
            }
        }
        await this.sleep(2)
    }

    private async joinChannel(channel: Api.TypeEntityLike) {
        await this.client.invoke(new Api.channels.JoinChannel({ channel }))
    }

    private async channelsHandler(event: NewMessageEvent, url: string) {
        const req = await FlareSolver.get(url)
        const reqUrl = new URL(req.url)
        const channel = reqUrl.pathname.replace(/\//g, "")
        const job = Symbol(channel)
        await this.channelsQueue.wait(job)

        if (this.joinedChannels >= MAX_CHANNELS_PER_HOUR) {
            await this.switchJob()
            return
        }

        const join = async () => {
            this.logger.log(`Join channel ${channel}`)
            try {
                await this.joinChannel(channel)
                this.joinedChannels += 1
                if (this.joinedChannels === MAX_CHANNELS_PER_HOUR - 1) {
                    setTimeout(() => (this.joinedChannels = 0), ONE_HOUR)
                }
                const joinedButton = this.getButton(event, "Joined")
                if (joinedButton instanceof Api.KeyboardButtonCallback) {
                    await this.sleep(random(40, 50))
                    await this.clickButton(event.message.id, joinedButton)
                    this.logger.log(`Channel ${channel} successfully joined`)
                } else {
                    await this.skipTask(event)
                }
            } catch (e) {
                if (e instanceof FloodWaitError) {
                    this.logger.warning("Waiting flood wait error...")
                    await this.sleep(e.seconds)
                    await join()
                } else {
                    await this.leaveChannels()
                    await join()
                }
            }
        }
        await join()
        this.channelsQueue.end(job)
    }

    private async botsHandler(event: NewMessageEvent, url: string) {
        const req = await FlareSolver.get(url)
        const reqUrl = new URL(req.url)
        const startParam = reqUrl.searchParams.get("start")
        const bot = reqUrl.pathname.replace(/\//g, "")

        await this.startBot(bot, startParam)

        this.logger.log(`Messaged to bot ${bot}, waiting for answer...`)
        await this.sleep(10)

        const messages = await this.client.getMessages(bot, {
            fromUser: bot,
            limit: 2,
        })

        if (messages.length === 0) {
            this.logger.error(`Bot ${bot} didn't answer`)
            await this.blockBot(bot)
            await this.skipTask(event)
            return
        }

        const message = messages[0]
        await this.client.forwardMessages(this.ENTITY, {
            messages: [message.id],
            fromPeer: bot,
        })
        await this.blockBot(bot)
    }

    private async websiteHandler(event: NewMessageEvent, url: string) {
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
            bot: this.botsHandler.bind(this),
            channel: this.channelsHandler.bind(this),
            group: this.channelsHandler.bind(this),
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
        } catch (e) {
            this.logger.error(`Balance Error: ${e}`)
        }
    }

    private async withdrawHandler() {
        this.logger.log(chalk.magentaBright("Withdraw..."))
        await this.sleep(3)
        await this.sendMessage(this.ADDRESS)
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

    async startMining() {
        Logger.log(chalk.cyan(`Start mining with ${this.COIN_NAME} miner...`))
        const chats = [this.ENTITY]

        this.client.addEventHandler(
            (event) => this.agreeHandler(event),
            new NewMessage({ chats, pattern: AGREE_PATTERN })
        )

        this.client.addEventHandler(
            () => this.switchHandler(),
            new NewMessage({ chats, pattern: NO_ADS_PATTERS })
        )

        this.client.addEventHandler(
            (event) => this.skipHandler(event),
            new NewMessage({ chats, pattern: CANNOT_PATTERN })
        )

        this.client.addEventHandler(
            (event) => this.noValidHandler(event),
            new NewMessage({ chats, pattern: NO_VALID_PATTERN })
        )

        this.client.addEventHandler(
            (event) => this.earnedHandler(event),
            new NewMessage({ chats, pattern: EARNED_PATTERN })
        )

        this.client.addEventHandler(
            (event) => this.balanceHandler(event),
            new NewMessage({ chats, pattern: BALANCE_PATTERN })
        )

        this.client.addEventHandler(
            () => this.withdrawHandler(),
            new NewMessage({ chats, pattern: WITHDRAW_PATTERN })
        )

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
