import { Entity, PrimaryGeneratedColumn } from "typeorm";
import CommonParams from "../CommonParams";

export type ValueLimits = { min: number; max: number };

@Entity()
export default class UserSettings {
    @PrimaryGeneratedColumn()
    public id!: number;

    constructor() {
        if (CommonParams.IsRunningOnClient) {
            this.initDefaultValues();
        }
    }

    public initDefaultValues() {
        this.id = -1;
    }
}
