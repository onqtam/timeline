## Some notes on entities

Due to limitations inherent to TypeORM, when making new entities make sure to:

1. Place entities which have a relation between each other in separate files. You'll get a compile-time error if you do.
1. ON THE SERVER: Do NOT initialize any of the properties stored in the database. You'll get a runtime error to not do that if you attempt it.
    * Instead initialize them in a constructor, surround by `if (CommonParams.IsRunningOnClient)`
