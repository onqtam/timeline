import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import UserActivity from './UserActivity';

@Entity()
export default class User {
    @PrimaryGeneratedColumn()
    public id!: number;
    @Column()
    public shortName!: string;
    @OneToOne(() => UserActivity)
    @JoinColumn()
    public activity!: UserActivity;
}
