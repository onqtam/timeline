import { IsInt, Max, Min } from "class-validator";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";
import CommonParams from "../CommonParams";

export type ValueLimits = { min: number; max: number };

@Entity()
export default class UserSettings {
    @PrimaryGeneratedColumn()
    public id!: number;

    public static TIMESLOT_LIMITS: ValueLimits = { min: 1, max: 5 };
    public static WINDOW_DURATION_LIMITS: ValueLimits = { min: 30, max: 300 };

    @Column()
    @IsInt()
    @Min(UserSettings.TIMESLOT_LIMITS.min)
    @Max(UserSettings.TIMESLOT_LIMITS.max)
    public audioWindowTimeslotCount!: number;

    @Column()
    @IsInt()
    @Min(UserSettings.WINDOW_DURATION_LIMITS.min)
    @Max(UserSettings.WINDOW_DURATION_LIMITS.max)
    public audioWindowDuration!: number;

    constructor() {
        if (CommonParams.IsRunningOnClient) {
            this.initDefaultValues();
        }
    }

    public initDefaultValues() {
        this.id = -1;
        this.audioWindowTimeslotCount = UserSettings.TIMESLOT_LIMITS.min;
        this.audioWindowDuration = 1200;
    }
}
