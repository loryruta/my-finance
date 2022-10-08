#!/bin/bash

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

cd "$SCRIPT_DIR/.."

PGHOST=`cat ./config.json` | jq -r ".pgsql.host"
PGPORT=`cat ./config.json` | jq -r ".pgsql.port"
PGUSER=`cat ./config.json` | jq -r ".pgsql.user"
PGDATABASE=`cat ./config.json` | jq -r ".pgsql.database"
# TODO password not supported

DATE=$(date +%Y-%m-%d-%H-%M-%S)
DUMP_FILE=/tmp/pgsql-backup-$DATE.sql
ARCHIVE_FILE=/tmp/pg-backup-$DATE.sql.tar.gz

pg_dump -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE > $DUMP_FILE
tar -cf $ARCHIVE_FILE $DUMP_FILE

node ./backup/src/main.js $ARCHIVE_FILE

rm $DUMP_FILE
rm $ARCHIVE_FILE
