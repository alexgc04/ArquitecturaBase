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

            socket.on("unirAPartida", function(datos){
                let codigo = sistema.unirAPartida(datos.email, datos.codigo);
                if (codigo != -1){
                    socket.join(codigo);
                    srv.enviarAlRemitente(socket, "unidoAPartida", {"codigo": codigo});
                    
                    // Notificar al creador (y otros) que alguien se unió
                    socket.to(codigo).emit("nuevoJugador", {"codigo": codigo, "email": datos.email});

                    let lista = sistema.obtenerPartidasDisponibles();
                    srv.enviarATodosMenosRemitente(socket, "listaPartidas", lista);
                    srv.enviarAlRemitente(socket, "listaPartidas", lista);
                }
                else{
                    srv.enviarAlRemitente(socket, "falloUnirAPartida", {"mensaje": "No se pudo unir a la partida"});
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