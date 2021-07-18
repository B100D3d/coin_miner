import { TelegramClient } from "telegram"
import Queue from "../utils/queue"
import LtcMiner from "./LtcMiner"
import BchMiner from "./BchMiner"
import ZecMiner from "./ZecMiner"
import BaseMiner from "./BaseMiner"
import { SessionAttributes } from "../database/models/Session"
import InputEntities from "../services/InputEntities"
import MinersJobs from "../miners/MinersJobs"

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
        const inputEntities = new InputEntities(session.phone, client)
        const props = {
            client,
            session,
            channelsQueue,
            inputEntities,
        }
        const ltcMiner = new LtcMiner(props)
        const bchMiner = new BchMiner(props)
        const zecMiner = new ZecMiner(props)

        return [ltcMiner, bchMiner, zecMiner]
    }
}
