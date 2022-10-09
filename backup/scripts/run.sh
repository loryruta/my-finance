#!/bin/bash

# ------------------------------------------------------------------------------------------------
# Usage: ./backup/scripts/run.sh
# ------------------------------------------------------------------------------------------------

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
BASE_DIR=$SCRIPT_DIR/../..

cd $BASE_DIR

PGHOST=$(cat ./config.json | jq -r ".pgsql.host")
PGPORT=$(cat ./config.json | jq -r ".pgsql.port")
PGUSER=$(cat ./config.json | jq -r ".pgsql.user")
PGDATABASE=$(cat ./config.json | jq -r ".pgsql.database")
# TODO password not supported

DATE=$(date +%Y-%m-%d-%H-%M-%S)
DUMP_FILE=/tmp/pgsql-backup-$DATE.sql

echo "Dumping DB to $DUMP_FILE"

pg_dump -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE > $DUMP_FILE

echo "Uploading $DUMP_FILE"

# TODO check upload outcome
node ./backup/src/main.js upload $DUMP_FILE

echo "Clearing"

rm $DUMP_FILE
