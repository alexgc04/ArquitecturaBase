function ClienteRest(){
    this.agregarUsuario=function(nick){
        var cli=this;
        $.getJSON("/agregarUsuario/"+encodeURIComponent(nick),function(data){
            if (data.nick!=-1){
                console.log("Usuario "+nick+" ha sido registrado");
            }
            else{
                console.log("El nick ya está ocupado");
            }
        });
    }

    this.agregarUsuario2=function(nick){
        $.ajax({
        type:'GET',
        url:'/agregarUsuario/'+encodeURIComponent(nick),
        success:function(data){
            if (data.nick!=-1){
            console.log("Usuario "+nick+" ha sido registrado")
            }
            else{
            console.log("El nick ya está ocupado");
            }
        },
        error:function(xhr, textStatus, errorThrown){
            console.log("Status: " + textStatus);
            console.log("Error: " + errorThrown);
        },
        contentType:'application/json'
        });
    }

    // 5.2 Resto de peticiones
    this.obtenerUsuarios=function(){
        $.getJSON('/obtenerUsuarios', function(data){
            console.log('obtenerUsuarios ->', data);
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            console.log('obtenerUsuarios falló:', textStatus, errorThrown);
        });
    }

    this.numeroUsuarios=function(){
        $.getJSON('/numeroUsuarios', function(data){
            console.log('numeroUsuarios ->', data);
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            console.log('numeroUsuarios falló:', textStatus, errorThrown);
        });
    }

    this.usuarioActivo=function(nick){
        $.getJSON('/usuarioActivo/'+encodeURIComponent(nick), function(data){
            console.log('usuarioActivo("'+nick+'") ->', data);
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            console.log('usuarioActivo falló:', textStatus, errorThrown);
        });
    }

    this.eliminarUsuario=function(nick){
        $.getJSON('/eliminarUsuario/'+encodeURIComponent(nick), function(data){
            console.log('eliminarUsuario("'+nick+'") ->', data);
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            console.log('eliminarUsuario falló:', textStatus, errorThrown);
        });
    }
}

// Hacer disponible en la consola del navegador
window.ClienteRest = ClienteRest;
console.log('ClienteRest cargado: usa "rest = new ClienteRest()"');

