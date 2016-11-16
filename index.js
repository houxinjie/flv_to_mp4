import path from 'path';
import fs from 'fs';
import FLVDemuxer from './demux/flv-demuxer.js';
import MP4Remuxer from './remux/mp4-remuxer.js';
import Log from './utils/logger.js';
import commander from 'commander';
import {version} from './package.json';


commander
    .version(version)
    .option('-i, --input <inputFile>')
    .option('-o, --output <outputFile>')
    .usage('-i <inputFile> -o <outputFile>')
    .parse(process.argv)

const Tag = 'Ftom4'

if(!commander.input || !commander.output) {
    commander.help()
    process.exit(0);
}

const inputFilePath = path.join(process.cwd(), commander.input);
const outputFilePath = path.join(process.cwd(), commander.output);

if(!fs.existsSync(inputFilePath)){
    Log.e(Tag, 'input file not exist');
    process.exit(0);
}

if(fs.existsSync(outputFilePath)){
    fs.unlinkSync(outputFilePath);
}

const arrayBuffer = fs.readFileSync(inputFilePath).buffer;

const demuxer = new FLVDemuxer(arrayBuffer);
const remuxer = new MP4Remuxer();

demuxer.onError = () => {

}

demuxer.onMediaInfo = () => {

}

remuxer.bindDataSource(demuxer);

remuxer.onInitSegment = data => {
    fs.writeFileSync(outputFilePath, Buffer.from(data), {flag: 'a'})
}

remuxer.onMediaSegment = (type, mediaSegment) => {
    fs.writeFileSync(outputFilePath, Buffer.from(mediaSegment.data), {flag: 'a'})
}

demuxer.parseChunks(arrayBuffer, 0);
