#!/bin/bash

SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)

export $(cat $SCRIPT_DIR/.env | dos2unix | xargs)

DATE=$(date +%Y-%m-%d-%H-%M-%S)
DUMP_FILE=/tmp/pgsql-backup-$DATE.sql
ARCHIVE_FILE=/tmp/pg-backup-$DATE.sql.tar.gz

pg_dump -h $PGHOST -p $PGPORT -U $PGUSER $PGDATABASE > $DUMP_FILE
tar -cf $ARCHIVE_FILE $DUMP_FILE

# Google Drive upload
node $SCRIPT_DIR/src/gdrive.js $ARCHIVE_FILE

rm $DUMP_FILE
rm $ARCHIVE_FILE
