import { TelegramClient } from "telegram"
import Queue from "../utils/queue"
import LtcMiner from "./LtcMiner"
import BchMiner from "./BchMiner"
import ZecMiner from "./ZecMiner"
import BaseMiner from "./BaseMiner"

export default class MinerBuilder {
    /**
     * returns array of miners
     * @param client {TelegramClient} telegram client
     * @param phone {string} phone number
     */
    static build(client: TelegramClient, phone: string): Array<BaseMiner> {
        const channelsQueue = new Queue(1)
        const ltcMiner = new LtcMiner({ client, phone, channelsQueue })
        const bchMiner = new BchMiner({ client, phone, channelsQueue })
        const zecMiner = new ZecMiner({ client, phone, channelsQueue })

        return [ltcMiner, bchMiner, zecMiner]
    }
}
