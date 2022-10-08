const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config();

const auth = new google.auth.GoogleAuth({
    keyFile: 'gauth.json',
    scopes: [
        'https://www.googleapis.com/auth/drive.file'
    ],
});

google.options({auth});

const drive = google.drive('v3');

const tgBot = new TelegramBot(process.env['TELEGRAM_BOT_TOKEN'], {polling: true});

// ------------------------------------------------------------------------------------------------
// Google Drive
// ------------------------------------------------------------------------------------------------

async function listFiles(parentFolderId) {
    const response = await drive.files.list({
        fields: 'files(id,name,mimeType)',
        parents: parentFolderId != null ? [parentFolderId] : []
    });
    return response.data.files;
}

async function getFolderId(name) {
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

// DEBUG
async function wipeEverythingOffTheFaceOfTheEarth() {
    for (let file of (await listFiles())) {
        console.log(`Deleting ${file.name} (${file.id})`);
        await deleteFile(file.id);
    }
}

// ------------------------------------------------------------------------------------------------

async function upload(filename) {
    const folderName = "my-finance-backups";

    let folderId = await getFolderId(folderName);

    // Create folder
    if (folderId === null) {
        folderId = await createFolder(folderName);
        console.log(`Created folder: "${folderName}" (${folderId})`);
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

    // Report on Telegram
    await tgBot.sendMessage(process.env['TELEGRAM_ADMIN_CHAT_ID'], `Backup ${backupName} uploaded`);

    return response;
}

// ------------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------------

async function main() {
    // DEBUG (VERY DANGEROUS) wipeEverythingOffTheFaceOfTheEarth().catch(console.error);

    const filename = process.argv[2];

    console.log(`Uploading backup saved at ${filename}`);
   
    try {
        await upload(filename);
    } catch (error) {
        console.error(error);
        await tgBot.sendMessage(process.env['TELEGRAM_ADMIN_CHAT_ID'], `Backup ${filename} failed`);
        
        process.exit(1);
    }

    process.exit(0); // TODO: How do I cleanly close the TelegramBot?
}

if (module === require.main) {
    main();
}
