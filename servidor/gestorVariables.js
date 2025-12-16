const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function accessCLAVECORREO() {
    return accessSecret('CLAVECORREO');
}

async function accessUSUARIOCORREO() {
    return accessSecret('USUARIOCORREO');
}

async function accessSecret(secretId) {
    const name = `projects/270733010519/secrets/${secretId}/versions/latest`;
    const [version] = await client.accessSecretVersion({
        name: name,
    });
    return version.payload.data.toString("utf8");
}

async function obtenerOptions(callback) {
    let options = {
        user: "",
        pass: ""
    };
    let user = await accessUSUARIOCORREO();
    let pass = await accessCLAVECORREO();
    options.user = user;
    options.pass = pass;
    callback(options);
}

module.exports.obtenerOptions = async function (callback) {
    try {
        const [user, pass] = await Promise.all([accessUSUARIOCORREO(), accessCLAVECORREO()]);
        const options = { user, pass };
        callback(options);
    } catch (error) {
        console.error("Error obteniendo secretos:", error);
        callback({ user: "", pass: "" });
    }
};