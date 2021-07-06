import { Model, DataTypes, Transaction } from "sequelize"
import db from "../index"
import { DBTry } from "utils/database"

type EntityType = "user" | "chat" | "channel"

export interface EntityAttributes {
    username: string
    id: number
    accessHash: number
    type: EntityType
}

class Entity extends Model<EntityAttributes> implements EntityAttributes {
    username!: string
    id!: number
    accessHash!: number
    type!: EntityType

    @DBTry("Can't get entity by username")
    static getEntity(username: string) {
        return Entity.findOne({ where: { username } })
    }

    @DBTry("Can't save entity")
    static saveEntity(payload: EntityAttributes, transaction: Transaction) {
        return Entity.create(payload, { transaction })
    }
}

Entity.init(
    {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        id: {
            type: DataTypes.NUMBER,
            allowNull: false,
        },
        accessHash: {
            type: DataTypes.NUMBER,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        modelName: "Entity",
        sequelize: db,
        timestamps: false,
        updatedAt: false,
        tableName: "entities",
        underscored: true,
    }
)

export default Entity
