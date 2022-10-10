const path = require('path');
const fs = require('fs');
const moment = require('moment');
const package = require('../package');
const config = require('../config');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

if (!fs.existsSync(path.join(__dirname, '../gauth.json'))) {
    console.log(`File gauth.json not found. Impossible to run Google backup driver`);
    process.exit(1);
}

const {google} = require('googleapis');

const auth = new google.auth.GoogleAuth({
    keyFile: 'gauth.json',
    scopes: [
        'https://www.googleapis.com/auth/drive.file'
    ],
});

google.options({auth});

const drive = google.drive('v3');

const backupFolderName = "my-finance-backups"; // TODO configure it in config.json ?

// ------------------------------------------------------------------------------------------------
// Google Drive
// ------------------------------------------------------------------------------------------------

async function listFiles(parentFolderId, modifiedTime) {
    let searchQuery = [
        `mimeType != 'application/vnd.google-apps.folder'`
    ];

    if (modifiedTime != null) {
        searchQuery.push(`modifiedTime > '${modifiedTime.format()}'`);
    }

    const response = await drive.files.list({
        fields: 'files(id,name,mimeType)',
        parents: parentFolderId != null ? [parentFolderId] : [],
        q: searchQuery.join(" and "),
    });
    return response.data.files;
}

async function getFileId(name) {
    const response = await drive.files.list({
        fields: 'files(id,name)',
        q: `name="${name}"`
    });
    if (response.data.files.length > 0) {
        return response.data.files[0].id;
    } else {
        return null;
    }
}

async function createFolder(name, parentFolderId) {
    let result = await drive.files.create({
        requestBody: {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentFolderId != null ? [parentFolderId] : []
        },
        fields: 'id'
    });
    return result.data.id;
}

async function deleteFile(fileId) {
    let result = await drive.files.delete({
        fileId: fileId,
    });
    return result;
}

async function clearAll(parentFolderId) {
    for (let file of (await listFiles(parentFolderId))) {
        await deleteFile(file.id);
    }
}

// ------------------------------------------------------------------------------------------------

async function upload(name, readStream) {
    let folderId = await getFileId(backupFolderName);

    // Create folder
    if (folderId === null) {
        folderId = await createFolder(backupFolderName);
        console.log(`Created folder: "${backupFolderName}" (${folderId})`);
    }

    // Display some of the current backups
    const backups = (await listFiles(folderId))
        .filter(entry => entry.mimeType !== "application/vnd.google-apps.folder");
    const displayedBackupNames = backups
        .map(entry => entry.name)
        .sort().reverse()
        .slice(0, 16);

    console.log(`Currently stored ${backups.length} backup(s): ${displayedBackupNames.join(", ")}`)

    // Upload the backup
    let response = await drive.files.create({
        requestBody: {
            name,
            parents: [folderId],
        },
        media: {
            body: readStream,
        },
    });
    console.log(`Backup "${name}" uploaded`);

    return response;
}

// ------------------------------------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------------------------------------

async function onUploadCommand() {
    try {
        const backupName = `db-backup-${package.version}-${moment().format('YY-MM-dd-hh-mm-ss')}`;
        await upload(backupName, config.dbFile);

        console.log(`${config.dbFile} successfully uploaded as ${backupName}`)

    } catch (error) {
        console.error(error);
    }
}

async function onListCommand() {
    console.log(`Backups of the past 5 days:`);

    const backupFolderId = await getFileId(backupFolderName);
    if (backupFolderId == null) {
        console.log(`No backup found`);
        return;
    }

    const filesSince = moment().subtract(5, 'days');
    const files = (await listFiles(backupFolderId, filesSince))
        .map(file => file.name)
        .sort((a, b) => b.localeCompare(a));

    if (files.length === 0) {
        console.log(`No backup found`);
        return;
    }

    for (file of files) {
        console.log(`- ${file.name}`);
    }
}

async function onClearAllCommand() {
    const answer = await readline.question(`Are you sure you want to delete all backups? [y/N]`);
    if (answer === "y" || answer === "Y") {
        let folderId = await getFileId(backupFolderName);
        if (folderId !== null) {
            await clearAll(folderId);
        }
        console.log(`Backups cleared`);
    }
}

async function onApplyCommand() {
    if (process.argv.length < 4) {
        console.error(`Invalid syntax: node backup.js apply <backup>`);
        return;
    }

    const backupName = process.argv[3];

    const fileId = await getFileId(backupName);
    if (fileId == null) {
        return 1;
    }

    const file = await drive.files.get({
        fileId: fileId,
        alt: 'media',
    });
    fs.writeFileSync(config.dbFile, file.data);

    console.log(`Backup ${backupName} written to ${config.dbFile}`);
    return 0;
}

// ------------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------------

if (require.main === module) {
    (async () => {
        const commands = {
            "upload": onUploadCommand,
            "list": onListCommand,
            "clearall": onClearAllCommand,
            "apply": onApplyCommand,
        };
    
        if (process.argv.length < 3 || !(process.argv[2] in commands)) {
            console.error(`Invalid syntax: node main.js <upload|list|clearall|apply> ...`);
            return;
        }
    
        process.exit(
            await commands[process.argv[2]]()
        );
    })()
        .catch(console.error);
}
