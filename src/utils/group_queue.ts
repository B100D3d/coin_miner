export default class GroupQueue {
    groups = new Map<string, Set<CallableFunction>>()

    private async run(group: string): Promise<void> {
        const functions = this.groups.get(group)
        if (!functions?.size) return

        const func = functions[0]
        await func()
        functions.delete(func)
        this.run(group)
    }

    queue(group: string, func: CallableFunction): void {
        if (!this.groups.has(group)) {
            this.groups.set(group, new Set())
        }
        const functions = this.groups.get(group)
        functions.add(func)
        if (functions.size === 1) {
            this.run(group)
        }
    }
}
