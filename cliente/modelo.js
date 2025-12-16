
function Sistema(test) {
    this.usuarios = {};
    this.partidas = {};

    if (!test) {
        this.cad = new datos.CAD();
        this.cad.conectar(function (db) {
            console.log("Conectado a Mongo Atlas");
        });
    }

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
            return codigo;
        }
        return -1;
    }

    this.unirAPartida = function (email, codigo) {
        if (this.partidas[codigo]) {
            if (this.partidas[codigo].jugadores.length < this.partidas[codigo].maxJug) {
                this.partidas[codigo].jugadores.push(email);
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
        this.cad.buscarOCrearUsuario(usr, function (obj) {
            callback(obj);
        });
    }
    // Registrar usuario: si no existe, insertarlo en la BD (hash de password usando bcrypt)
    // Añadimos soporte para AUTO_CONFIRM (entorno dev) y para reenviar confirmación
    this.registrarUsuario = function (obj, callback) {
        let modelo = this;
        if (!obj.nick) {
            obj.nick = obj.email;
        }

        this.cad.buscarUsuario({ "email": obj.email }, async function (usr) {
            if (!usr) {
                let key = Date.now().toString();
                obj.confirmada = false;
                obj.key = key;
                const hash = await bcrypt.hash(obj.password, 10);
                obj.password = hash;
                modelo.cad.insertarUsuario(obj, function (res) {
                    callback(res);
                });
                correo.enviarEmail(obj.email, key, "Confirmar cuenta");
            }
            else {
                callback({ "email": -1 });
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
}

function Usuario(nick) {
    this.nick = nick;
    this.email = nick; // Para pruebas
    this.clave = undefined;
}

function Partida(codigo) {
    this.codigo = codigo;
    this.jugadores = [];
    this.maxJug = 2;
}




