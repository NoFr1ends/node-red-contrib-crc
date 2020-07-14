const {CRC32Stream} = require('crc32-stream');
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

            const source = fs.createReadStream(path.join(filePath, filename));
            const checksum = new CRC32Stream();

            checksum.on('end', (err) => {
                if(err) {
                    node.error(err, msg);
                    return;
                }

                msg[node.target] = checksum.hex();
                node.send(msg);
            });

            source.pipe(checksum);
            checksum.resume();
        });
    }

    RED.nodes.registerType("crc-file", CrcFileNode);
}