const {crc32} = require('crc');
const fs = require('fs');
const path = require('path');

module.exports = function(RED) {
    function CrcFileNode(config) {
        RED.nodes.createNode(this, config);

        this.filePath = config.filePath;
        this.filePathType = config.filePathType;
        this.filename = config.filename;
        this.filenameType = config.filenameType;
        this.target = config.target||'crc';
        this.name = config.name||'crc-file';

        let node = this;

        node.on('input', (msg) => {
            const filePath = RED.util.evaluateNodeProperty(node.filePath, node.filePathType, node, msg);
            const filename = RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            console.log(filePath, filename);

            fs.readFile(path.join(filePath, filename), (err, buffer) => {
                if(err) {
                    console.log('file read failed');
                    throw err;
                }

                console.log('calculate crc');
                msg[node.target] = crc32(buffer).toString(16);
                console.log('send message');
                node.send(msg);
            })
        });
    }

    RED.nodes.registerType("crc-file", CrcFileNode);
}