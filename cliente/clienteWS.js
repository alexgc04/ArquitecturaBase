function ClienteWS(){
    this.socket=undefined;
    this.email=undefined;
    this.codigo=undefined;
    this.esHost=false;

    this.ini=function(){
        if (typeof io !== 'undefined') {
            this.socket=io.connect();
            this.servidorWS();
        } else {
            console.log("Error: io no definido (socket.io no cargado)");
        }
    }

    this.servidorWS=function(){
        let cli=this;
        
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
        
        // Rival listo para jugar
        this.socket.on("rivalListo", function(datos){
            console.log("Rival listo:", datos);
            if (cw) cw.rivalListo(datos);
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
        // EVENTOS SHOOTER MULTIJUGADOR
        // ==========================================
        
        // Partida shooter creada (con mapa)
        this.socket.on("partidaShooterCreada", function(datos){
            console.log("Partida shooter creada:", datos);
            cli.codigo = datos.codigo;
            cli.esHost = true;
            if (cw) cw.mostrarEsperandoRivalShooter(datos.mapaId);
        });
        
        // Un jugador se unió a la partida shooter
        this.socket.on("jugadorUnidoShooter", function(datos){
            console.log("Jugador unido a shooter:", datos);
            if (cw) {
                // Ambos jugadores van a selección de personaje
                cw.mostrarSeleccionPersonajeMulti(datos.mapaId, cli.esHost, datos.rivalNick);
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
    // FUNCIONES DE JUEGO MULTIJUGADOR
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
    
    this.crearPartidaShooter=function(mapaId){
        // Asegurarse de tener el email
        if (!this.email) {
            this.email = $.cookie('nick');
        }
        console.log("Creando partida shooter con mapa:", mapaId, "email:", this.email);
        this.socket.emit("crearPartidaShooter", {
            "email": this.email,
            "mapaId": mapaId
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

    this.ini();
}