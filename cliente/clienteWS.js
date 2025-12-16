function ClienteWS(){
    this.socket=undefined;
    this.email=undefined;
    this.codigo=undefined;

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
                $('#opsPanel').remove();
                cw.mostrarPanelOps();
                cw.mostrarMensaje("Te has unido exitosamente a la partida con código: " + datos.codigo);
            }
        });
        this.socket.on("nuevoJugador", function(datos){
            if (cw) {
                cw.mostrarPanelOps();
                cw.mostrarMensaje("¡El jugador " + datos.email + " se ha unido a tu partida!");
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
                $('#opsPanel').remove();
                cw.mostrarPanelOps();
                cw.mostrarMensaje("Has abandonado la partida " + datos.codigo);
            }
        });
        this.socket.on("usuarioSalio", function(datos){
            if (cw) {
                cw.mostrarMensaje("El usuario " + datos.email + " ha abandonado la partida.");
                // Opcional: Volver a mostrar esperando rival si se queda solo
                // cw.mostrarEsperandoRival(); 
            }
        });
        this.socket.on("partidaEliminada", function(datos){
            if (cw) {
                if (cli.codigo === datos.codigo) {
                    cli.codigo = undefined;
                    cli.esHost = false;
                }
                $('#opsPanel').remove();
                cw.mostrarPanelOps();
                cw.mostrarMensaje("La partida " + datos.codigo + " ha sido eliminada por el anfitrión.");
            }
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

    this.ini();
}