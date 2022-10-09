#!/bin/bash

# ------------------------------------------------------------------------------------------------
# Usage: ./backup/scripts/list.sh
# ------------------------------------------------------------------------------------------------

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
BASE_DIR=$SCRIPT_DIR/../..

cd $BASE_DIR

echo "Past 5 days backups:"

BACKUP_FILES=$(node ./backup/src/main.js list)
BACKUP_FILES_COUNT=$(echo -ne "$BACKUP_FILES" | wc -w)

if [[ $BACKUP_FILES_COUNT -eq "0" ]]
then
    echo "No backup found"
else
    echo "$BACKUP_FILES"
fi
