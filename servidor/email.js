const nodemailer = require('nodemailer');
//const gv = require('./gestorVariables.js');

try { require('dotenv').config(); } catch (_) { }

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;
const MAIL_ENABLED = process.env.MAIL_ENABLED !== 'false'; // por defecto habilitado, se puede desactivar con MAIL_ENABLED=false

let transporter;
//f (MAIL_ENABLED && MAIL_USER && MAIL_PASS) {
transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: MAIL_USER, pass: MAIL_PASS }
});
////} else {
//   console.warn('[email.js] Envío de correo deshabilitado o credenciales ausentes. Define MAIL_USER/MAIL_PASS y asegúrate de que MAIL_ENABLED!=false si quieres enviar emails.');
//}

module.exports.enviarEmail = async function (direccion, key, men) {
    /* if (!MAIL_ENABLED) {
         return { skipped: true, reason: 'Mail disabled (MAIL_ENABLED=false)' };
     }
     if (!transporter) {
         return { skipped: true, reason: 'Missing mail credentials' };
     }*/
    const url = `${BASE_URL}/confirmarUsuario/${direccion}/${key}`;
    try {
        const result = await transporter.sendMail({
            from: MAIL_USER,
            to: direccion,
            subject: men,
            text: 'Pulsa aquí para confirmar cuenta: ' + url,
            html: `<p>Bienvenido a Sistema</p><p><a href="${url}">Pulsa aquí para confirmar cuenta</a></p>`
        });
        console.log('[email.js] Correo enviado a', direccion, 'resultado:', result);
        return { ok: true, result };
    } catch (err) {
        console.error('[email.js] Error enviando correo:', err && err.message ? err.message : err);
        // No reventar el servidor si el email falla
        return { ok: false, error: err && err.message ? err.message : String(err) };
    }
};

/*
module.exports.obtenerOptions = gv.obtenerOptions;

gv.obtenerOptions(function (res) {
    const options = res;
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: options
    });
});*/



