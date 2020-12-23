import { getConnection } from "typeorm";
import { ObjectType } from "typeorm/common/ObjectType";
import { SelectQueryBuilder } from "typeorm/query-builder/SelectQueryBuilder";

// TODO: is it OK to use such a name?
export function QB<Entity>(entityClass: ObjectType<Entity> | Function | string, alias: string): SelectQueryBuilder<Entity> {
    return getConnection().createQueryBuilder(entityClass, alias);
}

// export function QB(): SelectQueryBuilder<any> {
//     return getConnection().createQueryBuilder()
// }
