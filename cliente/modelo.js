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
        if (this.usuarios.hasOwnProperty(nick)){
            return true; 
        }
        return false;
    }

    this.numeroUsuarios = function() {
        return Object.keys(this.usuarios).length;
    }

    this.eliminarUsuario=function(nick){ 
        delete this.usuarios[nick]; 
    }
} 

function Usuario(nick){
    this.nick=nick; 
}




