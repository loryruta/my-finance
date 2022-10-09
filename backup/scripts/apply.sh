#!/bin/bash

# ------------------------------------------------------------------------------------------------
# Usage: ./backup/scripts/apply.sh <remote-file>
# ------------------------------------------------------------------------------------------------

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
BASE_DIR=$SCRIPT_DIR/../..

cd $BASE_DIR

if [[ $# -lt 1 ]]
then
    echo "Invalid command usage: ./backup/scripts/apply.sh <remote-file>"
    exit 1
fi

PGHOST=$(cat ./config.json | jq -r ".pgsql.host")
PGPORT=$(cat ./config.json | jq -r ".pgsql.port")
PGUSER=$(cat ./config.json | jq -r ".pgsql.user")
PGDATABASE=$(cat ./config.json | jq -r ".pgsql.database")
# TODO password not supported

REMOTE_FILE=$1
DUMP_FILE=/tmp/pgsql-backup-to-apply.sql

echo "Downloading $REMOTE_FILE to $DUMP_FILE..."

node ./backup/src/main.js download $REMOTE_FILE $DUMP_FILE

if [[ $? -ne "0" ]]
then
    echo "Remote file not found: $REMOTE_FILE"
    exit 1
fi

echo "Re-creating \"$PGDATABASE\" database"

dropdb -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE
createdb -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE

echo "Restoring backup"

psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE < $DUMP_FILE > /dev/null

echo "Clearing $DUMP_FILE"

rm $DUMP_FILE
