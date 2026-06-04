function generateFingerprint(options = {}) {
    const fields = new Array(37).fill('');
    
    const randomHash = () => Math.floor(Math.random() * 4294967296);
    const deviceId = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    fields[0] = deviceId;
    fields[1] = '1.1.1';
    fields[16] = `5|${randomHash()}`;
    fields[17] = randomHash();
    fields[18] = randomHash();
    fields[23] = 'P';
    fields[31] = randomHash();
    fields[32] = '11';
    fields[33] = Date.now();
    fields[34] = randomHash();
    fields[36] = Math.floor(Math.random() * 91) + 10;

    for (let i = 0; i < 37; i++) {
        if (fields[i] === '') {
            fields[i] = '0';
        }
    }

    return fields.join('^');
}

module.exports = {
    generateFingerprint
};