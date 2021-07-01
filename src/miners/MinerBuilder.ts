import { TelegramClient } from "telegram"
import Queue from "../utils/queue"
import LtcMiner from "./LtcMiner"
import BchMiner from "./BchMiner"
import ZecMiner from "./ZecMiner"
import BaseMiner from "./BaseMiner"
import { SessionAttributes } from "../database/models/Session"

export default class MinerBuilder {
    /**
     * returns array of miners
     * @param client {TelegramClient} telegram client
     * @param session {object} account session from database
     */
    static build(
        client: TelegramClient,
        session: SessionAttributes
    ): Array<BaseMiner> {
        const channelsQueue = new Queue(1)
        const ltcMiner = new LtcMiner({ client, session, channelsQueue })
        const bchMiner = new BchMiner({ client, session, channelsQueue })
        const zecMiner = new ZecMiner({ client, session, channelsQueue })

        return [ltcMiner, bchMiner, zecMiner]
    }
}
