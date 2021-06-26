interface QueueJob {
    hash: any
    resolve?: CallableFunction
}

export default class Queue {
    private readonly concurrencyCount
    private readonly runningJobs: Array<QueueJob> = []
    private readonly waitingJobs: Array<QueueJob> = []

    constructor(concurrencyCount: number) {
        this.concurrencyCount = concurrencyCount
    }

    private dequeue(job: QueueJob) {
        const jobIndex = this.runningJobs.indexOf(job)
        this.runningJobs.splice(jobIndex, 1)
    }

    /**
     * waiting for a slot in the queue
     * @param hash {any} Unique job identifier
     */
    async wait(hash: any) {
        const job: QueueJob = { hash }

        if (this.runningJobs.length >= this.concurrencyCount) {
            const promise = new Promise((resolve) => (job.resolve = resolve))
            this.waitingJobs.push(job)
            await promise
        }

        this.runningJobs.push(job)
    }

    /**
     * signals that the "hash" task has finished. <br>
     * frees its slot in the queue
     * @param hash {any} Unique job identifier
     */
    end(hash: any) {
        const job = this.runningJobs.find((j) => j.hash === hash)
        if (!job) throw new Error("Queue desync")
        this.dequeue(job)
        const nextWaiting = this.waitingJobs.shift()
        nextWaiting?.resolve()
    }
}
