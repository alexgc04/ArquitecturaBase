const datos = require('./cad.js');
const correo = require("./email.js");
const bcrypt = require('bcrypt');


function Sistema() {

    this.cad = new datos.CAD();
    this.cad.conectar(function (db) {
        console.log("Conectado a Mongo Atlas");
    });
    this.usuarios = {};
    this.partidas = {};

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

    this.crearPartida = function (email) {
        let codigo = this.obtenerCodigo();
        if (!this.partidas[codigo]) {
            this.partidas[codigo] = new Partida(codigo);
            this.partidas[codigo].jugadores.push(email);
            this.cad.insertarLog({ "tipo": "crearPartida", "usuario": email, "fecha": new Date() }, function (res) { });
            return codigo;
        }
        return -1;
    }

    this.unirAPartida = function (email, codigo) {
        if (this.partidas[codigo]) {
            if (this.partidas[codigo].jugadores.length < this.partidas[codigo].maxJug) {
                this.partidas[codigo].jugadores.push(email);
                this.cad.insertarLog({ "tipo": "unirAPartida", "usuario": email, "fecha": new Date() }, function (res) { });
                return codigo;
            }
        }
        return -1;
    }

    this.obtenerPartidasDisponibles = function () {
        let lista = [];
        for (var e in this.partidas) {
            if (this.partidas[e].jugadores.length < this.partidas[e].maxJug) {
                lista.push({ "codigo": e, "email": this.partidas[e].jugadores[0] });
            }
        }
        return lista;
    }

    this.salirPartida = function (codigo, email) {
        if (this.partidas[codigo]) {
            let index = this.partidas[codigo].jugadores.indexOf(email);
            if (index > -1) {
                this.partidas[codigo].jugadores.splice(index, 1);
                this.cad.insertarLog({ "tipo": "salirPartida", "usuario": email, "fecha": new Date() }, function (res) { });
            }
            if (this.partidas[codigo].jugadores.length === 0) {
                delete this.partidas[codigo];
                return { codigo: codigo, eliminada: true };
            }
            return { codigo: codigo, eliminada: false, jugadores: this.partidas[codigo].jugadores };
        }
        return { codigo: -1 };
    }

    this.eliminarPartida = function (codigo, email) {
        if (this.partidas[codigo]) {
            if (this.partidas[codigo].jugadores[0] === email) {
                let jugadores = this.partidas[codigo].jugadores;
                delete this.partidas[codigo];
                this.cad.insertarLog({ "tipo": "eliminarPartida", "usuario": email, "fecha": new Date() }, function (res) { });
                return { codigo: codigo, eliminada: true, jugadores: jugadores };
            }
        }
        return { codigo: codigo, eliminada: false };
    }

    this.obtenerLogs = function (callback) {
        this.cad.obtenerLogs(callback);
    }

    this.obtenerCodigo = function () {
        let cadena = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let codigo = "";
        for (let i = 0; i < 6; i++) {
            codigo += cadena.charAt(Math.floor(Math.random() * cadena.length));
        }
        return codigo;
    }

    // Inicializar CAD y conectar
    this.usuarioGoogle = function (usr, callback) {
        let modelo = this;
        this.cad.buscarOCrearUsuario(usr, function (obj) {
            callback(obj);
            modelo.cad.insertarLog({ "tipo": "inicioGoogle", "usuario": usr.email, "fecha": new Date() }, function (res) { });
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
                modelo.cad.insertarLog({ "tipo": "registroUsuario", "usuario": obj.email, "fecha": new Date() }, function (res) { });
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
                                modelo.cad.insertarLog({ "tipo": "inicioLocal", "usuario": usr.email, "fecha": new Date() }, function (res) { });
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

function Partida(codigo) {
    this.codigo = codigo;
    this.jugadores = [];
    this.maxJug = 2;
}
}

module.exports.Sistema = Sistema;


