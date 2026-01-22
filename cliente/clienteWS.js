function ClienteWS(){
    this.socket = undefined;
    this.email = undefined;
    this.roomId = undefined;      // Nuevo sistema de Rooms
    this.codigo = undefined;       // Legacy
    this.esHost = false;
    this.gameMode = undefined;     // 'tankStars', 'spaceInvaders', 'batallaNaval'
    this.dominio = undefined;      // 'tierra', 'aire', 'mar'

    this.ini = function(){
        if (typeof io !== 'undefined') {
            this.socket = io.connect();
            this.servidorWS();
            
            // Registrar conexión al conectar
            this.socket.on('connect', () => {
                if (this.email) {
                    this.socket.emit("registrarConexion", { email: this.email });
                }
            });
        } else {
            console.log("Error: io no definido (socket.io no cargado)");
        }
    }

    this.setEmail = function(email) {
        this.email = email;
        if (this.socket && this.socket.connected) {
            this.socket.emit("registrarConexion", { email: email });
        }
    }

    this.servidorWS = function(){
        let cli = this;
        
        // ==========================================
        // SISTEMA DE ROOMS - EVENTOS NUEVOS
        // ==========================================
        
        // Room creada exitosamente
        this.socket.on("roomCreada", function(datos){
            console.log("🏠 Room creada:", datos);
            cli.roomId = datos.roomId;
            cli.gameMode = datos.gameMode;
            cli.dominio = datos.dominio;
            cli.esHost = true;
            if (cw) cw.onRoomCreada(datos);
        });
        
        // Error al crear/unir room
        this.socket.on("errorRoom", function(datos){
            console.error("❌ Error Room:", datos.mensaje);
            if (cw) cw.mostrarMensaje(datos.mensaje);
        });
        
        // Unido a room exitosamente
        this.socket.on("unidoARoom", function(datos){
            console.log("👥 Unido a room:", datos);
            cli.roomId = datos.roomId;
            cli.gameMode = datos.gameMode;
            cli.dominio = datos.dominio;
            cli.esHost = false;
            if (cw) cw.onUnidoARoom(datos);
        });
        
        // Otro jugador se unió a mi room
        this.socket.on("jugadorUnido", function(datos){
            console.log("👤 Jugador unido:", datos);
            if (cw) cw.onJugadorUnido(datos);
        });
        
        // Jugador salió de la room
        this.socket.on("jugadorSalio", function(datos){
            console.log("👋 Jugador salió:", datos.email);
            if (cw) cw.onJugadorSalio(datos);
        });
        
        // Salió de la room
        this.socket.on("salioDeRoom", function(datos){
            cli.roomId = undefined;
            cli.gameMode = undefined;
            cli.dominio = undefined;
            cli.esHost = false;
            if (cw) cw.mostrarPanelMultijugador();
        });
        
        // Room eliminada
        this.socket.on("roomEliminada", function(datos){
            if (cli.roomId === datos.roomId) {
                cli.roomId = undefined;
                cli.gameMode = undefined;
                cli.dominio = undefined;
            }
            if (cw) cw.mostrarMensaje("La sala ha sido eliminada");
        });
        
        // Lista de rooms disponibles
        this.socket.on("listaRooms", function(lista){
            console.log("📋 Lista rooms:", lista);
            if (cw) cw.mostrarListaRooms(lista);
        });
        
        // ==========================================
        // EVENTOS DE SELECCIÓN - TODOS LOS MODOS
        // ==========================================
        
        // Rival seleccionó personaje/tropa
        this.socket.on("rivalSeleccionoPersonaje", function(datos){
            console.log("🎮 Rival seleccionó:", datos);
            if (cw) cw.onRivalSeleccionoPersonaje(datos);
        });
        
        // Rival está listo
        this.socket.on("rivalListo", function(datos){
            console.log("✅ Rival listo");
            if (cw) cw.onRivalListo(datos);
        });
        
        // Iniciar partida (ambos listos)
        this.socket.on("iniciarPartida", function(datos){
            console.log("🚀 Iniciar partida:", datos);
            if (cw) cw.onIniciarPartida(datos);
        });
        
        // ==========================================
        // EVENTOS TANK STARS (TIERRA)
        // ==========================================
        
        this.socket.on("rivalDisparo", function(datos){
            console.log("💥 Rival disparó (Tank):", datos);
            if (cw) cw.recibirDisparoTank(datos);
        });
        
        this.socket.on("resultadoDisparo", function(datos){
            console.log("🎯 Resultado disparo:", datos);
            if (cw) cw.recibirResultadoDisparoTank(datos);
        });
        
        this.socket.on("nuevoTurno", function(datos){
            console.log("🔄 Nuevo turno:", datos);
            if (cw) cw.onNuevoTurnoTank(datos);
        });
        
        // Movimiento del rival Tank
        this.socket.on("rivalMovimiento", function(datos){
            console.log("🚗 Movimiento rival:", datos);
            if (cw && cw.recibirMovimientoTank) {
                cw.recibirMovimientoTank(datos);
            }
        });
        
        // Apuntado del rival Tank (sincronización en tiempo real)
        this.socket.on("rivalApuntado", function(datos){
            console.log("🎯 Apuntado rival:", datos);
            if (cw && cw.recibirApuntadoTank) {
                cw.recibirApuntadoTank(datos);
            }
        });
        
        // Superpoder del rival Tank
        this.socket.on("rivalSuperpoder", function(datos){
            console.log("⚡ Superpoder rival:", datos);
            if (cw && cw.recibirSuperpoderTank) {
                cw.recibirSuperpoderTank(datos);
            }
        });
        
        // Vida sincronizada Tank
        this.socket.on("sincronizarVida", function(datos){
            console.log("❤️ Sincronizar vida:", datos);
            if (cw && cw.sincronizarVidaTank) {
                cw.sincronizarVidaTank(datos);
            }
        });
        
        // ==========================================
        // EVENTOS SPACE INVADERS / DOGFIGHT (AIRE)
        // ==========================================
        
        this.socket.on("rivalNavePos", function(datos){
            if (cw && cw.onRivalNavePos) {
                cw.onRivalNavePos(datos);
            }
        });
        
        // Impacto aéreo (dogfight)
        this.socket.on("recibirImpactoAereo", function(datos){
            console.log("💥 Impacto aéreo recibido:", datos);
            if (cw && cw.onRecibirImpactoAereo) {
                cw.onRecibirImpactoAereo(datos);
            }
        });
        
        // Powerup sincronizado
        this.socket.on("recibirPowerup", function(datos){
            if (cw && cw.onRecibirPowerup) {
                cw.onRecibirPowerup(datos);
            }
        });
        
        this.socket.on("enemigoEliminado", function(datos){
            if (cw && cw.onEnemigoEliminado) {
                cw.onEnemigoEliminado(datos);
            }
        });
        
        this.socket.on("sincronizarOleada", function(datos){
            if (cw && cw.onSincronizarOleada) {
                cw.onSincronizarOleada(datos);
            }
        });
        
        // Fin de partida Space
        this.socket.on("finSpaceInvaders", function(datos){
            console.log("🏁 Fin Space Invaders:", datos);
            if (cw && cw.onFinSpaceInvaders) {
                cw.onFinSpaceInvaders(datos);
            }
        });
        
        // ==========================================
        // EVENTOS BATALLA NAVAL (MAR)
        // ==========================================
        
        this.socket.on("rivalFlotaLista", function(datos){
            console.log("⚓ Rival flota lista:", datos);
            if (cw && cw.onRivalFlotaLista) {
                cw.onRivalFlotaLista(datos);
            }
        });
        
        this.socket.on("iniciarCombateNaval", function(datos){
            console.log("⚔️ Iniciar combate naval:", datos);
            if (cw && cw.onIniciarCombateNaval) {
                cw.onIniciarCombateNaval(datos);
            }
        });
        
        this.socket.on("recibirDisparo", function(datos){
            console.log("💦 Recibir disparo naval:", datos);
            if (cw && cw.onRecibirDisparoNaval) {
                cw.onRecibirDisparoNaval(datos);
            }
        });
        
        this.socket.on("resultadoNaval", function(datos){
            console.log("🎯 Resultado naval:", datos);
            if (cw && cw.onResultadoNavalMulti) {
                cw.onResultadoNavalMulti(datos);
            }
        });
        
        // ==========================================
        // FINALIZACIÓN Y RESULTADOS
        // ==========================================
        
        this.socket.on("resultadosPartida", function(datos){
            console.log("🏆 Resultados partida:", datos);
            if (cw) cw.mostrarResultadosPartida(datos);
        });
        
        this.socket.on("jugadorDesconectado", function(datos){
            console.log("❌ Jugador desconectado:", datos.email);
            if (cw) cw.onJugadorDesconectado(datos);
        });
        
        this.socket.on("victoriaAbandonoRival", function(datos){
            console.log("🏆 Victoria por abandono:", datos);
            if (cw) cw.onVictoriaAbandonoRival(datos);
        });
        
        // Chat en partida
        this.socket.on("nuevoMensaje", function(datos){
            if (cw && cw.mostrarMensajeChat) {
                cw.mostrarMensajeChat(datos);
            }
        });
        
        // ==========================================
        // EVENTOS LEGACY (compatibilidad)
        // ==========================================
        
        this.socket.on("partidaCreada", function(datos){
            console.log("Partida creada con código: " + datos.codigo);
            cli.codigo = datos.codigo;
            cli.esHost = true;
            if (cw) cw.mostrarEsperandoRival();
        });
        
        this.socket.on("unidoAPartida", function(datos){
            console.log("Unido a partida: " + datos.codigo);
            cli.codigo = datos.codigo;
            cli.esHost = false;
            if (cw) {
                cw.unidoAPartida(datos);
            }
        });
        
        this.socket.on("nuevoJugador", function(datos){
            if (cw) {
                cw.jugadorUnido(datos);
            }
        });
        
        this.socket.on("falloCrearPartida", function(datos){
            console.log(datos.mensaje);
            if (cw) cw.mostrarModal(datos.mensaje);
        });
        
        this.socket.on("falloUnirAPartida", function(datos){
            console.log(datos.mensaje);
            if (cw) cw.mostrarModal(datos.mensaje);
        });
        
        this.socket.on("listaPartidas", function(lista){
            if (cw) cw.mostrarListaPartidas(lista);
        });
        
        this.socket.on("partidaAbandonada", function(datos){
            if (cw) {
                cli.codigo = undefined;
                cli.esHost = false;
                cw.mostrarMensaje("Has abandonado la partida " + datos.codigo);
                cw.mostrarPanelMultijugador();
            }
        });
        
        this.socket.on("usuarioSalio", function(datos){
            if (cw) {
                cw.mostrarMensaje("El usuario " + datos.email + " ha abandonado la partida.");
                cw.rivalAbandono();
            }
        });
        
        this.socket.on("partidaEliminada", function(datos){
            if (cw) {
                if (cli.codigo === datos.codigo) {
                    cli.codigo = undefined;
                    cli.esHost = false;
                }
                cw.mostrarMensaje("La partida " + datos.codigo + " ha sido eliminada por el anfitrión.");
                cw.mostrarPanelMultijugador();
            }
        });
        
        // ==========================================
        // EVENTOS DE JUEGO MULTIJUGADOR
        // ==========================================
        
        // Recibir base defensiva del rival
        this.socket.on("baseRival", function(datos){
            console.log("Base del rival recibida:", datos);
            if (cw) cw.recibirBaseRival(datos);
        });
        
        // Recibir ataque del rival
        this.socket.on("ataqueRecibido", function(datos){
            console.log("Ataque recibido:", datos);
            if (cw) cw.recibirAtaque(datos);
        });
        
        // Es mi turno
        this.socket.on("turnoRival", function(datos){
            console.log("Turno del rival terminado:", datos);
            if (cw) cw.miTurno(datos);
        });
        
        // Actualización de vida
        this.socket.on("vidaActualizada", function(datos){
            console.log("Vida actualizada:", datos);
            if (cw) cw.actualizarVidas(datos);
        });
        
        // Partida terminada
        this.socket.on("partidaTerminada", function(datos){
            console.log("Partida terminada:", datos);
            if (cw) cw.partidaTerminadaMulti(datos);
        });
        
        // Mensaje recibido
        this.socket.on("mensajeRecibido", function(datos){
            if (cw) cw.mostrarMensajeChat(datos);
        });
        
        // ==========================================
        // EVENTOS SHOOTER MULTIJUGADOR (Legacy)
        // ==========================================
        
        // Partida shooter creada (con mapa)
        this.socket.on("partidaShooterCreada", function(datos){
            console.log("Partida shooter creada:", datos);
            cli.codigo = datos.codigo;
            cli.esHost = true;
            if (cw) cw.mostrarEsperandoRivalShooter(datos.mapaId, datos.dominio);
        });
        
        // Un jugador se unió a la partida shooter - AMBOS reciben este evento
        this.socket.on("jugadorUnidoShooter", function(datos){
            console.log("📥 jugadorUnidoShooter recibido:", datos);
            console.log("📥 esHost:", cli.esHost, "rivalNick:", datos.rivalNick);
            if (cw) {
                // Ambos jugadores van a selección de personaje
                console.log("📥 Llamando a mostrarSeleccionPersonajeMulti...");
                cw.mostrarSeleccionPersonajeMulti(datos.mapaId, cli.esHost, datos.rivalNick, datos.dominio);
            } else {
                console.error("❌ cw no existe cuando llegó jugadorUnidoShooter");
            }
        });
        
        // Rival está listo (seleccionó su personaje)
        this.socket.on("rivalListoShooter", function(datos){
            console.log("Rival listo shooter:", datos);
            if (cw) cw.rivalListoShooter(datos.tropaId);
        });
        
        // Sincronización de posición del rival en tiempo real
        this.socket.on("posicionRival", function(datos){
            if (cw) {
                cw.actualizarPosicionRival(datos);
            }
        });
        
        // Disparo del rival
        this.socket.on("disparoRival", function(datos){
            if (cw) {
                cw.recibirDisparoRival(datos);
            }
        });
        
        // Daño recibido
        this.socket.on("danioRecibido", function(datos){
            if (cw) {
                cw.recibirDanioMulti(datos);
            }
        });
        
        // Ultimate del rival
        this.socket.on("ultimateRival", function(datos){
            if (cw) {
                cw.recibirUltimateRival(datos);
            }
        });
        
        // Partida shooter terminada
        this.socket.on("shooterTerminado", function(datos){
            if (cw) cw.shooterMultiTerminado(datos);
        });
        
        // ==========================================
        // SINCRONIZACIÓN DE TURNOS MULTIJUGADOR
        // ==========================================
        
        // Rival disparó
        this.socket.on("rivalDisparo", function(datos){
            console.log("📥 Rival disparó:", datos);
            if (cw) cw.recibirDisparoTurnoRival(datos);
        });
        
        // Rival se movió
        this.socket.on("rivalMovimiento", function(datos){
            if (cw) cw.recibirMovimientoRival(datos);
        });
        
        // Resultado del disparo del rival
        this.socket.on("resultadoDisparoRival", function(datos){
            if (cw) cw.recibirResultadoDisparo(datos);
        });
        
        // Turno recibido (es mi turno ahora)
        this.socket.on("turnoRecibido", function(datos){
            if (cw) cw.recibirCambioTurno(datos);
        });
        
        // Rival listo para empezar
        this.socket.on("rivalListoEmpezar", function(datos){
            if (cw) cw.rivalListoParaEmpezar(datos);
        });
    }

    this.crearPartida=function(){
        this.socket.emit("crearPartida", {"email": this.email});
    }

    this.unirAPartida=function(codigo){
        this.socket.emit("unirAPartida", {"email": this.email, "codigo": codigo});
    }

    this.salirPartida=function(){
        this.socket.emit("salirPartida", {"codigo": this.codigo, "email": this.email});
    }

    this.eliminarPartida=function(){
        this.socket.emit("eliminarPartida", {"codigo": this.codigo, "email": this.email});
    }
    
    // ==========================================
    // SISTEMA DE ROOMS - FUNCIONES NUEVAS
    // ==========================================
    
    // Crear room para cualquier modo de juego
    this.crearRoom = function(gameMode, dominio, configuracion) {
        if (!this.email) {
            this.email = $.cookie('nick');
        }
        console.log("🏠 Creando room:", { gameMode, dominio, email: this.email });
        this.socket.emit("crearRoom", {
            email: this.email,
            gameMode: gameMode,
            dominio: dominio,
            configuracion: configuracion
        });
    }
    
    // Unirse a room existente
    this.unirRoom = function(roomId) {
        if (!this.email) {
            this.email = $.cookie('nick');
        }
        console.log("👥 Uniéndose a room:", roomId);
        this.socket.emit("unirRoom", {
            email: this.email,
            roomId: roomId
        });
    }
    
    // Salir de room
    this.salirRoom = function() {
        if (this.roomId) {
            this.socket.emit("salirRoom", {
                email: this.email,
                roomId: this.roomId
            });
        }
    }
    
    // Obtener lista de rooms
    this.obtenerRooms = function(gameMode, dominio) {
        this.socket.emit("obtenerRooms", {
            gameMode: gameMode,
            dominio: dominio
        });
    }
    
    // Seleccionar personaje/tropa
    this.seleccionarPersonaje = function(tropaId, tropaEmoji, tropaNombre) {
        if (this.roomId) {
            this.socket.emit("seleccionPersonaje", {
                roomId: this.roomId,
                email: this.email,
                tropaId: tropaId,
                tropaEmoji: tropaEmoji,
                tropaNombre: tropaNombre
            });
        }
    }
    
    // Marcar como listo
    this.marcarListo = function() {
        if (this.roomId) {
            this.socket.emit("jugadorListo", {
                roomId: this.roomId,
                email: this.email
            });
        }
    }
    
    // ==========================================
    // FUNCIONES TANK STARS (TIERRA)
    // ==========================================
    
    this.enviarDisparoTank = function(angulo, potencia, armaId) {
        if (this.roomId) {
            this.socket.emit("tankDisparo", {
                roomId: this.roomId,
                email: this.email,
                angulo: angulo,
                potencia: potencia,
                armaId: armaId
            });
        }
    }
    
    this.enviarResultadoTank = function(impacto, danio, vidaRestante, posicionImpacto) {
        if (this.roomId) {
            this.socket.emit("tankResultado", {
                roomId: this.roomId,
                impacto: impacto,
                danio: danio,
                vidaRestante: vidaRestante,
                posicionImpacto: posicionImpacto
            });
        }
    }
    
    this.cambiarTurnoTank = function(siguienteTurno, viento, turnoNumero) {
        if (this.roomId) {
            this.socket.emit("tankCambioTurno", {
                roomId: this.roomId,
                siguienteTurno: siguienteTurno,
                viento: viento,
                turnoNumero: turnoNumero
            });
        }
    }
    
    // Enviar movimiento de tanque
    this.enviarMovimientoTank = function(nuevaX, nuevaY, combustibleRestante) {
        if (this.roomId) {
            this.socket.emit("tankMovimiento", {
                roomId: this.roomId,
                email: this.email,
                nuevaX: nuevaX,
                nuevaY: nuevaY,
                combustibleRestante: combustibleRestante
            });
        }
    }
    
    // Sincronizar ángulo de apuntado en tiempo real
    this.enviarApuntadoTank = function(angulo, potencia) {
        if (this.roomId) {
            this.socket.emit("tankApuntado", {
                roomId: this.roomId,
                email: this.email,
                angulo: angulo,
                potencia: potencia
            });
        }
    }
    
    // Enviar uso de superpoder Tank
    this.enviarSuperpoderTank = function(superpoderTipo, objetivo) {
        if (this.roomId) {
            this.socket.emit("tankSuperpoder", {
                roomId: this.roomId,
                email: this.email,
                superpoderTipo: superpoderTipo,
                objetivo: objetivo
            });
        }
    }
    
    // Enviar vida actualizada Tank
    this.enviarVidaTank = function(vidaJugador, vidaEnemigo) {
        if (this.roomId) {
            this.socket.emit("tankVida", {
                roomId: this.roomId,
                email: this.email,
                vidaJugador: vidaJugador,
                vidaEnemigo: vidaEnemigo
            });
        }
    }
    
    // Abandonar partida
    this.abandonarPartida = function() {
        if (this.roomId) {
            this.socket.emit("abandonarPartida", {
                roomId: this.roomId,
                email: this.email
            });
            this.roomId = null;
        }
    }
    
    // Emit genérico
    this.emit = function(evento, datos) {
        if (this.socket) {
            this.socket.emit(evento, datos);
        }
    }
    
    // ==========================================
    // FUNCIONES SPACE INVADERS / DOGFIGHT (AIRE)
    // ==========================================
    
    this.enviarPosicionNave = function(x, y, disparando) {
        if (this.roomId) {
            this.socket.emit("spaceNavePos", {
                roomId: this.roomId,
                email: this.email,
                x: x,
                y: y,
                disparando: disparando
            });
        }
    }
    
    this.enviarImpactoAereo = function(daño) {
        if (this.roomId) {
            this.socket.emit("spaceImpacto", {
                roomId: this.roomId,
                email: this.email,
                daño: daño
            });
        }
    }
    
    this.enviarPowerup = function(powerup) {
        if (this.roomId) {
            this.socket.emit("spacePowerup", {
                roomId: this.roomId,
                powerup: powerup
            });
        }
    }
    
    this.enviarEnemigoEliminado = function(enemigoId, puntos) {
        if (this.roomId) {
            this.socket.emit("spaceEnemigoEliminado", {
                roomId: this.roomId,
                enemigoId: enemigoId,
                puntos: puntos
            });
        }
    }
    
    this.enviarNuevaOleada = function(oleada, enemigos) {
        if (this.roomId) {
            this.socket.emit("spaceNuevaOleada", {
                roomId: this.roomId,
                oleada: oleada,
                enemigos: enemigos
            });
        }
    }
    
    // ==========================================
    // FUNCIONES BATALLA NAVAL (MAR)
    // ==========================================
    
    this.enviarFlota = function(barcos) {
        if (this.roomId) {
            this.socket.emit("navalEnviarFlota", {
                roomId: this.roomId,
                email: this.email,
                barcos: barcos
            });
        }
    }
    
    this.enviarDisparoNaval = function(x, y) {
        if (this.roomId) {
            this.socket.emit("navalDisparo", {
                roomId: this.roomId,
                email: this.email,
                x: x,
                y: y
            });
        }
    }
    
    this.enviarResultadoNaval = function(x, y, impacto, hundido, nombreBarco) {
        if (this.roomId) {
            this.socket.emit("navalResultado", {
                roomId: this.roomId,
                x: x,
                y: y,
                impacto: impacto,
                hundido: hundido,
                nombreBarco: nombreBarco
            });
        }
    }
    
    // ==========================================
    // FINALIZACIÓN DE PARTIDA
    // ==========================================
    
    this.finalizarPartida = function(ganadorEmail, perdedorEmail, esEmpate, estadisticas) {
        if (this.roomId) {
            this.socket.emit("finalizarPartida", {
                roomId: this.roomId,
                ganadorEmail: ganadorEmail,
                perdedorEmail: perdedorEmail,
                esEmpate: esEmpate || false,
                estadisticas: estadisticas || {}
            });
        }
    }
    
    // Chat en partida
    this.enviarMensajeRoom = function(mensaje, tipo) {
        if (this.roomId) {
            this.socket.emit("mensajeChat", {
                roomId: this.roomId,
                email: this.email,
                mensaje: mensaje,
                tipo: tipo || 'texto'
            });
        }
    }
    
    // ==========================================
    // FUNCIONES DE JUEGO MULTIJUGADOR (Legacy)
    // ==========================================
    
    this.enviarBase=function(defensas, estructuras){
        this.socket.emit("enviarBase", {
            "codigo": this.codigo,
            "email": this.email,
            "defensas": defensas,
            "estructuras": estructuras
        });
    }
    
    this.listoParaJugar=function(dominio){
        this.socket.emit("listoParaJugar", {
            "codigo": this.codigo,
            "email": this.email,
            "dominio": dominio
        });
    }
    
    this.realizarAtaque=function(unidades, danio){
        this.socket.emit("realizarAtaque", {
            "codigo": this.codigo,
            "email": this.email,
            "unidades": unidades,
            "danio": danio
        });
    }
    
    this.finTurno=function(vidaJugador, vidaEnemigo){
        this.socket.emit("finTurno", {
            "codigo": this.codigo,
            "email": this.email,
            "vidaJugador": vidaJugador,
            "vidaEnemigo": vidaEnemigo
        });
    }
    
    this.actualizarVida=function(vidaJugador, vidaEnemigo){
        this.socket.emit("actualizarVida", {
            "codigo": this.codigo,
            "vidaJugador": vidaJugador,
            "vidaEnemigo": vidaEnemigo
        });
    }
    
    this.finPartida=function(ganador){
        this.socket.emit("finPartida", {
            "codigo": this.codigo,
            "email": this.email,
            "ganador": ganador
        });
    }
    
    this.enviarMensaje=function(mensaje){
        this.socket.emit("mensajePartida", {
            "codigo": this.codigo,
            "email": this.email,
            "mensaje": mensaje
        });
    }
    
    // ==========================================
    // FUNCIONES SHOOTER MULTIJUGADOR
    // ==========================================
    
    this.crearPartidaShooter=function(mapaId, dominio){
        // Asegurarse de tener el email
        if (!this.email) {
            this.email = $.cookie('nick');
        }
        dominio = dominio || 'tierra';
        console.log("Creando partida shooter con mapa:", mapaId, "dominio:", dominio, "email:", this.email);
        this.socket.emit("crearPartidaShooter", {
            "email": this.email,
            "mapaId": mapaId,
            "dominio": dominio
        });
    }
    
    this.enviarPosicion=function(x, y, direccion){
        this.socket.emit("posicionJugador", {
            "codigo": this.codigo,
            "x": x,
            "y": y,
            "direccion": direccion
        });
    }
    
    this.enviarDisparo=function(armaId, x, y, direccion){
        this.socket.emit("disparo", {
            "codigo": this.codigo,
            "armaId": armaId,
            "x": x,
            "y": y,
            "direccion": direccion
        });
    }
    
    this.enviarDanio=function(cantidad){
        this.socket.emit("danioRival", {
            "codigo": this.codigo,
            "cantidad": cantidad
        });
    }
    
    this.enviarUltimate=function(ultimateId){
        this.socket.emit("ultimate", {
            "codigo": this.codigo,
            "ultimateId": ultimateId
        });
    }
    
    this.finShooter=function(ganador){
        this.socket.emit("finShooter", {
            "codigo": this.codigo,
            "email": this.email,
            "ganador": ganador
        });
    }
    
    // ==========================================
    // FUNCIONES DE SINCRONIZACIÓN DE TURNOS
    // ==========================================
    
    this.enviarDisparoTurno=function(angulo, potencia, armaId, posX){
        console.log("📤 Enviando disparo turno:", {angulo, potencia, armaId, posX});
        this.socket.emit("disparoTurno", {
            "codigo": this.codigo,
            "angulo": angulo,
            "potencia": potencia,
            "armaId": armaId,
            "posX": posX
        });
    }
    
    this.enviarMovimientoTurno=function(posX){
        this.socket.emit("movimientoTurno", {
            "codigo": this.codigo,
            "posX": posX
        });
    }
    
    this.enviarResultadoDisparo=function(impacto, danio, vidaRestante){
        this.socket.emit("resultadoDisparo", {
            "codigo": this.codigo,
            "impacto": impacto,
            "danio": danio,
            "vidaRestante": vidaRestante
        });
    }
    
    this.enviarCambioTurno=function(turnoNumero, viento){
        this.socket.emit("cambioTurno", {
            "codigo": this.codigo,
            "turnoNumero": turnoNumero,
            "viento": viento
        });
    }
    
    this.enviarListoParaEmpezar=function(){
        this.socket.emit("listoParaEmpezar", {
            "codigo": this.codigo,
            "email": this.email
        });
    }

    this.ini();
}