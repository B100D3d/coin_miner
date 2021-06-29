import Sequelize, { Model, DataTypes, Transaction } from "sequelize"
import db from "../index"
import { DBTry } from "../../utils/database"

export interface StatisticsAttributes {
    phone: string
    earned: number
    completedTasks: number
    skippedTasks: number
}

interface StatisticsCreationAttributes {
    phone: string
}

class Statistics
    extends Model<StatisticsAttributes, StatisticsCreationAttributes>
    implements StatisticsAttributes
{
    phone!: string
    earned!: number
    completedTasks!: number
    skippedTasks!: number

    @DBTry("Can't get full statistics")
    static async getFullStatistics() {
        return Statistics.findAll()
    }

    @DBTry("Can't get account statistics")
    static async getAccountStatistics(
        phone: string,
        transaction?: Transaction
    ) {
        const where = { phone }
        return Statistics.findOne({
            where,
            transaction,
        })
    }

    @DBTry("Can't increment account completed tasks")
    static async incrementCompletedTasks(
        phone: string,
        transaction: Transaction
    ) {
        await Statistics.update(
            { completedTasks: Sequelize.literal("completed_tasks + 1") as any },
            { where: { phone }, transaction }
        )
    }

    @DBTry("Can't increment account completed tasks")
    static async incrementSkippedTasks(
        phone: string,
        transaction: Transaction
    ) {
        await Statistics.update(
            { skippedTasks: Sequelize.literal("skipped_tasks + 1") as any },
            { where: { phone }, transaction }
        )
    }

    @DBTry("Can't increment account earned amount")
    static async incrementEarnedAmount(
        phone: string,
        amount: number,
        transaction: Transaction
    ) {
        await Statistics.update(
            { earned: Sequelize.literal(`earned + ${amount}`) as any },
            { where: { phone }, transaction }
        )
    }
}

Statistics.init(
    {
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true,
        },
        earned: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
        completedTasks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        skippedTasks: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        modelName: "Statistics",
        sequelize: db,
        timestamps: false,
        updatedAt: false,
        tableName: "statistics",
        underscored: true,
    }
)

export default Statistics
