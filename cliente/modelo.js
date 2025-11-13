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
                });
                correo.enviarEmail(obj.email,key,"Confirmar cuenta");
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

    this.loginUsuario=function(obj,callback){
        let modelo=this;
        this.cad.buscarUsuario({"email":obj.email,"confirmada":true},function(usr){
            if (!usr)
            {
                callback({"email":-1});
                return -1;
            }
            else{
                bcrypt.compare(obj.password, usr.password, function(err,result) {
                if (result) {
                callback(usr);
                modelo.agregarUsuario(usr);
                }
                else{
                callback({"email":-1});
                }
                });
            }
        });
    }

} 

function Usuario(nick){
    this.nick=nick; 
}




