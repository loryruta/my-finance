#!/bin/bash

# ------------------------------------------------------------------------------------------------
# Usage: ./backup/scripts/clear_all.sh
# ------------------------------------------------------------------------------------------------

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
BASE_DIR=$SCRIPT_DIR/../..

cd $BASE_DIR

echo -ne "Are you sure you want to clear all backups? [y/N] "
read ANSWER

if [[ "$ANSWER" == "y" || "$ANSWER" == "Y" ]]
then
    node ./backup/src/main.js clearall
    echo "Backups cleared"
fi
