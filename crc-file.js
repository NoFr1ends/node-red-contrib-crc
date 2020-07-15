const {CRC32Stream} = require('crc32-stream');
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
        this.frontBytes = parseInt(config.frontBytes)||0;
        this.backBytes = parseInt(config.backBytes)||0;
        this.target = config.target||'crc';
        this.name = config.name||'crc-file';

        let node = this;

        node.on('input', (msg) => {
            const filePath = RED.util.evaluateNodeProperty(node.filePath, node.filePathType, node, msg);
            const filename = RED.util.evaluateNodeProperty(node.filename, node.filenameType, node, msg);

            if(node.frontBytes === 0 && node.backBytes === 0) {
                // Hash whole file
                const source = fs.createReadStream(path.join(filePath, filename));
                const checksum = new CRC32Stream();

                checksum.on('end', (err) => {
                    if (err) {
                        node.error(err, msg);
                        return;
                    }

                    msg[node.target] = checksum.hex();
                    node.send(msg);
                });

                source.pipe(checksum);
                checksum.resume();
            } else {
                fs.open(path.join(filePath, filename), 'r', (err, fd) => {
                    if(err) {
                        node.error(err, msg);
                        return;
                    }

                    const stats = fs.statSync(path.join(filePath, filename));
                    let frontBytes = node.frontBytes;
                    let backBytes = node.backBytes;

                    if(frontBytes + backBytes > stats.size) {
                        frontBytes = stats.size;
                        backBytes = 0;
                    }

                    const buffer = Buffer.alloc(frontBytes + backBytes + 4);
                    buffer.writeUInt32BE(stats.size, 0);
                    if(frontBytes > 0) {
                        fs.readSync(fd, buffer, 4, frontBytes, 0);
                    }
                    if(backBytes > 0) {
                        fs.readSync(fd, buffer, 4 + frontBytes, backBytes, stats.size - backBytes);
                    }

                    fs.closeSync(fd);

                    msg[node.target] = crc32(buffer).toString(16);
                    node.send(msg);
                })
            }
        });
    }

    RED.nodes.registerType("crc-file", CrcFileNode);
}