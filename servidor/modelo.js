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
    
    this.obtenerPartida = function (codigo) {
        if (this.partidas[codigo]) {
            // Devolver la referencia real a la partida para poder modificarla
            return this.partidas[codigo];
        }
        return null;
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

    // ==========================================
    // SISTEMA DE ROOMS MEJORADO
    // ==========================================
    
    this.crearRoom = function(email, gameMode, dominio) {
        let roomId = this.obtenerCodigo();
        
        // Evitar colisiones de código
        while (this.partidas[roomId]) {
            roomId = this.obtenerCodigo();
        }
        
        this.partidas[roomId] = {
            codigo: roomId,
            roomId: roomId,
            jugadores: [email],
            maxJug: 2,
            gameMode: gameMode, // 'tankstars', 'spaceinvaders', 'batallanaval', 'shooter', 'defensa'
            dominio: dominio,   // 'tierra', 'aire', 'mar'
            estado: 'esperando', // 'esperando', 'seleccion', 'jugando', 'finalizada'
            creador: email,
            fechaCreacion: new Date(),
            configuracion: {},
            turnoActual: null,
            datos: {} // Datos específicos del juego
        };
        
        this.cad.insertarLog({ 
            tipo: "crearRoom", 
            usuario: email, 
            roomId: roomId,
            gameMode: gameMode,
            dominio: dominio,
            fecha: new Date() 
        }, function(res) {});
        
        return this.partidas[roomId];
    }
    
    this.unirRoom = function(email, roomId) {
        if (this.partidas[roomId]) {
            const room = this.partidas[roomId];
            
            if (room.jugadores.length >= room.maxJug && !room.jugadores.includes(email)) {
                return { error: 'Room llena' };
            }
            
            // Si ya está en la sala, simplemente devolver la room (reconexión)
            if (room.jugadores.includes(email)) {
                console.log(`🔄 ${email} ya estaba en la room ${roomId}, reconectando...`);
                return room; // Permitir reconexión
            }
            
            room.jugadores.push(email);
            room.estado = 'seleccion';
            
            this.cad.insertarLog({ 
                tipo: "unirRoom", 
                usuario: email, 
                roomId: roomId,
                fecha: new Date() 
            }, function(res) {});
            
            return room;
        }
        return { error: 'Room no encontrada' };
    }
    
    this.obtenerRoom = function(roomId) {
        return this.partidas[roomId] || null;
    }
    
    this.actualizarEstadoRoom = function(roomId, estado) {
        if (this.partidas[roomId]) {
            this.partidas[roomId].estado = estado;
            return this.partidas[roomId];
        }
        return null;
    }
    
    this.obtenerRoomsDisponibles = function(gameMode, dominio) {
        let lista = [];
        for (let codigo in this.partidas) {
            const room = this.partidas[codigo];
            if (room.jugadores.length < room.maxJug && room.estado === 'esperando') {
                // Filtrar por gameMode y dominio si se especifican
                if (gameMode && room.gameMode !== gameMode) continue;
                if (dominio && room.dominio !== dominio) continue;
                
                lista.push({
                    roomId: room.roomId,
                    codigo: room.codigo,
                    creador: room.creador,
                    gameMode: room.gameMode,
                    dominio: room.dominio,
                    jugadores: room.jugadores.length
                });
            }
        }
        return lista;
    }
    
    this.eliminarRoom = function(roomId) {
        if (this.partidas[roomId]) {
            delete this.partidas[roomId];
            return true;
        }
        return false;
    }

    // ==========================================
    // SISTEMA DE XP, COPAS Y RANGOS
    // ==========================================
    
    this.obtenerRango = function(copas) {
        const RANGOS = [
            { nombre: 'Recluta', minCopas: 0, maxCopas: 99, emoji: '🔰', color: '#9E9E9E' },
            { nombre: 'Soldado', minCopas: 100, maxCopas: 299, emoji: '⚔️', color: '#8D6E63' },
            { nombre: 'Cabo', minCopas: 300, maxCopas: 599, emoji: '🎖️', color: '#78909C' },
            { nombre: 'Sargento', minCopas: 600, maxCopas: 999, emoji: '🏅', color: '#4CAF50' },
            { nombre: 'Teniente', minCopas: 1000, maxCopas: 1499, emoji: '🌟', color: '#2196F3' },
            { nombre: 'Capitán', minCopas: 1500, maxCopas: 2099, emoji: '⭐', color: '#9C27B0' },
            { nombre: 'Mayor', minCopas: 2100, maxCopas: 2799, emoji: '💫', color: '#E91E63' },
            { nombre: 'Coronel', minCopas: 2800, maxCopas: 3599, emoji: '🎯', color: '#FF5722' },
            { nombre: 'General', minCopas: 3600, maxCopas: 4499, emoji: '👑', color: '#FFD700' },
            { nombre: 'Mariscal', minCopas: 4500, maxCopas: 5499, emoji: '🏆', color: '#FF4500' },
            { nombre: 'Leyenda', minCopas: 5500, maxCopas: Infinity, emoji: '🔱', color: '#00FFFF' }
        ];
        
        for (let i = RANGOS.length - 1; i >= 0; i--) {
            if (copas >= RANGOS[i].minCopas) {
                return { ...RANGOS[i], indice: i };
            }
        }
        return { ...RANGOS[0], indice: 0 };
    }
    
    this.calcularNivel = function(xpTotal) {
        const XP_POR_NIVEL = [
            0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
            4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000, 26000
        ];
        
        let nivel = 1;
        for (let i = 1; i < XP_POR_NIVEL.length; i++) {
            if (xpTotal >= XP_POR_NIVEL[i]) {
                nivel = i + 1;
            } else {
                break;
            }
        }
        
        // Si supera el nivel máximo definido
        if (nivel >= XP_POR_NIVEL.length) {
            // Cada nivel extra requiere 5000 XP más
            const xpExtra = xpTotal - XP_POR_NIVEL[XP_POR_NIVEL.length - 1];
            nivel = XP_POR_NIVEL.length + Math.floor(xpExtra / 5000);
        }
        
        // Calcular XP actual en el nivel y XP necesaria para el siguiente
        const xpNivelActual = nivel <= XP_POR_NIVEL.length ? XP_POR_NIVEL[nivel - 1] : 
            XP_POR_NIVEL[XP_POR_NIVEL.length - 1] + (nivel - XP_POR_NIVEL.length) * 5000;
        const xpNivelSiguiente = nivel < XP_POR_NIVEL.length ? XP_POR_NIVEL[nivel] :
            xpNivelActual + 5000;
        
        return {
            nivel: nivel,
            xpTotal: xpTotal,
            xpEnNivel: xpTotal - xpNivelActual,
            xpParaSiguiente: xpNivelSiguiente - xpNivelActual,
            porcentaje: ((xpTotal - xpNivelActual) / (xpNivelSiguiente - xpNivelActual)) * 100
        };
    }
    
    // Función principal para finalizar partida
    this.finalizarPartida = function(datosPartida, callback) {
        let modelo = this;
        
        const { 
            roomId,
            ganadorEmail, 
            perdedorEmail, 
            esEmpate,
            gameMode,
            dominio,
            duracion,
            estadisticas
        } = datosPartida;
        
        // Calcular recompensas según resultado
        const recompensasGanador = esEmpate ? {
            oro: 20 + Math.floor(Math.random() * 10),
            xp: 15 + Math.floor(Math.random() * 5),
            copas: 0
        } : {
            oro: 50 + Math.floor(Math.random() * 30),
            xp: 30 + Math.floor(Math.random() * 15),
            copas: 25 + Math.floor(Math.random() * 10)
        };
        
        const recompensasPerdedor = esEmpate ? {
            oro: 20 + Math.floor(Math.random() * 10),
            xp: 15 + Math.floor(Math.random() * 5),
            copas: 0
        } : {
            oro: 10 + Math.floor(Math.random() * 5),
            xp: 10 + Math.floor(Math.random() * 5),
            copas: -(15 + Math.floor(Math.random() * 5))
        };
        
        // Actualizar ambos jugadores en paralelo
        let resultados = { ganador: null, perdedor: null };
        let completados = 0;
        
        const procesarResultados = () => {
            completados++;
            if (completados === 2) {
                // Limpiar la room
                modelo.eliminarRoom(roomId);
                
                // Log de la partida
                modelo.cad.insertarLog({
                    tipo: "finPartida",
                    roomId: roomId,
                    gameMode: gameMode,
                    dominio: dominio,
                    ganador: ganadorEmail,
                    perdedor: perdedorEmail,
                    esEmpate: esEmpate,
                    duracion: duracion,
                    estadisticas: estadisticas,
                    fecha: new Date()
                }, function(res) {});
                
                callback(resultados);
            }
        };
        
        // Actualizar ganador
        modelo.actualizarEstadisticasJugador(
            ganadorEmail, 
            recompensasGanador, 
            esEmpate ? 'empate' : 'victoria',
            function(resultado) {
                resultados.ganador = resultado;
                procesarResultados();
            }
        );
        
        // Actualizar perdedor (o segundo jugador en empate)
        if (perdedorEmail && perdedorEmail !== ganadorEmail) {
            modelo.actualizarEstadisticasJugador(
                perdedorEmail, 
                recompensasPerdedor, 
                esEmpate ? 'empate' : 'derrota',
                function(resultado) {
                    resultados.perdedor = resultado;
                    procesarResultados();
                }
            );
        } else {
            completados++;
            procesarResultados();
        }
    }
    
    // Actualizar estadísticas de un jugador
    this.actualizarEstadisticasJugador = function(email, recompensas, resultado, callback) {
        let modelo = this;
        
        this.cad.buscarUsuario({ email: email }, function(usuario) {
            if (!usuario) {
                callback({ error: 'Usuario no encontrado' });
                return;
            }
            
            // Inicializar campos si no existen
            const oroAnterior = usuario.oro || 0;
            const xpAnterior = usuario.xp || 0;
            const copasAnterior = usuario.copas || 0;
            const victoriasAnterior = usuario.victorias || 0;
            const derrotasAnterior = usuario.derrotas || 0;
            const empatesAnterior = usuario.empates || 0;
            
            // Calcular nuevos valores
            const nuevoOro = oroAnterior + recompensas.oro;
            const nuevaXp = xpAnterior + recompensas.xp;
            let nuevasCopas = copasAnterior + recompensas.copas;
            nuevasCopas = Math.max(0, nuevasCopas); // No puede ser negativo
            
            // Calcular nivel anterior y nuevo
            const nivelAnterior = modelo.calcularNivel(xpAnterior);
            const nivelNuevo = modelo.calcularNivel(nuevaXp);
            const subioNivel = nivelNuevo.nivel > nivelAnterior.nivel;
            
            // Calcular rango anterior y nuevo
            const rangoAnterior = modelo.obtenerRango(copasAnterior);
            const rangoNuevo = modelo.obtenerRango(nuevasCopas);
            const cambioRango = rangoNuevo.indice !== rangoAnterior.indice;
            const subioRango = rangoNuevo.indice > rangoAnterior.indice;
            const bajoRango = rangoNuevo.indice < rangoAnterior.indice;
            
            // Actualizar estadísticas según resultado
            let victorias = victoriasAnterior;
            let derrotas = derrotasAnterior;
            let empates = empatesAnterior;
            
            if (resultado === 'victoria') victorias++;
            else if (resultado === 'derrota') derrotas++;
            else if (resultado === 'empate') empates++;
            
            // Preparar objeto de actualización
            const actualizacion = {
                email: email,
                oro: nuevoOro,
                xp: nuevaXp,
                copas: nuevasCopas,
                nivel: nivelNuevo.nivel,
                rango: rangoNuevo.nombre,
                victorias: victorias,
                derrotas: derrotas,
                empates: empates,
                ultimaPartida: new Date()
            };
            
            // Actualizar en la base de datos
            modelo.cad.actualizarUsuarioPorEmail(actualizacion, function(res) {
                callback({
                    email: email,
                    resultado: resultado,
                    recompensas: recompensas,
                    
                    // Oro
                    oroAnterior: oroAnterior,
                    oroNuevo: nuevoOro,
                    oroGanado: recompensas.oro,
                    
                    // XP y Nivel
                    xpAnterior: xpAnterior,
                    xpNuevo: nuevaXp,
                    xpGanado: recompensas.xp,
                    nivelAnterior: nivelAnterior.nivel,
                    nivelNuevo: nivelNuevo.nivel,
                    subioNivel: subioNivel,
                    xpEnNivel: nivelNuevo.xpEnNivel,
                    xpParaSiguiente: nivelNuevo.xpParaSiguiente,
                    porcentajeNivel: nivelNuevo.porcentaje,
                    
                    // Copas y Rango
                    copasAnterior: copasAnterior,
                    copasNuevo: nuevasCopas,
                    copasCambio: recompensas.copas,
                    rangoAnterior: rangoAnterior,
                    rangoNuevo: rangoNuevo,
                    cambioRango: cambioRango,
                    subioRango: subioRango,
                    bajoRango: bajoRango,
                    
                    // Estadísticas
                    victorias: victorias,
                    derrotas: derrotas,
                    empates: empates
                });
            });
        });
    }
    
    // Obtener perfil completo de usuario
    this.obtenerPerfilCompleto = function(email, callback) {
        let modelo = this;
        
        this.cad.buscarUsuario({ email: email }, function(usuario) {
            if (!usuario) {
                callback({ error: 'Usuario no encontrado' });
                return;
            }
            
            const xp = usuario.xp || 0;
            const copas = usuario.copas || 0;
            
            const infoNivel = modelo.calcularNivel(xp);
            const infoRango = modelo.obtenerRango(copas);
            
            callback({
                email: usuario.email,
                nick: usuario.nick || usuario.email,
                
                // Recursos
                oro: usuario.oro || 0,
                diamantes: usuario.diamantes || 0,
                
                // Nivel
                nivel: infoNivel.nivel,
                xp: xp,
                xpEnNivel: infoNivel.xpEnNivel,
                xpParaSiguiente: infoNivel.xpParaSiguiente,
                porcentajeNivel: infoNivel.porcentaje,
                
                // Rango
                copas: copas,
                rango: infoRango,
                
                // Estadísticas
                victorias: usuario.victorias || 0,
                derrotas: usuario.derrotas || 0,
                empates: usuario.empates || 0,
                
                // Otros
                fechaRegistro: usuario.fechaRegistro || null,
                ultimaPartida: usuario.ultimaPartida || null
            });
        });
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

} // Cierre de function Sistema

function Usuario(nick) {
    this.nick = nick;
}

function Partida(codigo) {
    this.codigo = codigo;
    this.jugadores = [];
    this.maxJug = 2;
}

// ==========================================
// SISTEMA DE RANGOS Y NIVELES
// ==========================================

const RANGOS = [
    { nombre: 'Recluta', minCopas: 0, maxCopas: 99, emoji: '🔰', color: '#9E9E9E' },
    { nombre: 'Soldado', minCopas: 100, maxCopas: 299, emoji: '⚔️', color: '#8D6E63' },
    { nombre: 'Cabo', minCopas: 300, maxCopas: 599, emoji: '🎖️', color: '#78909C' },
    { nombre: 'Sargento', minCopas: 600, maxCopas: 999, emoji: '🏅', color: '#4CAF50' },
    { nombre: 'Teniente', minCopas: 1000, maxCopas: 1499, emoji: '🌟', color: '#2196F3' },
    { nombre: 'Capitán', minCopas: 1500, maxCopas: 2099, emoji: '⭐', color: '#9C27B0' },
    { nombre: 'Mayor', minCopas: 2100, maxCopas: 2799, emoji: '💫', color: '#E91E63' },
    { nombre: 'Coronel', minCopas: 2800, maxCopas: 3599, emoji: '🎯', color: '#FF5722' },
    { nombre: 'General', minCopas: 3600, maxCopas: 4499, emoji: '👑', color: '#FFD700' },
    { nombre: 'Mariscal', minCopas: 4500, maxCopas: 5499, emoji: '🏆', color: '#FF4500' },
    { nombre: 'Leyenda', minCopas: 5500, maxCopas: Infinity, emoji: '🔱', color: '#00FFFF' }
];

const XP_POR_NIVEL = [
    0,      // Nivel 1
    100,    // Nivel 2
    250,    // Nivel 3
    450,    // Nivel 4
    700,    // Nivel 5
    1000,   // Nivel 6
    1400,   // Nivel 7
    1900,   // Nivel 8
    2500,   // Nivel 9
    3200,   // Nivel 10
    4000,   // Nivel 11
    5000,   // Nivel 12
    6200,   // Nivel 13
    7600,   // Nivel 14
    9200,   // Nivel 15
    11000,  // Nivel 16
    13000,  // Nivel 17
    15500,  // Nivel 18
    18500,  // Nivel 19
    22000,  // Nivel 20
    26000,  // Nivel 21+
];

const RECOMPENSAS_PARTIDA = {
    victoria: {
        oro: { base: 50, bonus: 20 },
        xp: { base: 30, bonus: 10 },
        copas: { base: 25, bonus: 5 }
    },
    empate: {
        oro: { base: 20, bonus: 5 },
        xp: { base: 15, bonus: 5 },
        copas: { base: 0, bonus: 0 }
    },
    derrota: {
        oro: { base: 10, bonus: 0 },
        xp: { base: 10, bonus: 0 },
        copas: { base: -15, bonus: -5 }
    }
};

module.exports.Sistema = Sistema;
module.exports.RANGOS = RANGOS;
module.exports.XP_POR_NIVEL = XP_POR_NIVEL;
module.exports.RECOMPENSAS_PARTIDA = RECOMPENSAS_PARTIDA;


