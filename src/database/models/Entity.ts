import { Model, DataTypes, Transaction } from "sequelize"
import db from "../index"
import { DBTry } from "../../utils/database"

type EntityType = "user" | "chat" | "channel"

export interface EntityAttributes {
    phone: string
    username: string
    id: number
    accessHash: number
    type: EntityType
}

class Entity extends Model<EntityAttributes> implements EntityAttributes {
    phone!: string
    username!: string
    id!: number
    accessHash!: number
    type!: EntityType

    @DBTry("Can't get entity by username")
    static getEntity(phone: string, username: string) {
        return Entity.findOne({ where: { phone, username } })
    }

    @DBTry("Can't save entity")
    static saveEntity(payload: EntityAttributes, transaction: Transaction) {
        return Entity.create(payload, { transaction })
    }
}

Entity.init(
    {
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        id: {
            type: DataTypes.NUMBER,
            allowNull: false,
            primaryKey: true,
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
