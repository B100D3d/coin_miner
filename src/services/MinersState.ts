import BaseMiner from "../miners/BaseMiner"

export default class MinersState {
    static bots = new Map<string, Array<BaseMiner>>()

    static addBot(phone: string, miners: Array<BaseMiner>) {
        MinersState.bots.set(phone, miners)
    }
}
