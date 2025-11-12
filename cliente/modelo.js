function Sistema(){ 
    this.usuarios={}; 
    this.agregarUsuario=function(nick){ 
        this.usuarios[nick]=new Usuario(nick); 
    }
    // Devuelve el diccionario de usuarios
    this.obtenerUsuarios=function(){ 
        return this.usuarios; 
    }

    // Devuelve true si existe un usuario con el nick indicado, false en caso contrario
    this.usuarioActivo=function(nick){
        if(this.usuarios[nick]){
            return true;
        }
        return false;
    }

    this.numeroUsuarios = function() {
        return Object.keys(this.usuarios).length;
    }

    this.eliminarUsuario=function(nick){
        if(this.usuarios[nick]){
            delete this.usuarios[nick];
        }
    }

    this.registrarUsuario=function(obj,callback){ 
        let modelo=this; 
        if (!obj.nick){ 
            obj.nick=obj.email; 
        } this.cad.buscarUsuario(obj,function(usr){ 
            if (!usr){ 
                //el usuario no existe, luego lo puedo registrar 
                obj.key=Date.now().toString(); 
                obj.confirmada=false; 
                modelo.cad.insertarUsuario(obj,function(res){ 
                    callback(res); 
                }); 
                correo.enviarEmail(obj.email,obj.key,"Confirmar cuenta"); 
            } 
            else 
                { 
                    callback({"email":-1}); 
                } 
            }); 
    }

    this.confirmarUsuario=function(obj,callback){ 
        let modelo=this;
        this.cad.buscarUsuario({"email":obj.email,"confirmada":false,"key":obj.key}
            ,function(usr){ 
            if (usr){ 
                usr.confirmada=true; 
                modelo.cad.modificarUsuario(usr,function(res){ 
                    callback({"email":res.email}); 
                }); 
            } 
            else 
                { 
                    callback({"email":-1}); 
                }
        }); 
    }

} 

function Usuario(nick){
    this.nick=nick; 
}




