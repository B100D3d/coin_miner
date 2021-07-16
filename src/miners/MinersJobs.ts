type Job = "Visit sites" | "Message bots" | "Join chats"
type JobKey = "VISIT" | "MESSAGE" | "JOIN"

export default class MinersJobs {
    jobs
    currentIndex

    static JOBS: Record<JobKey, Job> = {
        VISIT: "Visit sites",
        MESSAGE: "Message bots",
        JOIN: "Join chats",
    }

    constructor(
        jobs = [
            MinersJobs.JOBS.VISIT,
            MinersJobs.JOBS.MESSAGE,
            MinersJobs.JOBS.JOIN,
        ]
    ) {
        this.jobs = [...jobs]
        this.currentIndex = 0
    }

    get currentJob() {
        return this.jobs[this.currentIndex]
    }

    get isLastJob() {
        return this.currentIndex === this.jobs.length - 1
    }

    nextJob() {
        this.currentIndex =
            this.currentIndex === this.jobs.length - 1
                ? 0
                : this.currentIndex + 1
    }

    removeJob(job: Job) {
        if (this.currentJob === job) {
            this.nextJob()
        }
        this.jobs = this.jobs.filter((j) => j !== job)
    }

    addJob(job: Job) {
        if (this.jobs.includes(job)) return
        this.jobs.push(job)
    }
}
