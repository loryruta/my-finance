const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

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

async function upload(filename) {
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
    const backupName = path.basename(filename);

    let response = await drive.files.create({
        requestBody: {
            name: backupName,
            parents: [folderId],
        },
        media: {
            body: fs.createReadStream(filename),
        },
    });
    console.log(`Backup "${backupName}" uploaded`);

    return response;
}

// ------------------------------------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------------------------------------

async function onUploadCommand() {
    if (process.argv.length < 4) {
        console.error(`Invalid syntax: node main.js upload <backup-filename>`);
        return;
    }

    const filename = process.argv[3];
    try {
        await upload(filename);
    } catch (error) {
        console.error(error);
    }
}

async function onListCommand() {
    const backupFolderId = await getFileId(backupFolderName);
    if (backupFolderId !== null) {
        const filesSince = moment().subtract(5, 'days');
        const files = (await listFiles(backupFolderId, filesSince))
            .map(file => file.name)
            .sort((a, b) => b.localeCompare(a));

        for (file of files) {
            console.log(file);
        }
    }
}

async function onClearAllCommand() {
    let folderId = await getFileId(backupFolderName);
    if (folderId !== null) {
        await clearAll(folderId);
    }
}

async function onDownloadCommand() {
    if (process.argv.length < 5) {
        console.error(`Invalid syntax: node main.js download <remote-filename> <local-filename>`);
        return;
    }

    const remoteFilename = process.argv[3];
    const localFilename = process.argv[4];

    const fileId = await getFileId(remoteFilename);
    if (fileId == null) {
        return 1;
    }

    const file = await drive.files.get({
        fileId: fileId,
        alt: 'media',
    });
    fs.writeFileSync(localFilename, file.data);
    return 0;
}

// ------------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------------

(async () => {
    const commands = {
        "upload": onUploadCommand,
        "list": onListCommand,
        "clearall": onClearAllCommand,
        "download": onDownloadCommand,
    };

    if (process.argv.length < 3 || !(process.argv[2] in commands)) {
        console.error(`Invalid syntax: node main.js <upload|list|download|apply> ...`);
        return;
    }

    process.exit(
        await commands[process.argv[2]]()
    );
})()
    .catch(console.error);
