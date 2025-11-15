const datos = require('./cad.js');
const correo = require("./email.js");
const bcrypt = require('bcrypt');


function Sistema() {

    this.cad = new datos.CAD();
    this.cad.conectar(function (db) {
        console.log("Conectado a Mongo Atlas");
    });
    this.usuarios = {};

    this.agregarUsuario = function (nick) {
        let res = { "nick": -1 };
        if (!this.usuarios[nick]) {
            this.usuarios[nick] = new Usuario(nick);
            res.nick = nick;
        } else {
            console.log("El nick" + nick + " ya está en uso");
        }
        return res;
    }

    this.obtenerUsuarios = function () {
        return this.usuarios;
    }

    this.usuarioActivo = function (nick) {
        let res = { "nick": -1 };
        if (this.usuarios[nick]) {
            res.nick = true;
            return res;
        }
        res.nick = false;
        return res;
    }

    this.eliminarUsuario = function (nick) {
        if (this.usuarios[nick]) {
            delete this.usuarios[nick];
            return { deleted: true };
        }
        return { deleted: false };
    }

    this.numeroUsuarios = function () {
        return Object.keys(this.usuarios).length;
    }

    // Inicializar CAD y conectar
    this.usuarioGoogle = function (usr, callback) {
        this.cad.buscarOCrearUsuario(usr, function (obj) {
            callback(obj);
        });
    }
    // Registrar usuario: si no existe, insertarlo en la BD (hash de password usando bcrypt)
    // Añadimos soporte para AUTO_CONFIRM (entorno dev) y para reenviar confirmación
   this.registrarUsuario=function(obj,callback){ 
    let modelo=this; 
    if (!obj.nick){ 
        obj.nick=obj.email; 
    } 

    this.cad.buscarUsuario({"email":obj.email},async function(usr){ 
        if (!usr){ 
            let key=Date.now().toString(); 
            obj.confirmada=false; 
            obj.key=key; 
            const hash = await bcrypt.hash(obj.password, 10); 
            obj.password=hash; 
            modelo.cad.insertarUsuario(obj,function(res){ 
                callback(res); 
            }); 
            correo.enviarEmail(obj.email,key,"Confirmar cuenta"); 
        } 
        else 
            { 
                callback({"email":-1}); 
            } 
        }); 
    }

    // Login: comprobar credenciales
    this.loginUsuario = function (obj, callback) {
        let modelo = this;
        this.cad.buscarUsuario({ "email": obj.email, "confirmada": true },
            function (usr) {
                if (!usr) {
                    callback({ "email": -1 });
                    return -1;
                }
                else {
                    bcrypt.compare(obj.password, usr.password,
                        function (err, result) {
                            if (result) {
                                callback(usr);
                                modelo.agregarUsuario(usr);
                            }
                            else {
                                callback({ "email": -1 });
                            }
                        });
                }
            });
    }

// Confirmar usuario mediante email y clave
this.confirmarUsuario = function (obj, callback) {
    let modelo = this;
    // Buscar usuario que tenga esa email, key y no esté confirmada
    this.cad.buscarUsuario({ email: obj.email, key: obj.key, confirmada: false }, function (usr) {
        if (usr) {
            // Marcar como confirmada y actualizar
            usr.confirmada = true;
            modelo.cad.actualizarUsuario(usr, function (res) {
                callback({ "email": res.email });
            });
        } else {
            callback({ email: -1 });
        }
    });
}

this.cifrarContraseñaHash = function (password, callback) {
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, function (err, hash) {
        if (err) {
            console.log("Error al cifrar contraseña");
        } else {
            callback(hash);
        }
    });
}

this.compararContraseña = function (password, hash, callback) {
    bcrypt.compare(password, hash, function (err, res) {
        if (err) {
            console.log("Error al comparar contraseñas");
            callback(false);
        } else {
            callback(res);
        }
    });
}

function Usuario(nick) {
    this.nick = nick;
}
}

module.exports.Sistema = Sistema;


