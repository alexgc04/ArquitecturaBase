function WSServer(){
    this.lanzarServidor=function(io, sistema){
        let srv = this;
        io.on('connection',function(socket){
            console.log("Capa WS activa");
            
            socket.on("crearPartida", function(datos){
                let codigo = sistema.crearPartida(datos.email);
                if (codigo != -1){
                    socket.join(codigo);
                    srv.enviarAlRemitente(socket, "partidaCreada", {"codigo": codigo});
                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                }
                else{
                    srv.enviarAlRemitente(socket, "falloCrearPartida", {"mensaje": "No se pudo crear la partida"});
                }
            });

            socket.on("salirPartida", function(datos){
                let res = sistema.salirPartida(datos.codigo, datos.email);
                if (res.codigo != -1){
                    if (res.eliminada) {
                        let lista = sistema.obtenerPartidasDisponibles();
                        srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                        srv.enviarAlRemitente(socket, "partidaAbandonada", {"codigo": res.codigo});
                    } else {
                        // Notificar al otro jugador que el rival se ha ido
                        socket.to(res.codigo).emit("usuarioSalio", { "codigo": res.codigo, "email": datos.email });
                        srv.enviarAlRemitente(socket, "partidaAbandonada", {"codigo": res.codigo});
                        // Actualizar lista por si la partida vuelve a estar disponible (hueco libre)
                        let lista = sistema.obtenerPartidasDisponibles();
                        srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    }
                }
            });

            socket.on("eliminarPartida", function(datos){
                let res = sistema.eliminarPartida(datos.codigo, datos.email);
                if (res.eliminada){
                    io.in(datos.codigo).emit("partidaEliminada", {"codigo": datos.codigo});
                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    srv.enviarAlRemitente(socket, "listaPartidas", lista);
                }
            });

            // ==========================================
            // EVENTOS DE JUEGO MULTIJUGADOR
            // ==========================================
            
            // Cuando un jugador envía el estado de su base defensiva
            socket.on("enviarBase", function(datos){
                socket.to(datos.codigo).emit("baseRival", {
                    defensas: datos.defensas,
                    estructuras: datos.estructuras,
                    email: datos.email
                });
            });
            
            // Cuando un jugador inicia el juego (ambos listos)
            socket.on("listoParaJugar", function(datos){
                socket.to(datos.codigo).emit("rivalListo", {
                    email: datos.email,
                    dominio: datos.dominio
                });
            });
            
            // Cuando un jugador realiza un ataque
            socket.on("realizarAtaque", function(datos){
                socket.to(datos.codigo).emit("ataqueRecibido", {
                    unidades: datos.unidades,
                    danio: datos.danio,
                    atacante: datos.email
                });
            });
            
            // Cuando cambia el turno
            socket.on("finTurno", function(datos){
                socket.to(datos.codigo).emit("turnoRival", {
                    email: datos.email,
                    vidaJugador: datos.vidaJugador,
                    vidaEnemigo: datos.vidaEnemigo
                });
            });
            
            // Cuando actualiza la vida de una base
            socket.on("actualizarVida", function(datos){
                socket.to(datos.codigo).emit("vidaActualizada", {
                    vidaJugador: datos.vidaJugador,
                    vidaEnemigo: datos.vidaEnemigo
                });
            });
            
            // Cuando termina la partida
            socket.on("finPartida", function(datos){
                socket.to(datos.codigo).emit("partidaTerminada", {
                    ganador: datos.ganador,
                    email: datos.email
                });
            });
            
            // Chat en partida
            socket.on("mensajePartida", function(datos){
                socket.to(datos.codigo).emit("mensajeRecibido", {
                    mensaje: datos.mensaje,
                    email: datos.email
                });
            });
            
            // ==========================================
            // EVENTOS SHOOTER MULTIJUGADOR
            // ==========================================
            
            // Crear partida shooter con mapa
            socket.on("crearPartidaShooter", function(datos){
                let codigo = sistema.crearPartida(datos.email);
                if (codigo != -1){
                    socket.join(codigo);
                    // Guardar info del mapa en la partida
                    let partida = sistema.obtenerPartida(codigo);
                    if (partida) {
                        partida.mapaId = datos.mapaId;
                        partida.tipoJuego = 'shooter';
                    }
                    srv.enviarAlRemitente(socket, "partidaShooterCreada", {
                        "codigo": codigo,
                        "mapaId": datos.mapaId
                    });
                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                } else {
                    srv.enviarAlRemitente(socket, "falloCrearPartida", {"mensaje": "No se pudo crear la partida"});
                }
            });
            
            // Cuando un jugador se une a partida shooter
            socket.on("unirAPartida", function(datos){
                let codigo = sistema.unirAPartida(datos.email, datos.codigo);
                if (codigo != -1){
                    socket.join(codigo);
                    let partida = sistema.obtenerPartida(datos.codigo);
                    
                    // Si es partida shooter, enviar a ambos a selección de personaje
                    if (partida && partida.tipoJuego === 'shooter') {
                        // Al que se unió
                        srv.enviarAlRemitente(socket, "jugadorUnidoShooter", {
                            "codigo": codigo,
                            "mapaId": partida.mapaId,
                            "rivalNick": partida.jugadores[0] // El host
                        });
                        
                        // Al host (creador)
                        socket.to(codigo).emit("jugadorUnidoShooter", {
                            "codigo": codigo,
                            "mapaId": partida.mapaId,
                            "rivalNick": datos.email
                        });
                    } else {
                        // Partida normal
                        srv.enviarAlRemitente(socket, "unidoAPartida", {
                            "codigo": codigo,
                            "creador": partida ? partida.jugadores[0] : "Rival"
                        });
                        
                        socket.to(codigo).emit("nuevoJugador", {"codigo": codigo, "email": datos.email});
                    }

                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    srv.enviarAlRemitente(socket, "listaPartidas", lista);
                }
                else{
                    srv.enviarAlRemitente(socket, "falloUnirAPartida", {"mensaje": "No se pudo unir a la partida"});
                }
            });
            
            // Jugador listo en shooter (seleccionó personaje)
            socket.on("jugadorListoShooter", function(datos){
                if (datos.codigo) {
                    socket.to(datos.codigo).emit("rivalListoShooter", {
                        tropaId: datos.tropaId
                    });
                }
            });
            
            // Posición del jugador (sincronización en tiempo real)
            socket.on("posicionJugador", function(datos){
                socket.to(datos.codigo).emit("posicionRival", {
                    x: datos.x,
                    y: datos.y,
                    direccion: datos.direccion
                });
            });
            
            // Disparo
            socket.on("disparo", function(datos){
                socket.to(datos.codigo).emit("disparoRival", {
                    armaId: datos.armaId,
                    x: datos.x,
                    y: datos.y,
                    direccion: datos.direccion
                });
            });
            
            // Daño al rival
            socket.on("danioRival", function(datos){
                socket.to(datos.codigo).emit("danioRecibido", {
                    cantidad: datos.cantidad
                });
            });
            
            // Ultimate
            socket.on("ultimate", function(datos){
                socket.to(datos.codigo).emit("ultimateRival", {
                    ultimateId: datos.ultimateId
                });
            });
            
            // Fin de partida shooter
            socket.on("finShooter", function(datos){
                socket.to(datos.codigo).emit("shooterTerminado", {
                    ganador: datos.ganador,
                    email: datos.email
                });
            });
        });
    }

    this.enviarAlRemitente=function(socket,mensaje,datos){
        socket.emit(mensaje,datos);
    }

    this.enviarATodosMenosRemitente=function(socket,mens,datos){
        socket.broadcast.emit(mens,datos);
    }

    this.enviarGlobal=function(io,mens,datos){
        io.emit(mens,datos);
    }
}
module.exports.ServidorWS=WSServer;