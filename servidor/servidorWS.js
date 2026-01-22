// ==========================================
// SERVIDOR WEBSOCKET CON SISTEMA DE ROOMS
// ==========================================

function WSServer() {
    
    // Mapa de socket.id -> { email, roomId }
    this.conexiones = {};
    
    this.lanzarServidor = function(io, sistema) {
        let srv = this;
        
        io.on('connection', function(socket) {
            console.log("🔌 Nueva conexión WebSocket:", socket.id);
            
            // ==========================================
            // REGISTRO DE CONEXIÓN
            // ==========================================
            
            socket.on("registrarConexion", function(datos) {
                srv.conexiones[socket.id] = {
                    email: datos.email,
                    roomId: null
                };
                console.log("👤 Usuario registrado:", datos.email);
            });
            
            // ==========================================
            // SISTEMA DE ROOMS UNIFICADO
            // ==========================================
            
            // Crear Room (funciona para todos los modos)
            socket.on("crearRoom", function(datos) {
                const { email, gameMode, dominio, configuracion } = datos;
                
                const room = sistema.crearRoom(email, gameMode, dominio);
                
                if (room) {
                    // Guardar configuración adicional
                    if (configuracion) {
                        room.configuracion = configuracion;
                    }
                    
                    // Unir socket a la sala
                    socket.join(room.roomId);
                    
                    // Actualizar registro de conexión
                    if (srv.conexiones[socket.id]) {
                        srv.conexiones[socket.id].roomId = room.roomId;
                    }
                    
                    console.log(`🏠 Room creada: ${room.roomId} | Modo: ${gameMode} | Dominio: ${dominio}`);
                    
                    srv.enviarAlRemitente(socket, "roomCreada", {
                        roomId: room.roomId,
                        gameMode: gameMode,
                        dominio: dominio,
                        creador: email,
                        estado: room.estado
                    });
                    
                    // Notificar a todos la lista actualizada
                    srv.actualizarListaRooms(io, sistema);
                } else {
                    srv.enviarAlRemitente(socket, "errorRoom", {
                        mensaje: "No se pudo crear la sala"
                    });
                }
            });
            
            // Unirse a Room
            socket.on("unirRoom", function(datos) {
                const { email, roomId } = datos;
                
                const resultado = sistema.unirRoom(email, roomId);
                
                if (resultado.error) {
                    srv.enviarAlRemitente(socket, "errorRoom", {
                        mensaje: resultado.error
                    });
                    return;
                }
                
                const room = resultado;
                
                // Unir socket a la sala
                socket.join(roomId);
                
                // Actualizar registro de conexión
                if (srv.conexiones[socket.id]) {
                    srv.conexiones[socket.id].roomId = roomId;
                }
                
                console.log(`👥 ${email} se unió a room: ${roomId}`);
                
                // Notificar al que se unió
                srv.enviarAlRemitente(socket, "unidoARoom", {
                    roomId: roomId,
                    gameMode: room.gameMode,
                    dominio: room.dominio,
                    creador: room.creador,
                    jugadores: room.jugadores,
                    configuracion: room.configuracion
                });
                
                // Notificar al creador (y otros en la sala)
                socket.to(roomId).emit("jugadorUnido", {
                    email: email,
                    jugadores: room.jugadores,
                    roomId: roomId
                });
                
                // Actualizar lista
                srv.actualizarListaRooms(io, sistema);
            });
            
            // Salir de Room
            socket.on("salirRoom", function(datos) {
                const { email, roomId } = datos;
                
                const resultado = sistema.salirPartida(roomId, email);
                
                if (resultado.codigo !== -1) {
                    socket.leave(roomId);
                    
                    if (srv.conexiones[socket.id]) {
                        srv.conexiones[socket.id].roomId = null;
                    }
                    
                    if (resultado.eliminada) {
                        // La room fue eliminada (era el último)
                        io.to(roomId).emit("roomEliminada", { roomId: roomId });
                    } else {
                        // Notificar a los demás
                        socket.to(roomId).emit("jugadorSalio", {
                            email: email,
                            roomId: roomId
                        });
                    }
                    
                    srv.enviarAlRemitente(socket, "salioDeRoom", { roomId: roomId });
                    srv.actualizarListaRooms(io, sistema);
                }
            });
            
            // Obtener lista de Rooms
            socket.on("obtenerRooms", function(datos) {
                const { gameMode, dominio } = datos || {};
                const lista = sistema.obtenerRoomsDisponibles(gameMode, dominio);
                srv.enviarAlRemitente(socket, "listaRooms", lista);
            });
            
            // ==========================================
            // EVENTOS DE SELECCIÓN DE PERSONAJE
            // ==========================================
            
            socket.on("seleccionPersonaje", function(datos) {
                const { roomId, email, tropaId, tropaEmoji, tropaNombre } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room) {
                    // Guardar selección
                    if (!room.datos.selecciones) {
                        room.datos.selecciones = {};
                    }
                    room.datos.selecciones[email] = {
                        tropaId: tropaId,
                        tropaEmoji: tropaEmoji,
                        tropaNombre: tropaNombre
                    };
                    
                    // Notificar al rival
                    socket.to(roomId).emit("rivalSeleccionoPersonaje", {
                        email: email,
                        tropaId: tropaId,
                        tropaEmoji: tropaEmoji,
                        tropaNombre: tropaNombre
                    });
                }
            });
            
            socket.on("jugadorListo", function(datos) {
                const { roomId, email } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room) {
                    if (!room.datos.listos) {
                        room.datos.listos = [];
                    }
                    
                    if (!room.datos.listos.includes(email)) {
                        room.datos.listos.push(email);
                    }
                    
                    // Notificar al rival
                    socket.to(roomId).emit("rivalListo", {
                        email: email
                    });
                    
                    // Si ambos están listos, iniciar partida
                    if (room.datos.listos.length >= 2) {
                        room.estado = 'jugando';
                        room.turnoActual = room.jugadores[0]; // Creador empieza
                        
                        io.to(roomId).emit("iniciarPartida", {
                            roomId: roomId,
                            gameMode: room.gameMode,
                            dominio: room.dominio,
                            turnoInicial: room.turnoActual,
                            jugadores: room.jugadores,
                            selecciones: room.datos.selecciones
                        });
                    }
                }
            });
            
            // ==========================================
            // EVENTOS DE JUEGO - TANK STARS (TIERRA)
            // ==========================================
            
            // Disparo en turno
            socket.on("tankDisparo", function(datos) {
                const { roomId, email, angulo, potencia, armaId } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room && room.turnoActual === email) {
                    socket.to(roomId).emit("rivalDisparo", {
                        angulo: angulo,
                        potencia: potencia,
                        armaId: armaId
                    });
                }
            });
            
            // Resultado del disparo
            socket.on("tankResultado", function(datos) {
                const { roomId, impacto, danio, vidaRestante, posicionImpacto } = datos;
                
                socket.to(roomId).emit("resultadoDisparo", {
                    impacto: impacto,
                    danio: danio,
                    vidaRestante: vidaRestante,
                    posicionImpacto: posicionImpacto
                });
            });
            
            // Cambio de turno
            socket.on("tankCambioTurno", function(datos) {
                const { roomId, siguienteTurno, viento, turnoNumero } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room) {
                    room.turnoActual = siguienteTurno;
                    
                    io.to(roomId).emit("nuevoTurno", {
                        turnoActual: siguienteTurno,
                        viento: viento,
                        turnoNumero: turnoNumero
                    });
                }
            });
            
            // Movimiento de tanque
            socket.on("tankMovimiento", function(datos) {
                const { roomId, email, nuevaX, nuevaY, combustibleRestante } = datos;
                
                socket.to(roomId).emit("rivalMovimiento", {
                    nuevaX: nuevaX,
                    nuevaY: nuevaY,
                    combustibleRestante: combustibleRestante
                });
            });
            
            // Sincronización de apuntado en tiempo real
            socket.on("tankApuntado", function(datos) {
                const { roomId, email, angulo, potencia } = datos;
                
                socket.to(roomId).emit("rivalApuntado", {
                    angulo: angulo,
                    potencia: potencia
                });
            });
            
            // Superpoder de tanque
            socket.on("tankSuperpoder", function(datos) {
                const { roomId, email, superpoderTipo, objetivo } = datos;
                
                socket.to(roomId).emit("rivalSuperpoder", {
                    superpoderTipo: superpoderTipo,
                    objetivo: objetivo
                });
            });
            
            // Sincronizar vida
            socket.on("tankVida", function(datos) {
                const { roomId, email, vidaJugador, vidaEnemigo } = datos;
                
                socket.to(roomId).emit("sincronizarVida", {
                    vidaJugador: vidaJugador,
                    vidaEnemigo: vidaEnemigo,
                    emisor: email
                });
            });
            
            // Abandonar partida
            socket.on("abandonarPartida", function(datos) {
                const { roomId, email } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room) {
                    // Notificar victoria por abandono al otro jugador
                    const rivalEmail = room.jugadores.find(j => j !== email);
                    if (rivalEmail) {
                        socket.to(roomId).emit("victoriaAbandonoRival", {
                            razon: `${email} ha abandonado la partida`,
                            ganador: rivalEmail
                        });
                    }
                    
                    // Marcar partida como finalizada
                    room.estado = 'finalizada';
                    
                    // Limpiar después de un tiempo
                    setTimeout(() => {
                        sistema.eliminarRoom(roomId);
                    }, 5000);
                }
                
                socket.leave(roomId);
            });
            
            // ==========================================
            // EVENTOS DE JUEGO - SPACE INVADERS / DOGFIGHT (AIRE)
            // ==========================================
            
            // Posición de la nave (incluye Y para dogfight)
            socket.on("spaceNavePos", function(datos) {
                const { roomId, x, y, disparando } = datos;
                
                socket.to(roomId).emit("rivalNavePos", {
                    x: x,
                    y: y,
                    disparando: disparando
                });
            });
            
            // Impacto en dogfight
            socket.on("spaceImpacto", function(datos) {
                const { roomId, email, daño } = datos;
                
                socket.to(roomId).emit("recibirImpactoAereo", {
                    atacante: email,
                    daño: daño
                });
            });
            
            // Powerup sincronizado
            socket.on("spacePowerup", function(datos) {
                const { roomId, powerup } = datos;
                
                socket.to(roomId).emit("recibirPowerup", {
                    powerup: powerup
                });
            });
            
            // Enemigo eliminado
            socket.on("spaceEnemigoEliminado", function(datos) {
                const { roomId, enemigoId, puntos } = datos;
                
                socket.to(roomId).emit("enemigoEliminado", {
                    enemigoId: enemigoId,
                    puntos: puntos
                });
            });
            
            // Sincronizar oleada
            socket.on("spaceNuevaOleada", function(datos) {
                const { roomId, oleada, enemigos } = datos;
                
                socket.to(roomId).emit("sincronizarOleada", {
                    oleada: oleada,
                    enemigos: enemigos
                });
            });
            
            // ==========================================
            // EVENTOS DE JUEGO - BATALLA NAVAL (MAR)
            // ==========================================
            
            // Enviar configuración de barcos
            socket.on("navalEnviarFlota", function(datos) {
                const { roomId, email, barcos } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room) {
                    if (!room.datos.flotas) {
                        room.datos.flotas = {};
                    }
                    room.datos.flotas[email] = barcos;
                    
                    // Notificar que la flota está lista (sin revelar posiciones)
                    socket.to(roomId).emit("rivalFlotaLista", {
                        email: email
                    });
                    
                    // Si ambas flotas están listas, iniciar combate
                    if (Object.keys(room.datos.flotas).length >= 2) {
                        room.turnoActual = room.jugadores[0];
                        
                        io.to(roomId).emit("iniciarCombateNaval", {
                            turnoInicial: room.turnoActual
                        });
                    }
                }
            });
            
            // Disparo naval
            socket.on("navalDisparo", function(datos) {
                const { roomId, email, x, y } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room && room.turnoActual === email) {
                    // Notificar al rival que le disparan
                    socket.to(roomId).emit("recibirDisparo", {
                        x: x,
                        y: y,
                        atacante: email
                    });
                }
            });
            
            // Resultado de disparo naval
            socket.on("navalResultado", function(datos) {
                const { roomId, x, y, impacto, hundido, nombreBarco } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (room) {
                    // Cambiar turno si fue agua
                    const siguienteTurno = impacto ? 
                        room.turnoActual : // Si impacta, sigue disparando
                        room.jugadores.find(j => j !== room.turnoActual);
                    
                    room.turnoActual = siguienteTurno;
                    
                    io.to(roomId).emit("resultadoNaval", {
                        x: x,
                        y: y,
                        impacto: impacto,
                        hundido: hundido,
                        nombreBarco: nombreBarco,
                        siguienteTurno: siguienteTurno
                    });
                }
            });
            
            // ==========================================
            // FINALIZACIÓN DE PARTIDA
            // ==========================================
            
            socket.on("finalizarPartida", function(datos) {
                const { roomId, ganadorEmail, perdedorEmail, esEmpate, estadisticas } = datos;
                
                const room = sistema.obtenerRoom(roomId);
                if (!room || room.estado === 'finalizada') return;
                
                room.estado = 'finalizada';
                
                console.log(`🏁 Partida finalizada: ${roomId} | Ganador: ${ganadorEmail || 'Empate'}`);
                
                // Procesar recompensas en backend
                sistema.finalizarPartida({
                    roomId: roomId,
                    ganadorEmail: ganadorEmail,
                    perdedorEmail: perdedorEmail,
                    esEmpate: esEmpate,
                    gameMode: room.gameMode,
                    dominio: room.dominio,
                    duracion: Date.now() - room.fechaCreacion.getTime(),
                    estadisticas: estadisticas
                }, function(resultados) {
                    // Enviar resultados a ambos jugadores
                    io.to(roomId).emit("resultadosPartida", {
                        ganador: resultados.ganador,
                        perdedor: resultados.perdedor,
                        esEmpate: esEmpate
                    });
                    
                    // Limpiar room después de un tiempo
                    setTimeout(() => {
                        sistema.eliminarRoom(roomId);
                    }, 30000);
                });
            });
            
            // ==========================================
            // CHAT EN PARTIDA
            // ==========================================
            
            socket.on("mensajeChat", function(datos) {
                const { roomId, email, mensaje, tipo } = datos;
                
                socket.to(roomId).emit("nuevoMensaje", {
                    email: email,
                    mensaje: mensaje,
                    tipo: tipo || 'texto', // 'texto', 'emoji', 'rapido'
                    timestamp: Date.now()
                });
            });
            
            // ==========================================
            // EVENTOS LEGACY (compatibilidad)
            // ==========================================
            
            socket.on("crearPartida", function(datos) {
                let codigo = sistema.crearPartida(datos.email);
                if (codigo != -1) {
                    socket.join(codigo);
                    srv.enviarAlRemitente(socket, "partidaCreada", { "codigo": codigo });
                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                } else {
                    srv.enviarAlRemitente(socket, "falloCrearPartida", { "mensaje": "No se pudo crear la partida" });
                }
            });

            socket.on("unirAPartida", function(datos) {
                let codigo = sistema.unirAPartida(datos.email, datos.codigo);
                if (codigo != -1) {
                    socket.join(codigo);
                    let partida = sistema.obtenerPartida(datos.codigo);
                    
                    srv.enviarAlRemitente(socket, "unidoAPartida", {
                        "codigo": codigo,
                        "creador": partida ? partida.jugadores[0] : "Rival"
                    });
                    
                    socket.to(codigo).emit("nuevoJugador", { "codigo": codigo, "email": datos.email });
                    
                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    srv.enviarAlRemitente(socket, "listaPartidas", lista);
                } else {
                    srv.enviarAlRemitente(socket, "falloUnirAPartida", { "mensaje": "No se pudo unir a la partida" });
                }
            });
            
            // ==========================================
            // DESCONEXIÓN
            // ==========================================
            
            socket.on('disconnect', function() {
                const conexion = srv.conexiones[socket.id];
                
                if (conexion && conexion.roomId) {
                    const room = sistema.obtenerRoom(conexion.roomId);
                    
                    if (room) {
                        // Notificar desconexión a la sala
                        socket.to(conexion.roomId).emit("jugadorDesconectado", {
                            email: conexion.email,
                            roomId: conexion.roomId
                        });
                        
                        // Si estaban jugando, el rival gana
                        if (room.estado === 'jugando') {
                            const ganador = room.jugadores.find(j => j !== conexion.email);
                            
                            if (ganador) {
                                socket.to(conexion.roomId).emit("victoriaAbandonoRival", {
                                    ganador: ganador,
                                    razon: "El rival se ha desconectado"
                                });
                            }
                        }
                        
                        // Limpiar de la partida
                        sistema.salirPartida(conexion.roomId, conexion.email);
                    }
                }
                
                delete srv.conexiones[socket.id];
                console.log("❌ Desconexión:", socket.id);
            });
        });
    }
    
    // ==========================================
    // FUNCIONES AUXILIARES
    // ==========================================
    
    this.actualizarListaRooms = function(io, sistema) {
        const lista = sistema.obtenerRoomsDisponibles();
        io.emit("listaRooms", lista);
    }
    
    this.enviarAlRemitente = function(socket, mensaje, datos) {
        socket.emit(mensaje, datos);
    }
    
    this.enviarATodosMenosRemitente = function(socket, mens, datos) {
        socket.broadcast.emit(mens, datos);
    }
    
    this.enviarGlobal = function(io, mens, datos) {
        io.emit(mens, datos);
    }
    
    this.enviarARoom = function(io, roomId, mensaje, datos) {
        io.to(roomId).emit(mensaje, datos);
    }
}

module.exports.ServidorWS = WSServer;