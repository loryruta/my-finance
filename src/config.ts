import fs from 'fs'

let config: any = undefined; // TODO Typescript type for Config

function requireConfig(): any {
    if (!config) {
        if (!fs.existsSync("./configs/app.json")) {
            console.error(`Required config file "./configs/app.json" not found`);
            process.exit(1);
        }
        
        config = JSON.parse(fs.readFileSync('./configs/app.json').toString()); // TODO Typescript type for Config
    }
    
    return config;
}

export = requireConfig;
