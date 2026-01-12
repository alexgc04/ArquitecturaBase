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